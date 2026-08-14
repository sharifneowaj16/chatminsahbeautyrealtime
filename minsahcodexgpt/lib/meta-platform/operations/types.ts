import type { MetaActorType, MetaInvocationContext } from '../core/context';
import type { MetaAssetType } from '../context/asset-context';
import type { MetaCredentialRole } from '../credentials/roles';
import type { MetaPlatformEnvironment } from '../context/asset-context';
import type { MetaOperationPriority } from '../reliability/types';

export const META_OPERATION_STATUSES = [
  'ACCEPTED',
  'DISPATCHING',
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'RETRYABLE_FAILURE',
  'PERMANENT_FAILURE',
  'QUARANTINED',
  'CANCELLED',
] as const;
export type MetaOperationStatus = (typeof META_OPERATION_STATUSES)[number];

export const META_OPERATION_EVENT_TYPES = [
  'OPERATION_ACCEPTED',
  'OUTBOX_CREATED',
  'OUTBOX_CLAIMED',
  'OUTBOX_PUBLISHED',
  'OUTBOX_RELEASED',
  'EXECUTION_STARTED',
  'EXECUTION_SUCCEEDED',
  'EXECUTION_FAILED',
  'EXECUTION_DEFERRED',
  'OPERATION_EXPIRED',
  'QUEUE_BACKPRESSURE',
  'PAYLOAD_QUARANTINED',
  'DUPLICATE_IGNORED',
  'OPERATION_CANCELLED',
] as const;
export type MetaOperationEventType = (typeof META_OPERATION_EVENT_TYPES)[number];

export const META_OUTBOX_MESSAGE_STATES = [
  'PENDING',
  'CLAIMED',
  'PUBLISHED',
  'RETRY_SCHEDULED',
  'QUARANTINED',
  'DEAD_LETTER',
] as const;
export type MetaOutboxMessageState = (typeof META_OUTBOX_MESSAGE_STATES)[number];

export interface MetaVersionedPayload<T = unknown> {
  readonly type: string;
  readonly schemaVersion: number;
  readonly data: T;
}

export interface MetaOperationIdentity {
  readonly environment: MetaPlatformEnvironment;
  readonly connectionKey: string;
  readonly idempotencyKey: string;
}

export interface MetaOperationAssetScope {
  readonly assetType?: MetaAssetType;
  readonly assetId?: string;
}

export interface MetaOperationRecord extends MetaOperationIdentity, MetaOperationAssetScope {
  readonly id: string;
  readonly capability: string;
  readonly operationType: string;
  readonly credentialRole?: MetaCredentialRole;
  readonly correlationId: string;
  readonly actorType: MetaActorType;
  readonly actorReference?: string;
  readonly payload: MetaVersionedPayload;
  readonly payloadDigest: string;
  readonly status: MetaOperationStatus;
  readonly priority: MetaOperationPriority;
  readonly attempts: number;
  readonly expiresAt: string;
  readonly nextAttemptAt?: string;
  readonly replayOfOperationId?: string;
  readonly result?: Readonly<Record<string, unknown>>;
  readonly lastError?: Readonly<Record<string, unknown>>;
  readonly executionLeaseToken?: string;
  readonly executionLeaseExpiresAt?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MetaOperationEventRecord {
  readonly id: string;
  readonly operationId: string;
  readonly sequence: number;
  readonly eventType: MetaOperationEventType;
  readonly fromStatus?: MetaOperationStatus;
  readonly toStatus?: MetaOperationStatus;
  readonly attempt: number;
  readonly safeDetails?: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
}

export interface MetaOutboxMessageRecord {
  readonly id: string;
  readonly operationId: string;
  readonly topic: string;
  readonly partitionKey: string;
  readonly payload: MetaVersionedPayload;
  readonly payloadDigest: string;
  readonly state: MetaOutboxMessageState;
  readonly priority: MetaOperationPriority;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly availableAt: string;
  readonly leaseToken?: string;
  readonly leaseExpiresAt?: string;
  readonly publishedAt?: string;
  readonly lastError?: Readonly<Record<string, unknown>>;
  readonly quarantineReason?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateMetaOperationInput extends MetaOperationIdentity, MetaOperationAssetScope {
  readonly capability: string;
  readonly operationType: string;
  readonly credentialRole?: MetaCredentialRole;
  readonly invocation: MetaInvocationContext;
  readonly payload: MetaVersionedPayload;
  readonly priority?: MetaOperationPriority;
  readonly expiresAt?: Date | string;
  readonly topic?: string;
  readonly partitionKey?: string;
  readonly maxDispatchAttempts?: number;
  readonly replayOfOperationId?: string;
}

export interface MetaCommittedOperation<TBusinessResult = unknown> {
  readonly created: boolean;
  readonly operation: MetaOperationRecord;
  readonly outbox: MetaOutboxMessageRecord;
  readonly businessResult?: TBusinessResult;
}

export interface MetaClaimedOutboxBatch {
  readonly leaseToken: string;
  readonly messages: readonly MetaOutboxMessageRecord[];
}

export interface MetaOperationExecutionClaim {
  readonly claimed: boolean;
  readonly duplicate: boolean;
  readonly terminal: boolean;
  readonly operation: MetaOperationRecord;
  readonly leaseToken?: string;
}

export interface MetaOperationSafeError {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly category?: string;
  readonly safeDetails?: Readonly<Record<string, unknown>>;
}

export interface MetaOperationDispatchPayload {
  readonly operationId: string;
  readonly operationType: string;
  readonly capability: string;
  readonly payload: MetaVersionedPayload;
  readonly payloadDigest: string;
  readonly correlationId: string;
  readonly priority: MetaOperationPriority;
  readonly expiresAt: string;
}
