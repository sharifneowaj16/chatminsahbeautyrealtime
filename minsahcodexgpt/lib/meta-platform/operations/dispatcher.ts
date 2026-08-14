import { MetaPayloadCodecRegistry, MetaPayloadPoisonError } from './payload';
import { MetaQueueAdmissionController } from '../reliability/admission';
import { isMetaReliabilityDecisionError } from '../reliability/errors';
import { MetaRetryPolicy, metaPlatformErrorToSafeError } from '../reliability/retry';
import type { MetaOperationStore } from './store';
import type { MetaOperationDispatchPayload, MetaOperationSafeError, MetaOutboxMessageRecord } from './types';

export interface MetaOperationPublisher {
  publish(input: {
    readonly topic: string;
    readonly partitionKey: string;
    readonly messageId: string;
    readonly payload: MetaOperationDispatchPayload;
  }): Promise<{ readonly externalMessageId?: string; readonly safeDetails?: Readonly<Record<string, unknown>> } | void>;
}

export interface MetaOperationDispatcherOptions {
  readonly store: MetaOperationStore;
  readonly payloadRegistry: MetaPayloadCodecRegistry;
  readonly publisher: MetaOperationPublisher;
  readonly workerId?: string;
  readonly leaseMs?: number;
  readonly retryDelayMs?: number;
  readonly admission?: MetaQueueAdmissionController;
  readonly retryPolicy?: MetaRetryPolicy;
  readonly now?: () => Date;
}

export interface MetaOperationDispatchSummary {
  readonly claimed: number;
  readonly published: number;
  readonly deferred: number;
  readonly quarantined: number;
  readonly ambiguous: number;
  readonly backpressured: number;
  readonly errors: readonly { readonly messageId: string; readonly code: string }[];
}

function safePublishError(error: unknown): MetaOperationSafeError {
  if (error && typeof error === 'object') {
    const candidate = error as Partial<MetaOperationSafeError>;
    if (typeof candidate.code === 'string' && typeof candidate.message === 'string' && typeof candidate.retryable === 'boolean') {
      return {
        code: candidate.code,
        message: candidate.message,
        retryable: candidate.retryable,
        ...(candidate.category ? { category: candidate.category } : {}),
        ...(candidate.safeDetails ? { safeDetails: candidate.safeDetails } : {}),
      };
    }
  }
  return {
    code: 'META_OPERATION_PUBLISH_FAILED',
    message: error instanceof Error ? error.message.slice(0, 500) : 'Operation queue publish failed.',
    retryable: true,
  };
}

function poisonError(error: MetaPayloadPoisonError): MetaOperationSafeError {
  return {
    code: error.code,
    message: error.message,
    retryable: false,
    category: 'PAYLOAD',
    ...(error.safeDetails ? { safeDetails: error.safeDetails } : {}),
  };
}

function buildDispatchPayload(operation: Awaited<ReturnType<MetaOperationStore['getOperation']>>, message: MetaOutboxMessageRecord): MetaOperationDispatchPayload {
  if (!operation) throw new Error('META_OUTBOX_OPERATION_MISSING');
  if (operation.payloadDigest !== message.payloadDigest) throw new MetaPayloadPoisonError('META_PAYLOAD_DECODE_FAILED', 'Operation and outbox payload digests do not match.', { operationId: operation.id });
  return Object.freeze({
    operationId: operation.id,
    operationType: operation.operationType,
    capability: operation.capability,
    payload: message.payload,
    payloadDigest: message.payloadDigest,
    correlationId: operation.correlationId,
    priority: operation.priority,
    expiresAt: operation.expiresAt,
  });
}

export class MetaOperationDispatcher {
  private readonly options: MetaOperationDispatcherOptions;

  constructor(options: MetaOperationDispatcherOptions) {
    this.options = options;
  }

  async dispatchDue(limit = 25): Promise<MetaOperationDispatchSummary> {
    const batch = await this.options.store.claimDueOutbox({
      limit,
      leaseMs: this.options.leaseMs,
      workerId: this.options.workerId,
    });
    const summary = { claimed: batch.messages.length, published: 0, deferred: 0, quarantined: 0, ambiguous: 0, backpressured: 0, errors: [] as { messageId: string; code: string }[] };

    for (const message of batch.messages) {
      try {
        this.options.payloadRegistry.decode(message.payload);
        const operation = await this.options.store.getOperation(message.operationId);
        if (!operation) throw new Error('META_OUTBOX_OPERATION_MISSING');
        if (this.options.admission) {
          try {
            await this.options.admission.assertAdmitted({ priority: operation.priority, expiresAt: operation.expiresAt, now: this.options.now?.() });
          } catch (error) {
            if (!isMetaReliabilityDecisionError(error)) throw error;
            const retryAt = error.decision.retryAt ? new Date(error.decision.retryAt) : new Date((this.options.now?.() ?? new Date()).getTime() + Math.max(1_000, error.decision.delayMs));
            await this.options.store.releaseOutbox({ messageId: message.id, leaseToken: batch.leaseToken, error: metaPlatformErrorToSafeError(error.decision.error), availableAt: retryAt });
            summary.deferred += 1;
            summary.backpressured += 1;
            summary.errors.push({ messageId: message.id, code: error.code });
            continue;
          }
        }
        const payload = buildDispatchPayload(operation, message);
        const published = await this.options.publisher.publish({
          topic: message.topic,
          partitionKey: message.partitionKey,
          messageId: message.operationId,
          payload,
        });
        const updated = await this.options.store.markOutboxPublished({
          messageId: message.id,
          leaseToken: batch.leaseToken,
          safeDetails: {
            ...(published?.externalMessageId ? { externalMessageId: published.externalMessageId } : {}),
            ...(published?.safeDetails ?? {}),
          },
        });
        if (!updated) {
          summary.ambiguous += 1;
          summary.errors.push({ messageId: message.id, code: 'META_OUTBOX_PUBLISH_ACK_AMBIGUOUS' });
          continue;
        }
        summary.published += 1;
      } catch (error) {
        if (error instanceof MetaPayloadPoisonError) {
          await this.options.store.quarantineOutbox({
            messageId: message.id,
            leaseToken: batch.leaseToken,
            reason: error.code,
            error: poisonError(error),
          });
          summary.quarantined += 1;
          summary.errors.push({ messageId: message.id, code: error.code });
          continue;
        }
        const safeError = safePublishError(error);
        const operation = await this.options.store.getOperation(message.operationId);
        const now = this.options.now?.() ?? new Date();
        const decision = (this.options.retryPolicy ?? new MetaRetryPolicy()).decide({
          error: safeError,
          attempt: message.attempts + 1,
          priority: operation?.priority ?? message.priority,
          expiresAt: operation?.expiresAt,
          idempotent: true,
          maxAttempts: message.maxAttempts,
          now,
          correlationId: operation?.correlationId,
        });
        const availableAt = decision.retryAt ? new Date(decision.retryAt) : new Date(now.getTime() + Math.max(1_000, this.options.retryDelayMs ?? 30_000));
        await this.options.store.releaseOutbox({
          messageId: message.id,
          leaseToken: batch.leaseToken,
          error: metaPlatformErrorToSafeError(decision.error),
          availableAt,
        });
        summary.deferred += decision.action === 'RETRY' || decision.action === 'DEFER' ? 1 : 0;
        summary.errors.push({ messageId: message.id, code: decision.error.code });
      }
    }

    return Object.freeze({ ...summary, errors: Object.freeze(summary.errors) });
  }
}
