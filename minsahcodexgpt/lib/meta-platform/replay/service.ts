import { createHash } from 'node:crypto';
import { createMetaInvocationContext } from '../core/context';
import type { MetaOperationService } from '../operations/service';
import type { MetaOperationStore } from '../operations/store';
import type { MetaOperationRecord } from '../operations/types';
import type { MetaWorkflowStore } from '../workflows/store';
import type { MetaReplayRecord } from '../workflows/types';

const REPLAYABLE_STATUSES = new Set<MetaOperationRecord['status']>(['PERMANENT_FAILURE', 'QUARANTINED', 'CANCELLED']);
const DEFAULT_REPLAY_TTL_MS = 24 * 60 * 60 * 1_000;

export interface MetaReplayApprovalAuthorizer {
  authorize(input: {
    readonly actorId: string;
    readonly role: string;
    readonly action: 'APPROVE_META_REPLAY';
    readonly replay: MetaReplayRecord;
  }): Promise<boolean>;
}

export class MetaControlledReplayError extends Error {
  readonly code: string;
  readonly safeDetails?: Readonly<Record<string, unknown>>;

  constructor(code: string, message: string, safeDetails?: Readonly<Record<string, unknown>>) {
    super(message);
    this.name = 'MetaControlledReplayError';
    this.code = code;
    this.safeDetails = safeDetails ? Object.freeze({ ...safeDetails }) : undefined;
  }
}

export class MetaControlledReplayService {
  constructor(private readonly options: {
    readonly operationStore: MetaOperationStore;
    readonly operationService: MetaOperationService;
    readonly workflowStore: MetaWorkflowStore;
    readonly approvalAuthorizer: MetaReplayApprovalAuthorizer;
    readonly clock?: () => Date;
  }) {}

  async request(input: {
    readonly sourceOperationId: string;
    readonly idempotencyKey: string;
    readonly requestedBy: string;
    readonly reason: string;
    readonly expiresAt?: Date;
  }): Promise<MetaReplayRecord> {
    const now = this.now();
    const normalized = normalizeRequest(input, now);
    const prior = await this.options.workflowStore.getReplayByIdempotencyKey(normalized.idempotencyKey);
    if (prior) {
      assertSameReplayRequest(prior, normalized);
      if (prior.status === 'REJECTED') throw rejectedReplay(prior);
      return prior;
    }

    const audit = await this.options.workflowStore.createReplay(normalized);
    try {
      await this.assertSourceReplayable(audit.sourceOperationId, audit.idempotencyKey);
      return audit;
    } catch (error) {
      const controlled = asControlledReplayError(error);
      await this.options.workflowStore.completeReplay({ replayId: audit.id, rejectionCode: controlled.code });
      throw controlled;
    }
  }

  async approve(input: {
    readonly idempotencyKey: string;
    readonly approvedBy: string;
    readonly approvalRole: string;
    readonly expectedRequestDigest: string;
  }): Promise<MetaReplayRecord> {
    const replay = await this.getReplay(input.idempotencyKey);
    if (replay.requestDigest !== input.expectedRequestDigest.trim()) {
      throw new MetaControlledReplayError('META_REPLAY_REQUEST_DIGEST_MISMATCH', 'The replay approval does not match the immutable request digest.');
    }
    if (replay.status === 'CREATED') return replay;
    if (replay.status === 'REJECTED') throw rejectedReplay(replay);
    if (new Date(replay.expiresAt).getTime() <= this.now().getTime()) {
      await this.options.workflowStore.completeReplay({ replayId: replay.id, rejectionCode: 'META_REPLAY_EXPIRED' });
      throw new MetaControlledReplayError('META_REPLAY_EXPIRED', 'The replay approval window has expired.');
    }
    const approvedBy = required(input.approvedBy, 'META_REPLAY_APPROVER_INVALID');
    const approvalRole = required(input.approvalRole, 'META_REPLAY_APPROVAL_ROLE_INVALID');
    if (approvedBy === replay.requestedBy) {
      throw new MetaControlledReplayError('META_REPLAY_TWO_PERSON_APPROVAL_REQUIRED', 'Replay requester and approver must be different actors.');
    }
    const authorized = await this.options.approvalAuthorizer.authorize({
      actorId: approvedBy,
      role: approvalRole,
      action: 'APPROVE_META_REPLAY',
      replay,
    });
    if (!authorized) {
      throw new MetaControlledReplayError('META_REPLAY_APPROVER_UNAUTHORIZED', 'The approver is not authorized to approve controlled replay.');
    }
    return this.options.workflowStore.approveReplay({
      replayId: replay.id,
      approvedBy,
      approvalRole,
      approvedAt: this.now(),
    });
  }

  async execute(input: {
    readonly idempotencyKey: string;
    readonly expectedRequestDigest: string;
  }): Promise<{ readonly audit: MetaReplayRecord; readonly operation: MetaOperationRecord }> {
    const replay = await this.getReplay(input.idempotencyKey);
    if (replay.requestDigest !== input.expectedRequestDigest.trim()) {
      throw new MetaControlledReplayError('META_REPLAY_REQUEST_DIGEST_MISMATCH', 'The replay execution does not match the immutable request digest.');
    }
    if (replay.status === 'CREATED' && replay.replayOperationId) {
      const operation = await this.options.operationStore.getOperation(replay.replayOperationId);
      if (!operation) throw new Error('META_REPLAY_OPERATION_MISSING');
      return { audit: replay, operation };
    }
    if (replay.status === 'REJECTED') throw rejectedReplay(replay);
    if (replay.status !== 'APPROVED' || !replay.approvedBy || !replay.approvedAt || !replay.approvalRole) {
      throw new MetaControlledReplayError('META_REPLAY_NOT_APPROVED', 'Replay requires a separate authorized approval before execution.');
    }
    const expiresAt = new Date(replay.expiresAt);
    if (expiresAt.getTime() <= this.now().getTime()) {
      await this.options.workflowStore.completeReplay({ replayId: replay.id, rejectionCode: 'META_REPLAY_EXPIRED' });
      throw new MetaControlledReplayError('META_REPLAY_EXPIRED', 'The replay approval window has expired.');
    }

    let source: MetaOperationRecord;
    try {
      source = await this.assertSourceReplayable(replay.sourceOperationId, replay.idempotencyKey);
    } catch (error) {
      const controlled = asControlledReplayError(error);
      await this.options.workflowStore.completeReplay({ replayId: replay.id, rejectionCode: controlled.code });
      throw controlled;
    }

    const committed = await this.options.operationService.commit({
      environment: source.environment,
      connectionKey: source.connectionKey,
      capability: source.capability,
      operationType: source.operationType,
      idempotencyKey: replay.idempotencyKey,
      ...(source.credentialRole ? { credentialRole: source.credentialRole } : {}),
      ...(source.assetType ? { assetType: source.assetType } : {}),
      ...(source.assetId ? { assetId: source.assetId } : {}),
      invocation: createMetaInvocationContext({
        correlationId: `replay:${source.correlationId}`.slice(0, 128),
        actor: { type: 'ADMIN', reference: replay.approvedBy },
        deadlineAt: expiresAt,
      }),
      payload: source.payload,
      priority: source.priority,
      expiresAt,
      replayOfOperationId: source.id,
      partitionKey: source.assetId ?? source.connectionKey,
    });
    const completedAudit = await this.options.workflowStore.completeReplay({ replayId: replay.id, replayOperationId: committed.operation.id });
    return { audit: completedAudit, operation: committed.operation };
  }

  private async getReplay(idempotencyKey: string): Promise<MetaReplayRecord> {
    const replay = await this.options.workflowStore.getReplayByIdempotencyKey(required(idempotencyKey, 'META_REPLAY_IDEMPOTENCY_KEY_INVALID'));
    if (!replay) throw new MetaControlledReplayError('META_REPLAY_NOT_FOUND', 'The replay request does not exist.');
    return replay;
  }

  private async assertSourceReplayable(sourceOperationId: string, replayIdempotencyKey: string): Promise<MetaOperationRecord> {
    const source = await this.options.operationStore.getOperation(sourceOperationId);
    if (!source) throw new MetaControlledReplayError('META_REPLAY_SOURCE_NOT_FOUND', 'The source operation does not exist.');
    if (!REPLAYABLE_STATUSES.has(source.status)) {
      throw new MetaControlledReplayError('META_REPLAY_SOURCE_NOT_TERMINAL_FAILURE', 'Only failed, quarantined or cancelled operations may be replayed.', { status: source.status });
    }
    if (source.idempotencyKey === replayIdempotencyKey) {
      throw new MetaControlledReplayError('META_REPLAY_NEW_IDEMPOTENCY_KEY_REQUIRED', 'Replay must use a new idempotency key.');
    }
    const workflow = await this.options.workflowStore.getWorkflowByOperation(source.id);
    if (workflow) {
      const reconciliations = await this.options.workflowStore.listReconciliations(workflow.id);
      const unresolved = reconciliations.filter((item) => item.status !== 'RESOLVED_FAILED');
      if (unresolved.length) {
        throw new MetaControlledReplayError('META_REPLAY_UNKNOWN_OUTCOME_UNRESOLVED', 'Replay is blocked until unknown provider outcomes are resolved as failed.', {
          reconciliationIds: unresolved.map((item) => item.id),
        });
      }
    }
    return source;
  }

  private now(): Date {
    return this.options.clock?.() ?? new Date();
  }
}

function normalizeRequest(input: {
  readonly sourceOperationId: string;
  readonly idempotencyKey: string;
  readonly requestedBy: string;
  readonly reason: string;
  readonly expiresAt?: Date;
}, now: Date) {
  const sourceOperationId = required(input.sourceOperationId, 'META_REPLAY_SOURCE_OPERATION_INVALID');
  const idempotencyKey = required(input.idempotencyKey, 'META_REPLAY_IDEMPOTENCY_KEY_INVALID');
  const requestedBy = required(input.requestedBy, 'META_REPLAY_REQUESTER_INVALID');
  const reason = input.reason.trim();
  if (reason.length < 10 || reason.length > 1_000) {
    throw new MetaControlledReplayError('META_REPLAY_REASON_INVALID', 'Replay reason must be between 10 and 1000 characters.');
  }
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : new Date(now.getTime() + DEFAULT_REPLAY_TTL_MS);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
    throw new MetaControlledReplayError('META_REPLAY_EXPIRY_INVALID', 'Replay expiry must be in the future.');
  }
  const requestDigest = createReplayRequestDigest({ sourceOperationId, idempotencyKey, requestedBy, reason, expiresAt });
  return { sourceOperationId, idempotencyKey, requestedBy, reason, expiresAt, requestDigest };
}

export function createReplayRequestDigest(input: {
  readonly sourceOperationId: string;
  readonly idempotencyKey: string;
  readonly requestedBy: string;
  readonly reason: string;
  readonly expiresAt: Date;
}): string {
  const canonical = JSON.stringify({
    sourceOperationId: input.sourceOperationId,
    idempotencyKey: input.idempotencyKey,
    requestedBy: input.requestedBy,
    reason: input.reason,
    expiresAt: input.expiresAt.toISOString(),
  });
  return createHash('sha256').update(canonical).digest('hex');
}

function assertSameReplayRequest(
  replay: MetaReplayRecord,
  normalized: ReturnType<typeof normalizeRequest>,
): void {
  if (replay.sourceOperationId !== normalized.sourceOperationId
    || replay.requestedBy !== normalized.requestedBy
    || replay.reason !== normalized.reason
    || replay.requestDigest !== normalized.requestDigest
    || replay.expiresAt !== normalized.expiresAt.toISOString()) {
    throw new MetaControlledReplayError('META_REPLAY_IDEMPOTENCY_CONFLICT', 'The replay idempotency key is already bound to a different immutable request.');
  }
}

function required(value: string, code: string): string {
  const normalized = value.trim();
  if (!normalized) throw new MetaControlledReplayError(code, 'A required replay field is missing.');
  return normalized;
}

function rejectedReplay(replay: MetaReplayRecord): MetaControlledReplayError {
  return new MetaControlledReplayError(replay.rejectionCode ?? 'META_REPLAY_REJECTED', 'This replay request was rejected.');
}

function asControlledReplayError(error: unknown): MetaControlledReplayError {
  return error instanceof MetaControlledReplayError
    ? error
    : new MetaControlledReplayError('META_REPLAY_VALIDATION_FAILED', error instanceof Error ? error.message : 'Replay validation failed.');
}
