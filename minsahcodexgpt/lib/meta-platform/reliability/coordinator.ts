import { isMetaPlatformError } from '../core/errors';
import { MetaCircuitBreakerRegistry } from './circuit-breaker';
import { MetaDeadlineBudget, runWithMetaDeadline } from './deadline';
import { MetaReliabilityDecisionError } from './errors';
import { MetaRateLimiter } from './rate-limit';
import { MetaRetryPolicy } from './retry';
import type { MetaProviderUsageSignal, MetaReliabilityExecutionResult, MetaReliabilityScope } from './types';

const sleep = (delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs));

export class MetaReliabilityCoordinator {
  private readonly circuit: MetaCircuitBreakerRegistry;
  private readonly rateLimiter: MetaRateLimiter;
  private readonly retryPolicy: MetaRetryPolicy;
  private readonly sleepImpl: (delayMs: number) => Promise<void>;

  constructor(input: {
    readonly circuit: MetaCircuitBreakerRegistry;
    readonly rateLimiter: MetaRateLimiter;
    readonly retryPolicy?: MetaRetryPolicy;
    readonly sleep?: (delayMs: number) => Promise<void>;
  }) {
    this.circuit = input.circuit;
    this.rateLimiter = input.rateLimiter;
    this.retryPolicy = input.retryPolicy ?? new MetaRetryPolicy();
    this.sleepImpl = input.sleep ?? sleep;
  }

  async execute<T>(input: {
    readonly scope: MetaReliabilityScope;
    readonly expiresAt: Date | string;
    readonly idempotent: boolean;
    readonly maxAttempts?: number;
    readonly requestTimeoutMs?: number;
    readonly signal?: AbortSignal;
    readonly correlationId?: string;
    readonly operation: (signal: AbortSignal, attempt: number) => Promise<T>;
    readonly providerUsage?: (error: unknown) => MetaProviderUsageSignal | undefined;
    readonly requestMayHaveSucceeded?: (error: unknown) => boolean;
  }): Promise<MetaReliabilityExecutionResult<T>> {
    const budget = new MetaDeadlineBudget({ expiresAt: input.expiresAt, correlationId: input.correlationId });
    let attempt = 0;
    while (true) {
      attempt += 1;
      budget.assertRemaining();
      await this.rateLimiter.acquire(input.scope);
      const permit = await this.circuit.acquire(input.scope);
      try {
        const value = await runWithMetaDeadline({
          budget,
          requestedTimeoutMs: input.requestTimeoutMs ?? 30_000,
          signal: input.signal,
          operation: (signal) => input.operation(signal, attempt),
        });
        await this.circuit.recordSuccess(permit);
        return Object.freeze({ value, attempts: attempt, stale: false });
      } catch (error) {
        if (error instanceof MetaReliabilityDecisionError) throw error;
        const usage = input.providerUsage?.(error);
        if (usage) await this.rateLimiter.observeProviderUsage(input.scope, usage);
        const retryable = isMetaPlatformError(error) ? error.retryable : Boolean((error as { retryable?: unknown } | null)?.retryable);
        const rateLimited = isMetaPlatformError(error) && error.category === 'RATE_LIMIT';
        await this.circuit.recordFailure(permit, { retryable, rateLimited });
        const decision = this.retryPolicy.decide({
          error,
          attempt,
          priority: input.scope.priority,
          expiresAt: budget.expiresAt,
          idempotent: input.idempotent,
          requestMayHaveSucceeded: input.requestMayHaveSucceeded?.(error),
          providerUsage: usage,
          maxAttempts: input.maxAttempts,
          correlationId: input.correlationId,
        });
        if (decision.action !== 'RETRY') throw new MetaReliabilityDecisionError(decision);
        budget.assertRemaining(decision.delayMs + 100);
        await this.sleepImpl(decision.delayMs);
      }
    }
  }
}
