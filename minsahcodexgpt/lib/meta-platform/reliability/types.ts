import type { MetaAssetType, MetaPlatformEnvironment } from '../context/asset-context';
import type { MetaPlatformError } from '../core/errors';

export const META_OPERATION_PRIORITIES = ['P0', 'P1', 'P2', 'P3', 'P4'] as const;
export type MetaOperationPriority = (typeof META_OPERATION_PRIORITIES)[number];

export const META_CIRCUIT_STATES = ['CLOSED', 'OPEN', 'HALF_OPEN'] as const;
export type MetaCircuitState = (typeof META_CIRCUIT_STATES)[number];

export type MetaReliabilityOperationKind = 'READ' | 'WRITE';

export interface MetaReliabilityScope {
  readonly environment: MetaPlatformEnvironment;
  readonly connectionKey: string;
  readonly capability: string;
  readonly operation: string;
  readonly priority: MetaOperationPriority;
  readonly kind: MetaReliabilityOperationKind;
  readonly assetType?: MetaAssetType;
  readonly assetId?: string;
}

export interface MetaCircuitSnapshot {
  readonly key: string;
  readonly state: MetaCircuitState;
  readonly consecutiveFailures: number;
  readonly openedAt?: string;
  readonly openUntil?: string;
  readonly probeLeaseToken?: string;
  readonly probeLeaseExpiresAt?: string;
  readonly updatedAt: string;
}

export interface MetaCircuitPermit {
  readonly key: string;
  readonly state: 'CLOSED' | 'HALF_OPEN';
  readonly probeLeaseToken?: string;
}

export interface MetaRateLimitBudget {
  readonly key: string;
  readonly allowed: boolean;
  readonly remaining: number;
  readonly limit: number;
  readonly retryAt?: string;
  readonly source: 'LOCAL_BUCKET' | 'PROVIDER_COOLDOWN';
}

export interface MetaQueueDepthSnapshot {
  readonly total: number;
  readonly byPriority: Readonly<Record<MetaOperationPriority, number>>;
  readonly oldestAgeMs?: number;
}

export interface MetaQueueAdmissionDecision {
  readonly admitted: boolean;
  readonly reason: 'WITHIN_LIMIT' | 'PRIORITY_RESERVED' | 'QUEUE_SATURATED' | 'DEADLINE_EXPIRED';
  readonly retryAt?: string;
  readonly snapshot: MetaQueueDepthSnapshot;
}

export type MetaRetryAction = 'RETRY' | 'DEFER' | 'FAIL' | 'RECONCILE';

export interface MetaRetryDecision {
  readonly action: MetaRetryAction;
  readonly reason:
    | 'RETRYABLE_DEPENDENCY'
    | 'PROVIDER_RETRY_AFTER'
    | 'RATE_LIMIT'
    | 'CIRCUIT_OPEN'
    | 'BACKPRESSURE'
    | 'DEADLINE_EXPIRED'
    | 'ATTEMPTS_EXHAUSTED'
    | 'NON_RETRYABLE'
    | 'UNSAFE_WRITE_UNKNOWN_OUTCOME';
  readonly delayMs: number;
  readonly retryAt?: string;
  readonly error: MetaPlatformError;
}

export interface MetaReadCacheEntry<T> {
  readonly value: T;
  readonly freshUntil: string;
  readonly staleUntil: string;
  readonly updatedAt: string;
}

export interface MetaReliabilityExecutionResult<T> {
  readonly value: T;
  readonly attempts: number;
  readonly stale: boolean;
}

export interface MetaReliabilityHealthSnapshot {
  readonly checkedAt: string;
  readonly circuit: MetaCircuitSnapshot;
  readonly queue?: MetaQueueDepthSnapshot;
  readonly rateLimits: readonly MetaRateLimitBudget[];
  readonly healthy: boolean;
  readonly warnings: readonly string[];
}

export interface MetaProviderUsageSignal {
  readonly retryAfterMs?: number;
  readonly appUsagePercent?: number;
  readonly pageUsagePercent?: number;
  readonly adAccountUsagePercent?: number;
  readonly estimatedTimeToRegainAccessMs?: number;
}
