/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only';

import prisma from '@/lib/prisma';
import { redactMetaAdminData } from '@/lib/meta/admin/redaction';
import { MetaAdminActionError } from '@/lib/meta/admin/errors';
import {
  createCustomerFileAudience,
  createLookalikeAudience,
  createWebsiteRetargetingAudience,
  getAudience,
  updateAudience,
} from '@/lib/meta-business/audiences';
import { syncHashedAudienceMembersThroughMetaPlatform } from '@/lib/meta-platform/migration/phase29-audiences-facade';
import type { MetaAudienceHashedBatch, MetaAudienceMemberMode } from '@/lib/meta-platform/domains/audiences/types';
import { buildMetaAudienceMutationPayloadHash, normalizeMetaAudienceMutation } from './safety';
import type { MetaAudienceMutationApprovalPayload, MetaAudienceMutationOperation } from './types';

type MutationDb = {
  metaAdsMutationExecution: {
    create(args: any): Promise<any>;
    update(args: any): Promise<any>;
    findUnique(args: any): Promise<any | null>;
  };
};
const db = prisma as unknown as MutationDb;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function providerId(value: unknown) {
  const record = asRecord(value);
  const id = record.id ?? (record._data ? asRecord(record._data).id : undefined);
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

export async function prepareMetaAudienceMutation(input: {
  readonly operation: MetaAudienceMutationOperation;
  readonly resourceId?: string | null;
  readonly payload: Record<string, unknown>;
}) {
  const creating = input.operation.startsWith('CREATE_');
  const before = creating ? null : await getAudience(input.resourceId?.trim() || '');
  return Object.freeze({ before: before ? asRecord(before) : null, approvalPayload: normalizeMetaAudienceMutation(input) });
}

async function mutateProvider(payload: MetaAudienceMutationApprovalPayload) {
  const input = payload.input;
  switch (payload.operation) {
    case 'CREATE_CUSTOM_AUDIENCE': return createCustomerFileAudience(input as Parameters<typeof createCustomerFileAudience>[0]);
    case 'UPDATE_AUDIENCE':
    case 'UPDATE_RETARGETING_AUDIENCE': return updateAudience(payload.resourceId!, input);
    case 'CREATE_LOOKALIKE_AUDIENCE': return createLookalikeAudience(input as Parameters<typeof createLookalikeAudience>[0]);
    case 'CREATE_RETARGETING_AUDIENCE': return createWebsiteRetargetingAudience(input as Parameters<typeof createWebsiteRetargetingAudience>[0]);
    case 'SYNC_CUSTOM_AUDIENCE': return syncHashedAudienceMembersThroughMetaPlatform({
      audienceId: payload.resourceId!,
      mode: input.mode as MetaAudienceMemberMode,
      batch: input.batch as unknown as MetaAudienceHashedBatch,
    });
    default: throw new MetaAdminActionError('Unsupported audience mutation operation.', 400, 'META_AUDIENCE_OPERATION_UNSUPPORTED');
  }
}

export async function executeMetaAudienceMutation(input: {
  readonly approvalId: string;
  readonly actorId: string;
  readonly correlationId?: string | null;
  readonly payload: MetaAudienceMutationApprovalPayload;
  readonly before: Record<string, unknown> | null;
}) {
  if (!input.approvalId.trim()) throw new MetaAdminActionError('approvalId is required.', 428, 'APPROVAL_REQUIRED');
  const normalized = normalizeMetaAudienceMutation({ operation: input.payload.operation, resourceId: input.payload.resourceId, payload: input.payload.input as Record<string, unknown> });
  const payloadHash = buildMetaAudienceMutationPayloadHash(normalized);
  let execution: any;
  try {
    execution = await db.metaAdsMutationExecution.create({ data: {
      approvalId: input.approvalId, operation: normalized.operation, entityType: normalized.entityType,
      entityId: normalized.resourceId, payloadHash, requestedById: input.actorId, correlationId: input.correlationId ?? null,
      beforeData: redactMetaAdminData(input.before),
    } });
  } catch (error) {
    const existing = await db.metaAdsMutationExecution.findUnique({ where: { approvalId: input.approvalId }, select: { id: true } }).catch(() => null);
    if (existing) throw new MetaAdminActionError('This approval already has a mutation execution record.', 409, 'META_AUDIENCE_APPROVAL_ALREADY_EXECUTED');
    throw error;
  }

  try {
    const providerResult = await mutateProvider(normalized);
    const entityId = normalized.resourceId ?? providerId(providerResult);
    let afterData: Record<string, unknown> | null = null;
    let status: 'SUCCEEDED' | 'RECONCILIATION_REQUIRED' = 'SUCCEEDED';
    let reconcileError: unknown = null;
    if (!entityId) {
      status = 'RECONCILIATION_REQUIRED';
      reconcileError = { code: 'PROVIDER_ENTITY_ID_MISSING', message: 'Provider mutation returned no audience ID.' };
    } else {
      try { afterData = asRecord(await getAudience(entityId)); }
      catch (error) {
        status = 'RECONCILIATION_REQUIRED';
        reconcileError = error instanceof Error ? { name: error.name, message: error.message } : { message: 'Provider audience state re-read failed.' };
      }
    }
    await db.metaAdsMutationExecution.update({ where: { id: execution.id }, data: {
      entityId, status, providerResult: redactMetaAdminData(providerResult), afterData: redactMetaAdminData(afterData),
      errorData: reconcileError ? redactMetaAdminData(reconcileError) : null, completedAt: new Date(),
    } });
    return Object.freeze({ executionId: execution.id, status, entityId, providerResult: redactMetaAdminData(providerResult), afterData: redactMetaAdminData(afterData), reconciliationRequired: status === 'RECONCILIATION_REQUIRED' });
  } catch (error) {
    await db.metaAdsMutationExecution.update({ where: { id: execution.id }, data: {
      status: 'FAILED', errorData: redactMetaAdminData(error instanceof Error ? { name: error.name, message: error.message } : error), completedAt: new Date(),
    } }).catch(() => undefined);
    throw error;
  }
}
