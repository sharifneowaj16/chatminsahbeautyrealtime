import type {
  CreateMetaOperationInput,
  MetaClaimedOutboxBatch,
  MetaCommittedOperation,
  MetaOperationEventRecord,
  MetaOperationExecutionClaim,
  MetaOperationRecord,
  MetaOperationSafeError,
  MetaOutboxMessageRecord,
} from './types';


export class MetaOperationIdempotencyConflictError extends Error {
  readonly code = 'META_OPERATION_IDEMPOTENCY_CONFLICT';
  readonly safeDetails: Readonly<{ operationId: string }>;

  constructor(operationId: string) {
    super('The idempotency key is already bound to a different Meta operation command.');
    this.name = 'MetaOperationIdempotencyConflictError';
    this.safeDetails = Object.freeze({ operationId });
  }
}

export function assertMetaOperationIdempotencyMatch(
  existing: MetaOperationRecord,
  input: CreateMetaOperationInput,
  payloadDigest: string,
): void {
  const matches = existing.capability === input.capability.trim()
    && existing.operationType === input.operationType.trim()
    && existing.payloadDigest === payloadDigest
    && (existing.assetType ?? null) === (input.assetType ?? null)
    && (existing.assetId ?? null) === (input.assetId?.trim() || null)
    && (existing.credentialRole ?? null) === (input.credentialRole ?? null)
    && (existing.replayOfOperationId ?? null) === (input.replayOfOperationId?.trim() || null)
    && existing.priority === (input.priority ?? 'P2')
    && existing.expiresAt === new Date(input.expiresAt ?? existing.expiresAt).toISOString();
  if (!matches) throw new MetaOperationIdempotencyConflictError(existing.id);
}

export interface MetaOperationTransactionContext {
  readonly implementation: 'PRISMA' | 'IN_MEMORY';
  readonly raw: unknown;
}

export interface MetaOperationStore {
  commitWithOperation<TBusinessResult>(
    input: CreateMetaOperationInput,
    businessMutation?: (tx: MetaOperationTransactionContext) => Promise<TBusinessResult>,
  ): Promise<MetaCommittedOperation<TBusinessResult>>;

  getOperation(operationId: string): Promise<MetaOperationRecord | null>;
  getOutboxMessage(messageId: string): Promise<MetaOutboxMessageRecord | null>;
  listOperationEvents(operationId: string): Promise<readonly MetaOperationEventRecord[]>;

  claimDueOutbox(input?: {
    readonly limit?: number;
    readonly leaseMs?: number;
    readonly workerId?: string;
    readonly now?: Date;
  }): Promise<MetaClaimedOutboxBatch>;

  markOutboxPublished(input: {
    readonly messageId: string;
    readonly leaseToken: string;
    readonly publishedAt?: Date;
    readonly safeDetails?: Readonly<Record<string, unknown>>;
  }): Promise<MetaOutboxMessageRecord | null>;

  releaseOutbox(input: {
    readonly messageId: string;
    readonly leaseToken: string;
    readonly error: MetaOperationSafeError;
    readonly availableAt: Date;
  }): Promise<MetaOutboxMessageRecord | null>;

  quarantineOutbox(input: {
    readonly messageId: string;
    readonly leaseToken?: string;
    readonly reason: string;
    readonly error?: MetaOperationSafeError;
  }): Promise<MetaOutboxMessageRecord | null>;

  beginExecution(input: {
    readonly operationId: string;
    readonly workerId?: string;
    readonly leaseMs?: number;
    readonly now?: Date;
  }): Promise<MetaOperationExecutionClaim>;

  completeExecution(input: {
    readonly operationId: string;
    readonly leaseToken: string;
    readonly result?: Readonly<Record<string, unknown>>;
  }): Promise<MetaOperationRecord | null>;

  deferExecution(input: {
    readonly operationId: string;
    readonly leaseToken: string;
    readonly error: MetaOperationSafeError;
    readonly availableAt: Date;
  }): Promise<MetaOperationRecord | null>;

  failExecution(input: {
    readonly operationId: string;
    readonly leaseToken: string;
    readonly error: MetaOperationSafeError;
  }): Promise<MetaOperationRecord | null>;
}
