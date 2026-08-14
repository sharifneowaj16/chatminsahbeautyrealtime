import { getMetaCapabilityDefinition, listMetaCapabilityDefinitions } from './capabilities/registry';
import { createMetaPlatformError, normalizeMetaPlatformError } from './core/errors';
import { metaFailure, isMetaResult, type MetaResult } from './core/result';
import { readMetaCorrelationId, validateMetaPlatformRequest } from './core/validation';
import type {
  MetaCapabilityAdapter,
  MetaCapabilityId,
  MetaPlatformCapabilityStatus,
  MetaPlatformInvoker,
  MetaPlatformRequest,
} from './types';

export interface MetaPlatformOptions {
  readonly adapters?: readonly MetaCapabilityAdapter[];
}

export class MetaPlatform implements MetaPlatformInvoker {
  private readonly adapters = new Map<MetaCapabilityId, MetaCapabilityAdapter>();

  constructor(options: MetaPlatformOptions = {}) {
    for (const adapter of options.adapters ?? []) this.register(adapter);
  }

  register(adapter: MetaCapabilityAdapter): void {
    getMetaCapabilityDefinition(adapter.capability);
    if (this.adapters.has(adapter.capability)) {
      throw new Error(`META_CAPABILITY_ADAPTER_DUPLICATE:${adapter.capability}`);
    }
    this.adapters.set(adapter.capability, adapter);
  }

  has(capability: MetaCapabilityId): boolean {
    return this.adapters.has(capability);
  }

  listCapabilities(): readonly MetaPlatformCapabilityStatus[] {
    return Object.freeze(listMetaCapabilityDefinitions().map((definition) => Object.freeze({
      capability: definition.id,
      targetPhase: definition.targetPhase,
      cutoverFlag: definition.cutoverFlag,
      registered: this.adapters.has(definition.id),
    })));
  }

  async invoke<TPayload, TValue>(request: MetaPlatformRequest<TPayload>): Promise<MetaResult<TValue>> {
    const validation = validateMetaPlatformRequest(request);
    if (validation) {
      return metaFailure(createMetaPlatformError({
        code: validation.code,
        category: 'VALIDATION',
        message: validation.message,
        retryable: false,
        safeDetails: { field: validation.field },
        correlationId: readMetaCorrelationId(request),
      }));
    }

    const adapter = this.adapters.get(request.capability);
    if (!adapter) {
      const definition = getMetaCapabilityDefinition(request.capability);
      return metaFailure(createMetaPlatformError({
        code: 'META_CAPABILITY_UNAVAILABLE',
        category: 'CONFIGURATION',
        message: 'The requested Meta capability is not available through the platform.',
        retryable: false,
        safeDetails: {
          capability: request.capability,
          targetPhase: definition.targetPhase,
          cutoverFlag: definition.cutoverFlag,
        },
        correlationId: request.context.correlationId,
      }));
    }

    try {
      const result = await adapter.invoke(request as MetaPlatformRequest);
      if (!isMetaResult(result)) {
        return metaFailure(createMetaPlatformError({
          code: 'META_ADAPTER_RESULT_INVALID',
          category: 'INTERNAL',
          message: 'The Meta capability returned an invalid result contract.',
          retryable: false,
          safeDetails: { capability: request.capability, operation: request.operation },
          correlationId: request.context.correlationId,
        }));
      }
      return result as MetaResult<TValue>;
    } catch (error) {
      return metaFailure(normalizeMetaPlatformError(error, {
        code: 'META_CAPABILITY_EXECUTION_FAILED',
        category: 'INTERNAL',
        message: 'The Meta capability could not complete the requested operation.',
        retryable: false,
        safeDetails: { capability: request.capability, operation: request.operation },
        correlationId: request.context.correlationId,
      }));
    }
  }
}
