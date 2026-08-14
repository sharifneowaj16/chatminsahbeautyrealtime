import { createMetaPlatformError } from '../core/errors';
import { MetaReliabilityDecisionError } from './errors';
import type { MetaOperationPriority, MetaQueueAdmissionDecision, MetaQueueDepthSnapshot, MetaRetryDecision } from './types';

export interface MetaQueueDepthProvider {
  snapshot(): Promise<MetaQueueDepthSnapshot>;
}

export class StaticMetaQueueDepthProvider implements MetaQueueDepthProvider {
  private value: MetaQueueDepthSnapshot;

  constructor(initial: MetaQueueDepthSnapshot = { total: 0, byPriority: { P0: 0, P1: 0, P2: 0, P3: 0, P4: 0 } }) {
    this.value = Object.freeze({ ...initial, byPriority: Object.freeze({ ...initial.byPriority }) });
  }

  set(value: MetaQueueDepthSnapshot): void {
    this.value = Object.freeze({ ...value, byPriority: Object.freeze({ ...value.byPriority }) });
  }

  async snapshot(): Promise<MetaQueueDepthSnapshot> {
    return this.value;
  }
}

const PRIORITY_CAPACITY_RATIO: Readonly<Record<MetaOperationPriority, number>> = Object.freeze({
  P0: 1.10,
  P1: 1.00,
  P2: 0.90,
  P3: 0.80,
  P4: 0.70,
});

export class MetaQueueAdmissionController {
  private readonly provider: MetaQueueDepthProvider;
  private readonly maxDepth: number;
  private readonly retryDelayMs: number;

  constructor(input: { readonly provider: MetaQueueDepthProvider; readonly maxDepth?: number; readonly retryDelayMs?: number }) {
    this.provider = input.provider;
    this.maxDepth = Math.max(1, input.maxDepth ?? 10_000);
    this.retryDelayMs = Math.max(1_000, input.retryDelayMs ?? 30_000);
  }

  async decide(input: { readonly priority: MetaOperationPriority; readonly expiresAt?: Date | string; readonly now?: Date }): Promise<MetaQueueAdmissionDecision> {
    const now = input.now ?? new Date();
    const snapshot = await this.provider.snapshot();
    if (input.expiresAt && new Date(input.expiresAt).getTime() <= now.getTime()) {
      return Object.freeze({ admitted: false, reason: 'DEADLINE_EXPIRED', snapshot });
    }
    const limit = Math.ceil(this.maxDepth * PRIORITY_CAPACITY_RATIO[input.priority]);
    if (snapshot.total < limit) {
      return Object.freeze({ admitted: true, reason: snapshot.total >= this.maxDepth ? 'PRIORITY_RESERVED' : 'WITHIN_LIMIT', snapshot });
    }
    return Object.freeze({
      admitted: false,
      reason: 'QUEUE_SATURATED',
      retryAt: new Date(now.getTime() + this.retryDelayMs).toISOString(),
      snapshot,
    });
  }

  async assertAdmitted(input: { readonly priority: MetaOperationPriority; readonly expiresAt?: Date | string; readonly now?: Date }): Promise<MetaQueueAdmissionDecision> {
    const decision = await this.decide(input);
    if (decision.admitted) return decision;
    const now = input.now ?? new Date();
    const deadline = decision.reason === 'DEADLINE_EXPIRED';
    const error = createMetaPlatformError({
      code: deadline ? 'META_OPERATION_DEADLINE_EXPIRED' : 'META_QUEUE_BACKPRESSURE',
      category: deadline ? 'TIMEOUT' : 'DEPENDENCY_UNAVAILABLE',
      message: deadline
        ? 'The Meta operation expired while waiting for queue admission.'
        : 'The Meta operation was durably deferred because the queue is saturated.',
      retryable: !deadline,
      safeDetails: { priority: input.priority, queueDepth: decision.snapshot.total, maxDepth: this.maxDepth },
    });
    const retryDecision: MetaRetryDecision = Object.freeze({
      action: deadline ? 'FAIL' : 'DEFER',
      reason: deadline ? 'DEADLINE_EXPIRED' : 'BACKPRESSURE',
      delayMs: decision.retryAt ? Math.max(1_000, new Date(decision.retryAt).getTime() - now.getTime()) : 0,
      ...(decision.retryAt ? { retryAt: decision.retryAt } : {}),
      error,
    });
    throw new MetaReliabilityDecisionError(retryDecision);
  }
}
