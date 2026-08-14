import 'server-only';

import { metaFailure, metaSuccess, type MetaResult } from '../../core/result';
import { normalizeMetaBusinessSdkError, normalizeMetaBusinessSdkValue } from './normalization';
import type {
  MetaBusinessSdkClient,
  MetaBusinessSdkLogger,
  MetaBusinessSdkOperationContext,
} from './types';
import type { MetaBusinessSdkClientFactory } from './client-factory';

const DEFAULT_TIMEOUT_MS = 30_000;

function createTimeoutError(): Error & { code: string } {
  return Object.assign(new Error('Meta Business SDK request timed out.'), {
    name: 'AbortError',
    code: 'META_BUSINESS_SDK_TIMEOUT',
  });
}

async function raceWithDeadline<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted) throw createTimeoutError();

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let abortHandler: (() => void) | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(createTimeoutError()), timeoutMs);
    if (signal) {
      abortHandler = () => reject(createTimeoutError());
      signal.addEventListener('abort', abortHandler, { once: true });
    }
  });

  try {
    return await Promise.race([operation(), deadline]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (signal && abortHandler) signal.removeEventListener('abort', abortHandler);
  }
}

export class MetaBusinessSdkExecutor {
  readonly #factory: MetaBusinessSdkClientFactory;
  readonly #logger?: MetaBusinessSdkLogger;

  constructor(input: {
    readonly clientFactory: MetaBusinessSdkClientFactory;
    readonly logger?: MetaBusinessSdkLogger;
  }) {
    this.#factory = input.clientFactory;
    this.#logger = input.logger;
  }

  async execute<T>(
    context: MetaBusinessSdkOperationContext,
    operation: (client: MetaBusinessSdkClient) => Promise<T>,
  ): Promise<MetaResult<unknown>> {
    const startedAt = Date.now();
    this.#logger?.({
      phase: 'START',
      capability: context.capability,
      operation: context.operation,
      connectionKey: context.connectionKey,
      credentialRole: context.credentialRole,
      correlationId: context.correlationId,
    });

    try {
      const client = await this.#factory.getClient(context);
      const value = await raceWithDeadline(
        () => operation(client),
        context.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        context.signal,
      );
      const normalized = normalizeMetaBusinessSdkValue(value);
      this.#logger?.({
        phase: 'SUCCESS',
        capability: context.capability,
        operation: context.operation,
        connectionKey: context.connectionKey,
        credentialRole: context.credentialRole,
        credentialVersion: client.credential.metadata.credentialVersion,
        graphApiVersion: client.graphApiVersion,
        sdkVersion: client.sdkVersion,
        durationMs: Date.now() - startedAt,
        correlationId: context.correlationId,
      });
      return metaSuccess(normalized, context.correlationId);
    } catch (error) {
      const normalized = normalizeMetaBusinessSdkError(error, {
        operation: context.operation,
        correlationId: context.correlationId,
      });
      this.#logger?.({
        phase: 'FAILURE',
        capability: context.capability,
        operation: context.operation,
        connectionKey: context.connectionKey,
        credentialRole: context.credentialRole,
        durationMs: Date.now() - startedAt,
        error: normalized,
        correlationId: context.correlationId,
      });
      return metaFailure(normalized);
    }
  }
}
