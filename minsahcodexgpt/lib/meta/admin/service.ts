import { createHash, randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { buildMetaAdminPayloadHash, getMetaAdminActionPolicy, type MetaAdminActionKey } from './policy';
import { redactMetaAdminData } from './redaction';
import { MetaAdminActionError } from './errors';

export { MetaAdminActionError } from './errors';

type MetaApprovalRecord = {
  id: string; actionKey: string; risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; resourceType: string; resourceId: string | null;
  payloadHash: string; payload: unknown; reason: string; status: string; requestedById: string; approvedById: string | null; rejectedById: string | null;
  requestedAt: Date; expiresAt: Date; reviewedAt: Date | null; executionStartedAt: Date | null; executedAt: Date | null; failureData: unknown;
  version: number; createdAt: Date; updatedAt: Date;
};
type MetaApprovalListRecord = MetaApprovalRecord & {
  requestedBy: { id: string; name: string };
  approvedBy: { id: string; name: string } | null;
  rejectedBy: { id: string; name: string } | null;
};
type MetaAuditRecord = { id: string };
type MetaAuditListRecord = {
  id: string; actorId: string; actionKey: string; risk: string; resourceType: string; resourceId: string | null; approvalId: string | null;
  outcome: string; beforeData: unknown; afterData: unknown; reason: string | null; requestId: string | null; traceId: string | null;
  ipHash: string | null; userAgentHash: string | null; errorData: unknown; createdAt: Date; actor: { id: string; name: string };
};
type MetaAdminDb = {
  metaAdminApproval: {
    create(args: unknown): Promise<MetaApprovalRecord>; findUnique(args: unknown): Promise<MetaApprovalRecord | null>;
    update(args: unknown): Promise<MetaApprovalRecord>; updateMany(args: unknown): Promise<{ count: number }>;
    findMany(args: unknown): Promise<MetaApprovalListRecord[]>;
  };
  metaAdminAudit: { create(args: unknown): Promise<MetaAuditRecord>; findMany(args: unknown): Promise<MetaAuditListRecord[]> };
};
const metaAdminDb = prisma as unknown as MetaAdminDb;

function hashOptional(value: string | null) {
  return value ? createHash('sha256').update(value).digest('hex') : null;
}

export function getMetaAdminRequestMetadata(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = request.headers.get('user-agent');
  return {
    requestId: request.headers.get('x-request-id') ?? randomUUID(),
    traceId: request.headers.get('x-fb-trace-id') ?? request.headers.get('traceparent'),
    ipHash: hashOptional(forwarded),
    userAgentHash: hashOptional(userAgent),
  };
}

export async function createMetaAdminApproval(input: {
  actionKey: MetaAdminActionKey;
  resourceType: string;
  resourceId?: string | null;
  payload: unknown;
  reason: string;
  requestedById: string;
  expiresInMinutes?: number;
}) {
  const policy = getMetaAdminActionPolicy(input.actionKey);
  if (!policy.requiresApproval) throw new MetaAdminActionError('This action does not require approval.', 409, 'APPROVAL_NOT_REQUIRED');
  const expiresInMinutes = Math.min(120, Math.max(5, input.expiresInMinutes ?? 30));
  const safePayload = redactMetaAdminData(input.payload);
  return metaAdminDb.metaAdminApproval.create({
    data: {
      actionKey: input.actionKey,
      risk: policy.risk,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      payloadHash: buildMetaAdminPayloadHash(input.payload),
      payload: safePayload as never,
      reason: input.reason,
      requestedById: input.requestedById,
      expiresAt: new Date(Date.now() + expiresInMinutes * 60_000),
    },
  });
}

export async function reviewMetaAdminApproval(input: {
  approvalId: string;
  reviewerId: string;
  decision: 'approve' | 'reject';
  reason?: string;
}) {
  const approval = await metaAdminDb.metaAdminApproval.findUnique({ where: { id: input.approvalId } });
  if (!approval) throw new MetaAdminActionError('Approval request not found.', 404, 'APPROVAL_NOT_FOUND');
  if (approval.status !== 'PENDING') throw new MetaAdminActionError('Approval request is no longer pending.', 409, 'APPROVAL_NOT_PENDING');
  if (approval.expiresAt <= new Date()) {
    await metaAdminDb.metaAdminApproval.update({ where: { id: approval.id }, data: { status: 'EXPIRED', version: { increment: 1 } } });
    throw new MetaAdminActionError('Approval request expired.', 409, 'APPROVAL_EXPIRED');
  }
  if (approval.requestedById === input.reviewerId && (approval.risk === 'HIGH' || approval.risk === 'CRITICAL')) {
    throw new MetaAdminActionError('High-risk actions require a different approver.', 403, 'SELF_APPROVAL_BLOCKED');
  }
  const approved = input.decision === 'approve';
  return metaAdminDb.metaAdminApproval.update({
    where: { id: approval.id },
    data: {
      status: approved ? 'APPROVED' : 'REJECTED',
      approvedById: approved ? input.reviewerId : null,
      rejectedById: approved ? null : input.reviewerId,
      reviewedAt: new Date(),
      failureData: approved ? undefined : ({ reason: input.reason ?? 'Rejected by reviewer' } as never),
      version: { increment: 1 },
    },
  });
}

async function claimApproval(input: {
  approvalId?: string | null;
  actionKey: MetaAdminActionKey;
  resourceType: string;
  resourceId?: string | null;
  payload: unknown;
}) {
  const policy = getMetaAdminActionPolicy(input.actionKey);
  if (!policy.requiresApproval) return null;
  if (!input.approvalId) throw new MetaAdminActionError('An approved approvalId is required.', 428, 'APPROVAL_REQUIRED');
  const approval = await metaAdminDb.metaAdminApproval.findUnique({ where: { id: input.approvalId } });
  if (!approval) throw new MetaAdminActionError('Approval request not found.', 404, 'APPROVAL_NOT_FOUND');
  if (approval.status !== 'APPROVED') throw new MetaAdminActionError(`Approval is ${approval.status}, not APPROVED.`, 409, 'APPROVAL_NOT_APPROVED');
  if (approval.expiresAt <= new Date()) {
    await metaAdminDb.metaAdminApproval.update({ where: { id: approval.id }, data: { status: 'EXPIRED', version: { increment: 1 } } });
    throw new MetaAdminActionError('Approval request expired.', 409, 'APPROVAL_EXPIRED');
  }
  const expectedHash = buildMetaAdminPayloadHash(input.payload);
  if (approval.actionKey !== input.actionKey || approval.resourceType !== input.resourceType || (approval.resourceId ?? null) !== (input.resourceId ?? null) || approval.payloadHash !== expectedHash) {
    throw new MetaAdminActionError('Approval does not match this exact action payload.', 409, 'APPROVAL_MISMATCH');
  }
  const claimed = await metaAdminDb.metaAdminApproval.updateMany({
    where: { id: approval.id, status: 'APPROVED', version: approval.version },
    data: { status: 'EXECUTING', executionStartedAt: new Date(), version: { increment: 1 } },
  });
  if (claimed.count !== 1) throw new MetaAdminActionError('Approval was already consumed by another request.', 409, 'APPROVAL_ALREADY_CONSUMED');
  return approval.id;
}

async function finishApproval(approvalId: string | null, success: boolean, failureData?: unknown) {
  if (!approvalId) return;
  await metaAdminDb.metaAdminApproval.update({
    where: { id: approvalId },
    data: {
      status: success ? 'EXECUTED' : 'FAILED',
      executedAt: new Date(),
      failureData: failureData === undefined ? undefined : (redactMetaAdminData(failureData) as never),
      version: { increment: 1 },
    },
  });
}

export async function executeMetaAdminAction<T>(input: {
  request: NextRequest;
  actorId: string;
  actionKey: MetaAdminActionKey;
  resourceType: string;
  resourceId?: string | null;
  payload: unknown;
  reason?: string | null;
  approvalId?: string | null;
  beforeData?: unknown;
  run: () => Promise<T>;
}) {
  const policy = getMetaAdminActionPolicy(input.actionKey);
  const metadata = getMetaAdminRequestMetadata(input.request);
  let approvalId: string | null = null;

  try {
    approvalId = await claimApproval(input);
  } catch (error) {
    const safeError = redactMetaAdminData(error instanceof Error ? { name: error.name, message: error.message } : error);
    const audit = await metaAdminDb.metaAdminAudit.create({
      data: {
        actorId: input.actorId,
        actionKey: input.actionKey,
        risk: policy.risk,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        approvalId: null,
        outcome: 'DENIED',
        beforeData: redactMetaAdminData(input.beforeData) as never,
        reason: input.reason ?? null,
        errorData: safeError as never,
        ...metadata,
      },
    }).catch(() => null);
    if (error instanceof Error) Object.assign(error, { auditId: audit?.id ?? null });
    throw error;
  }

  let result: T;
  try {
    result = await input.run();
  } catch (error) {
    const safeError = redactMetaAdminData(error instanceof Error ? { name: error.name, message: error.message } : error);
    const audit = await metaAdminDb.metaAdminAudit.create({
      data: {
        actorId: input.actorId,
        actionKey: input.actionKey,
        risk: policy.risk,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        approvalId,
        outcome: error instanceof MetaAdminActionError ? 'DENIED' : 'FAILED',
        beforeData: redactMetaAdminData(input.beforeData) as never,
        reason: input.reason ?? null,
        errorData: safeError as never,
        ...metadata,
      },
    }).catch(() => null);
    await finishApproval(approvalId, false, safeError).catch(() => undefined);
    if (error instanceof MetaAdminActionError) {
      Object.assign(error, { auditId: audit?.id ?? null });
      throw error;
    }
    const wrapped = error instanceof Error ? error : new Error('Meta admin action failed');
    Object.assign(wrapped, { auditId: audit?.id ?? null });
    throw wrapped;
  }

  let audit: MetaAuditRecord;
  try {
    audit = await metaAdminDb.metaAdminAudit.create({
      data: {
        actorId: input.actorId,
        actionKey: input.actionKey,
        risk: policy.risk,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        approvalId,
        outcome: 'SUCCEEDED',
        beforeData: redactMetaAdminData(input.beforeData) as never,
        afterData: redactMetaAdminData(result) as never,
        reason: input.reason ?? null,
        ...metadata,
      },
    });
  } catch (error) {
    const safeError = redactMetaAdminData(error instanceof Error ? { name: error.name, message: error.message } : error);
    await finishApproval(approvalId, true, {
      code: 'AUDIT_WRITE_FAILED_AFTER_PROVIDER_SUCCESS',
      message: 'Provider action may have completed; verify provider state before any retry.',
      detail: safeError,
    }).catch(() => undefined);
    const wrapped = new MetaAdminActionError(
      'The provider action may have completed, but its audit record could not be persisted. Verify provider state before retrying.',
      500,
      'AUDIT_WRITE_FAILED_AFTER_ACTION'
    );
    Object.assign(wrapped, { cause: error, auditId: null });
    throw wrapped;
  }

  try {
    await finishApproval(approvalId, true);
  } catch (error) {
    const wrapped = new MetaAdminActionError(
      'The provider action completed and was audited, but approval finalization failed. Do not retry until the approval state is reconciled.',
      500,
      'APPROVAL_FINALIZATION_FAILED_AFTER_ACTION'
    );
    Object.assign(wrapped, { cause: error, auditId: audit.id });
    throw wrapped;
  }

  return { result, auditId: audit.id };
}

export async function listMetaAdminApprovals(input: { status?: string; limit?: number }) {
  const limit = Math.min(100, Math.max(1, input.limit ?? 50));
  return metaAdminDb.metaAdminApproval.findMany({
    where: input.status ? { status: input.status as never } : undefined,
    orderBy: { requestedAt: 'desc' },
    take: limit,
    include: {
      requestedBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      rejectedBy: { select: { id: true, name: true } },
    },
  });
}

export async function listMetaAdminAudits(input: { actionKey?: string; outcome?: string; limit?: number }) {
  const limit = Math.min(100, Math.max(1, input.limit ?? 50));
  return metaAdminDb.metaAdminAudit.findMany({
    where: {
      actionKey: input.actionKey || undefined,
      outcome: input.outcome ? (input.outcome as never) : undefined,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { actor: { select: { id: true, name: true } } },
  });
}
