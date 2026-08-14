import 'server-only';

import { createMetaPlatformError, normalizeMetaPlatformError, type MetaPlatformError } from '../core/errors';
import { isMetaResult, metaFailure, metaSuccess } from '../core/result';
import type { MetaCapabilityAdapter, MetaCapabilityId, MetaPlatformRequest } from '../types';

export type LegacyMetaOperationHandler = (
  payload: unknown,
  request: MetaPlatformRequest,
) => unknown | Promise<unknown>;

export interface CreateLegacyMetaCapabilityAdapterOptions {
  readonly capability: MetaCapabilityId;
  readonly operations: Readonly<Record<string, LegacyMetaOperationHandler>>;
  readonly mapError?: (error: unknown, request: MetaPlatformRequest) => MetaPlatformError | undefined;
}

export function createLegacyMetaCapabilityAdapter(
  options: CreateLegacyMetaCapabilityAdapterOptions,
): MetaCapabilityAdapter {
  const operations = new Map(Object.entries(options.operations));

  return Object.freeze({
    capability: options.capability,
    async invoke(request: MetaPlatformRequest) {
      const handler = operations.get(request.operation);
      if (!handler) {
        return metaFailure(createMetaPlatformError({
          code: 'META_LEGACY_OPERATION_UNAVAILABLE',
          category: 'CONFIGURATION',
          message: 'The requested legacy Meta operation is not registered.',
          retryable: false,
          safeDetails: { capability: request.capability, operation: request.operation },
          correlationId: request.context.correlationId,
        }));
      }

      try {
        const value = await handler(request.payload, request);
        return isMetaResult(value) ? value : metaSuccess(value, request.context.correlationId);
      } catch (error) {
        const fallback = {
          code: 'META_LEGACY_OPERATION_FAILED',
          category: 'INTERNAL' as const,
          message: 'The legacy Meta operation failed.',
          retryable: false,
          safeDetails: { capability: request.capability, operation: request.operation },
          correlationId: request.context.correlationId,
        };
        const mapped = options.mapError?.(error, request);
        return metaFailure(normalizeMetaPlatformError(mapped ?? error, fallback));
      }
    },
  });
}
