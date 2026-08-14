import { isMetaPlatformError } from '../core/errors';
import { isMetaReliabilityDecisionError } from '../reliability/errors';
import { MetaRetryPolicy, metaPlatformErrorToSafeError } from '../reliability/retry';
import type { MetaProviderUsageSignal } from '../reliability/types';
import { MetaPayloadCodecRegistry, MetaPayloadPoisonError } from './payload';
import type { MetaOperationStore } from './store';
import type { MetaOperationRecord, MetaOperationSafeError } from './types';

export interface MetaOperationExecutionHandler<TPayload = unknown> {
  readonly idempotent?: boolean;
  readonly maxAttempts?: number;
  readonly requestMayHaveSucceeded?: (error: unknown) => boolean;
  readonly providerUsage?: (error: unknown) => MetaProviderUsageSignal | undefined;
  execute(input: {
    readonly operation: MetaOperationRecord;
    readonly payload: TPayload;
  }): Promise<Readonly<Record<string, unknown>> | void>;
}

export class MetaOperationHandlerRegistry {
  private readonly handlers = new Map<string, MetaOperationExecutionHandler>();

  register<TPayload>(operationType: string, handler: MetaOperationExecutionHandler<TPayload>): this {
    const normalized = operationType.trim();
    if (!normalized || this.handlers.has(normalized)) throw new TypeError('META_OPERATION_HANDLER_DUPLICATE_OR_INVALID');
    this.handlers.set(normalized, handler as MetaOperationExecutionHandler);
    return this;
  }

  get(operationType: string): MetaOperationExecutionHandler | undefined {
    return this.handlers.get(operationType);
  }
}

function safeExecutionError(error: unknown): MetaOperationSafeError {
  if (isMetaPlatformError(error)) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      category: error.category,
      ...(error.safeDetails ? { safeDetails: error.safeDetails } : {}),
    };
  }
  if (error instanceof MetaPayloadPoisonError) {
    return { code: error.code, message: error.message, retryable: false, category: 'PAYLOAD', ...(error.safeDetails ? { safeDetails: error.safeDetails } : {}) };
  }
  return {
    code: 'META_OPERATION_EXECUTION_FAILED',
    message: error instanceof Error ? error.message.slice(0, 500) : 'Operation execution failed.',
    retryable: false,
  };
}

export async function executeMetaOperation(input: {
  readonly operationId: string;
  readonly store: MetaOperationStore;
  readonly payloadRegistry: MetaPayloadCodecRegistry;
  readonly handlerRegistry: MetaOperationHandlerRegistry;
  readonly workerId?: string;
  readonly leaseMs?: number;
  readonly retryPolicy?: MetaRetryPolicy;
  readonly now?: () => Date;
}): Promise<{
  readonly executed: boolean;
  readonly duplicate: boolean;
  readonly terminal: boolean;
  readonly operation: MetaOperationRecord;
}> {
  const claim = await input.store.beginExecution({
    operationId: input.operationId,
    workerId: input.workerId,
    leaseMs: input.leaseMs,
  });
  if (!claim.claimed || !claim.leaseToken) {
    return { executed: false, duplicate: claim.duplicate, terminal: claim.terminal, operation: claim.operation };
  }

  try {
    const payload = input.payloadRegistry.decode(claim.operation.payload);
    const handler = input.handlerRegistry.get(claim.operation.operationType);
    if (!handler) {
      throw new MetaPayloadPoisonError('META_PAYLOAD_CODEC_NOT_FOUND', 'No execution handler is registered for this operation type.', {
        operationType: claim.operation.operationType,
      });
    }
    const result = await handler.execute({ operation: claim.operation, payload });
    const completed = await input.store.completeExecution({
      operationId: claim.operation.id,
      leaseToken: claim.leaseToken,
      ...(result ? { result } : {}),
    });
    if (!completed) throw new Error('META_OPERATION_COMPLETION_LEASE_LOST');
    return { executed: true, duplicate: false, terminal: true, operation: completed };
  } catch (error) {
    const handler = input.handlerRegistry.get(claim.operation.operationType);
    const now = input.now?.() ?? new Date();
    const decision = isMetaReliabilityDecisionError(error)
      ? error.decision
      : (input.retryPolicy ?? new MetaRetryPolicy()).decide({
          error,
          attempt: claim.operation.attempts,
          priority: claim.operation.priority,
          expiresAt: claim.operation.expiresAt,
          idempotent: handler?.idempotent ?? false,
          requestMayHaveSucceeded: handler?.requestMayHaveSucceeded?.(error),
          providerUsage: handler?.providerUsage?.(error),
          maxAttempts: handler?.maxAttempts,
          now,
          correlationId: claim.operation.correlationId,
        });

    if ((decision.action === 'RETRY' || decision.action === 'DEFER') && decision.retryAt) {
      const deferred = await input.store.deferExecution({
        operationId: claim.operation.id,
        leaseToken: claim.leaseToken,
        error: metaPlatformErrorToSafeError(decision.error),
        availableAt: new Date(decision.retryAt),
      });
      if (!deferred) throw new Error('META_OPERATION_DEFER_LEASE_LOST');
      return { executed: true, duplicate: false, terminal: false, operation: deferred };
    }

    const failed = await input.store.failExecution({
      operationId: claim.operation.id,
      leaseToken: claim.leaseToken,
      error: isMetaReliabilityDecisionError(error)
        ? metaPlatformErrorToSafeError(decision.error)
        : decision.error ? metaPlatformErrorToSafeError(decision.error) : safeExecutionError(error),
    });
    if (!failed) throw new Error('META_OPERATION_FAILURE_LEASE_LOST');
    return { executed: true, duplicate: false, terminal: true, operation: failed };
  }
}
