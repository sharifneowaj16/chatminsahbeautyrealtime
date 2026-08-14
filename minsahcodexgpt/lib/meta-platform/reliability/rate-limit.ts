import { createMetaPlatformError } from '../core/errors';
import { MetaReliabilityDecisionError } from './errors';
import { metaRateLimitScopeKeys } from './scope';
import type { MetaProviderUsageSignal, MetaRateLimitBudget, MetaReliabilityScope, MetaRetryDecision } from './types';

export interface MetaRateLimitStateStore {
  consume(input: {
    readonly key: string;
    readonly now: Date;
    readonly capacity: number;
    readonly refillPerSecond: number;
    readonly cost: number;
  }): Promise<MetaRateLimitBudget>;
  blockUntil(input: { readonly key: string; readonly retryAt: Date; readonly now: Date }): Promise<void>;
  inspect(key: string, now?: Date): Promise<MetaRateLimitBudget>;
}

interface BucketState {
  tokens: number;
  updatedAt: number;
  retryAt?: number;
  capacity: number;
}

export class InMemoryMetaRateLimitStateStore implements MetaRateLimitStateStore {
  private readonly buckets = new Map<string, BucketState>();

  async consume(input: { readonly key: string; readonly now: Date; readonly capacity: number; readonly refillPerSecond: number; readonly cost: number }): Promise<MetaRateLimitBudget> {
    const capacity = Math.max(1, input.capacity);
    const refill = Math.max(0.001, input.refillPerSecond);
    const cost = Math.max(0.001, input.cost);
    const current = this.buckets.get(input.key) ?? { tokens: capacity, updatedAt: input.now.getTime(), capacity };
    if (current.retryAt && current.retryAt > input.now.getTime()) {
      return Object.freeze({ key: input.key, allowed: false, remaining: Math.floor(current.tokens), limit: capacity, retryAt: new Date(current.retryAt).toISOString(), source: 'PROVIDER_COOLDOWN' as const });
    }
    const elapsedSeconds = Math.max(0, input.now.getTime() - current.updatedAt) / 1_000;
    const tokens = Math.min(capacity, current.tokens + elapsedSeconds * refill);
    const allowed = tokens >= cost;
    const remaining = allowed ? tokens - cost : tokens;
    const retryMs = allowed ? undefined : Math.ceil(((cost - tokens) / refill) * 1_000);
    const next: BucketState = { tokens: remaining, updatedAt: input.now.getTime(), capacity, ...(current.retryAt && current.retryAt > input.now.getTime() ? { retryAt: current.retryAt } : {}) };
    this.buckets.set(input.key, next);
    return Object.freeze({
      key: input.key,
      allowed,
      remaining: Math.max(0, Math.floor(remaining)),
      limit: capacity,
      ...(retryMs !== undefined ? { retryAt: new Date(input.now.getTime() + retryMs).toISOString() } : {}),
      source: 'LOCAL_BUCKET' as const,
    });
  }

  async blockUntil(input: { readonly key: string; readonly retryAt: Date; readonly now: Date }): Promise<void> {
    const current = this.buckets.get(input.key) ?? { tokens: 0, updatedAt: input.now.getTime(), capacity: 1 };
    current.retryAt = Math.max(current.retryAt ?? 0, input.retryAt.getTime());
    current.updatedAt = input.now.getTime();
    this.buckets.set(input.key, current);
  }

  async inspect(key: string, now = new Date()): Promise<MetaRateLimitBudget> {
    const current = this.buckets.get(key);
    if (!current) return Object.freeze({ key, allowed: true, remaining: 0, limit: 0, source: 'LOCAL_BUCKET' as const });
    if (current.retryAt && current.retryAt > now.getTime()) {
      return Object.freeze({ key, allowed: false, remaining: Math.floor(current.tokens), limit: current.capacity, retryAt: new Date(current.retryAt).toISOString(), source: 'PROVIDER_COOLDOWN' as const });
    }
    return Object.freeze({ key, allowed: true, remaining: Math.floor(current.tokens), limit: current.capacity, source: 'LOCAL_BUCKET' as const });
  }
}

export interface MetaRateLimiterOptions {
  readonly store: MetaRateLimitStateStore;
  readonly capacity?: number;
  readonly refillPerSecond?: number;
  readonly providerHighWatermarkPercent?: number;
  readonly providerCooldownMs?: number;
}

export class MetaRateLimiter {
  private readonly store: MetaRateLimitStateStore;
  private readonly capacity: number;
  private readonly refillPerSecond: number;
  private readonly providerHighWatermarkPercent: number;
  private readonly providerCooldownMs: number;

  constructor(options: MetaRateLimiterOptions) {
    this.store = options.store;
    this.capacity = Math.max(1, options.capacity ?? 100);
    this.refillPerSecond = Math.max(0.001, options.refillPerSecond ?? 10);
    this.providerHighWatermarkPercent = Math.max(50, Math.min(100, options.providerHighWatermarkPercent ?? 90));
    this.providerCooldownMs = Math.max(1_000, options.providerCooldownMs ?? 60_000);
  }

  async acquire(scope: MetaReliabilityScope, input: { readonly cost?: number; readonly now?: Date } = {}): Promise<readonly MetaRateLimitBudget[]> {
    const now = input.now ?? new Date();
    const budgets: MetaRateLimitBudget[] = [];
    for (const key of metaRateLimitScopeKeys(scope)) {
      const budget = await this.store.consume({ key, now, capacity: this.capacity, refillPerSecond: this.refillPerSecond, cost: input.cost ?? 1 });
      budgets.push(budget);
      if (!budget.allowed) {
        const retryAt = budget.retryAt ?? new Date(now.getTime() + 1_000).toISOString();
        const error = createMetaPlatformError({
          code: 'META_RATE_LIMIT_DEFERRED',
          category: 'RATE_LIMIT',
          message: 'The Meta operation was deferred by the distributed rate limiter.',
          retryable: true,
          safeDetails: { key, retryAt, priority: scope.priority },
        });
        const decision: MetaRetryDecision = Object.freeze({ action: 'DEFER', reason: 'RATE_LIMIT', delayMs: Math.max(1_000, new Date(retryAt).getTime() - now.getTime()), retryAt, error });
        throw new MetaReliabilityDecisionError(decision);
      }
    }
    return Object.freeze(budgets);
  }

  async observeProviderUsage(scope: MetaReliabilityScope, signal: MetaProviderUsageSignal, now = new Date()): Promise<void> {
    const usage = Math.max(signal.appUsagePercent ?? 0, signal.pageUsagePercent ?? 0, signal.adAccountUsagePercent ?? 0);
    const delayMs = signal.retryAfterMs
      ?? signal.estimatedTimeToRegainAccessMs
      ?? (usage >= this.providerHighWatermarkPercent ? this.providerCooldownMs : 0);
    if (delayMs <= 0) return;
    const retryAt = new Date(now.getTime() + Math.max(1_000, delayMs));
    await Promise.all(metaRateLimitScopeKeys(scope).map((key) => this.store.blockUntil({ key, retryAt, now })));
  }

  inspect(scope: MetaReliabilityScope, now = new Date()): Promise<readonly MetaRateLimitBudget[]> {
    return Promise.all(metaRateLimitScopeKeys(scope).map((key) => this.store.inspect(key, now)))
      .then((budgets) => Object.freeze(budgets));
  }
}
