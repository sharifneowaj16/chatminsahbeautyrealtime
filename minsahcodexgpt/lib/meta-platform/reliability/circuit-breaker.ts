import { randomUUID } from 'node:crypto';
import { createMetaPlatformError } from '../core/errors';
import { MetaReliabilityDecisionError } from './errors';
import { metaReliabilityScopeKey } from './scope';
import type { MetaCircuitPermit, MetaCircuitSnapshot, MetaReliabilityScope, MetaRetryDecision } from './types';

export interface MetaCircuitStateStore {
  get(key: string): Promise<MetaCircuitSnapshot>;
  acquire(input: {
    readonly key: string;
    readonly now: Date;
    readonly probeOwner: string;
    readonly probeLeaseMs: number;
  }): Promise<{ readonly permit: MetaCircuitPermit | null; readonly snapshot: MetaCircuitSnapshot }>;
  success(input: { readonly key: string; readonly permit: MetaCircuitPermit; readonly now: Date }): Promise<MetaCircuitSnapshot>;
  failure(input: {
    readonly key: string;
    readonly permit: MetaCircuitPermit;
    readonly now: Date;
    readonly failureThreshold: number;
    readonly openDurationMs: number;
  }): Promise<MetaCircuitSnapshot>;
  forceOpen(input: { readonly key: string; readonly now: Date; readonly openDurationMs: number }): Promise<MetaCircuitSnapshot>;
}

function initial(key: string, now = new Date()): MetaCircuitSnapshot {
  return Object.freeze({ key, state: 'CLOSED' as const, consecutiveFailures: 0, updatedAt: now.toISOString() });
}

export class InMemoryMetaCircuitStateStore implements MetaCircuitStateStore {
  private readonly states = new Map<string, MetaCircuitSnapshot>();

  async get(key: string): Promise<MetaCircuitSnapshot> {
    return this.states.get(key) ?? initial(key);
  }

  async acquire(input: { readonly key: string; readonly now: Date; readonly probeOwner: string; readonly probeLeaseMs: number }): Promise<{ readonly permit: MetaCircuitPermit | null; readonly snapshot: MetaCircuitSnapshot }> {
    const current = this.states.get(input.key) ?? initial(input.key, input.now);
    if (current.state === 'CLOSED') {
      this.states.set(input.key, current);
      return { permit: Object.freeze({ key: input.key, state: 'CLOSED' as const }), snapshot: current };
    }
    const openUntil = current.openUntil ? new Date(current.openUntil).getTime() : 0;
    if (current.state === 'OPEN' && openUntil > input.now.getTime()) return { permit: null, snapshot: current };
    const probeExpiresAt = current.probeLeaseExpiresAt ? new Date(current.probeLeaseExpiresAt).getTime() : 0;
    if (current.state === 'HALF_OPEN' && probeExpiresAt > input.now.getTime()) return { permit: null, snapshot: current };

    const token = `${input.probeOwner}:${randomUUID()}`;
    const halfOpen: MetaCircuitSnapshot = Object.freeze({
      ...current,
      state: 'HALF_OPEN',
      probeLeaseToken: token,
      probeLeaseExpiresAt: new Date(input.now.getTime() + Math.max(1_000, input.probeLeaseMs)).toISOString(),
      updatedAt: input.now.toISOString(),
    });
    this.states.set(input.key, halfOpen);
    return { permit: Object.freeze({ key: input.key, state: 'HALF_OPEN' as const, probeLeaseToken: token }), snapshot: halfOpen };
  }

  async success(input: { readonly key: string; readonly permit: MetaCircuitPermit; readonly now: Date }): Promise<MetaCircuitSnapshot> {
    const current = this.states.get(input.key) ?? initial(input.key, input.now);
    if (input.permit.state === 'HALF_OPEN' && current.probeLeaseToken !== input.permit.probeLeaseToken) return current;
    const closed = initial(input.key, input.now);
    this.states.set(input.key, closed);
    return closed;
  }

  async failure(input: { readonly key: string; readonly permit: MetaCircuitPermit; readonly now: Date; readonly failureThreshold: number; readonly openDurationMs: number }): Promise<MetaCircuitSnapshot> {
    const current = this.states.get(input.key) ?? initial(input.key, input.now);
    if (input.permit.state === 'HALF_OPEN' && current.probeLeaseToken !== input.permit.probeLeaseToken) return current;
    const failures = current.consecutiveFailures + 1;
    const shouldOpen = input.permit.state === 'HALF_OPEN' || failures >= Math.max(1, input.failureThreshold);
    const next: MetaCircuitSnapshot = shouldOpen
      ? Object.freeze({
          key: input.key,
          state: 'OPEN' as const,
          consecutiveFailures: failures,
          openedAt: input.now.toISOString(),
          openUntil: new Date(input.now.getTime() + Math.max(1_000, input.openDurationMs)).toISOString(),
          updatedAt: input.now.toISOString(),
        })
      : Object.freeze({ ...current, state: 'CLOSED' as const, consecutiveFailures: failures, updatedAt: input.now.toISOString() });
    this.states.set(input.key, next);
    return next;
  }

  async forceOpen(input: { readonly key: string; readonly now: Date; readonly openDurationMs: number }): Promise<MetaCircuitSnapshot> {
    const current = this.states.get(input.key) ?? initial(input.key, input.now);
    const next = Object.freeze({
      key: input.key,
      state: 'OPEN' as const,
      consecutiveFailures: Math.max(1, current.consecutiveFailures),
      openedAt: input.now.toISOString(),
      openUntil: new Date(input.now.getTime() + Math.max(1_000, input.openDurationMs)).toISOString(),
      updatedAt: input.now.toISOString(),
    });
    this.states.set(input.key, next);
    return next;
  }
}

export interface MetaCircuitBreakerOptions {
  readonly store: MetaCircuitStateStore;
  readonly failureThreshold?: number;
  readonly openDurationMs?: number;
  readonly probeLeaseMs?: number;
  readonly probeOwner?: string;
}

export class MetaCircuitBreakerRegistry {
  private readonly store: MetaCircuitStateStore;
  private readonly failureThreshold: number;
  private readonly openDurationMs: number;
  private readonly probeLeaseMs: number;
  private readonly probeOwner: string;

  constructor(options: MetaCircuitBreakerOptions) {
    this.store = options.store;
    this.failureThreshold = Math.max(1, Math.min(options.failureThreshold ?? 5, 100));
    this.openDurationMs = Math.max(1_000, options.openDurationMs ?? 60_000);
    this.probeLeaseMs = Math.max(1_000, options.probeLeaseMs ?? 15_000);
    this.probeOwner = options.probeOwner?.trim() || 'meta-reliability';
  }

  async acquire(scope: MetaReliabilityScope, now = new Date()): Promise<MetaCircuitPermit> {
    const key = metaReliabilityScopeKey(scope);
    const acquired = await this.store.acquire({ key, now, probeOwner: this.probeOwner, probeLeaseMs: this.probeLeaseMs });
    if (acquired.permit) return acquired.permit;
    const retryAt = acquired.snapshot.openUntil ?? acquired.snapshot.probeLeaseExpiresAt;
    const error = createMetaPlatformError({
      code: 'META_CIRCUIT_OPEN',
      category: 'DEPENDENCY_UNAVAILABLE',
      message: 'The Meta provider circuit is open for this capability and asset scope.',
      retryable: true,
      safeDetails: { key, state: acquired.snapshot.state, ...(retryAt ? { retryAt } : {}) },
    });
    const decision: MetaRetryDecision = Object.freeze({
      action: 'DEFER',
      reason: 'CIRCUIT_OPEN',
      delayMs: retryAt ? Math.max(1_000, new Date(retryAt).getTime() - now.getTime()) : this.openDurationMs,
      ...(retryAt ? { retryAt } : {}),
      error,
    });
    throw new MetaReliabilityDecisionError(decision);
  }

  async recordSuccess(permit: MetaCircuitPermit, now = new Date()): Promise<MetaCircuitSnapshot> {
    return this.store.success({ key: permit.key, permit, now });
  }

  async recordFailure(permit: MetaCircuitPermit, input: { readonly retryable: boolean; readonly rateLimited?: boolean; readonly now?: Date }): Promise<MetaCircuitSnapshot> {
    const now = input.now ?? new Date();
    if (!input.retryable) return this.store.success({ key: permit.key, permit, now });
    if (input.rateLimited) return this.store.forceOpen({ key: permit.key, now, openDurationMs: this.openDurationMs });
    return this.store.failure({ key: permit.key, permit, now, failureThreshold: this.failureThreshold, openDurationMs: this.openDurationMs });
  }

  snapshot(scope: MetaReliabilityScope): Promise<MetaCircuitSnapshot> {
    return this.store.get(metaReliabilityScopeKey(scope));
  }
}
