import 'server-only';

import { createMetaPlatformError, normalizeMetaPlatformError } from '../../core/errors';
import { metaFailure, metaSuccess, type MetaResult } from '../../core/result';
import { createEnvironmentMetaCredentialProvider } from '../../credentials/environment-provider';
import type { MetaCredentialProvider } from '../../credentials/types';
import { MetaBusinessSdkClientFactory } from '../../transports/business-sdk/client-factory';
import { sendMetaCapiEventsWithBusinessSdk } from '../../transports/business-sdk/adapters/capi';
import { getMetaPlatformCapiConfig, type MetaPlatformCapiConfig } from './config';
import type { MetaPlatformCapiDeliveryResult, MetaPlatformCapiRequest } from './types';

function validateRequest(payload: MetaPlatformCapiRequest) {
  if (!Array.isArray(payload.data) || payload.data.length === 0 || payload.data.length > 1_000) throw new TypeError('META_CAPI_EVENT_BATCH_INVALID');
  for (const event of payload.data) {
    if (!event.event_name?.trim()) throw new TypeError('META_CAPI_EVENT_NAME_REQUIRED');
    if (!event.event_id?.trim()) throw new TypeError('META_CAPI_EVENT_ID_REQUIRED');
    if (!Number.isInteger(event.event_time) || event.event_time <= 0) throw new TypeError('META_CAPI_EVENT_TIME_INVALID');
    if (!event.user_data || !event.custom_data) throw new TypeError('META_CAPI_EVENT_DATA_REQUIRED');
  }
}

export class MetaPlatformCapiService {
  readonly #factory: MetaBusinessSdkClientFactory;
  readonly #fetchImpl?: typeof fetch;

  constructor(input: { readonly credentialProvider?: MetaCredentialProvider; readonly fetchImpl?: typeof fetch } = {}) {
    const credentialProvider = input.credentialProvider ?? createEnvironmentMetaCredentialProvider();
    this.#factory = new MetaBusinessSdkClientFactory({ credentialProvider, appCredentialProvider: credentialProvider });
    this.#fetchImpl = input.fetchImpl;
  }

  async send(input: {
    readonly payload: MetaPlatformCapiRequest;
    readonly config?: MetaPlatformCapiConfig;
    readonly correlationId?: string;
  }): Promise<MetaResult<MetaPlatformCapiDeliveryResult>> {
    const config = input.config ?? getMetaPlatformCapiConfig();
    try {
      validateRequest(input.payload);
      if (!config.pixelId) {
        return metaFailure(createMetaPlatformError({ code: 'META_PIXEL_ID_NOT_CONFIGURED', category: 'CONFIGURATION', message: 'The Meta Pixel/Dataset ID is not configured.', retryable: false, correlationId: input.correlationId }));
      }
      const client = await this.#factory.getClient({
        capability: 'capi-delivery', connectionKey: config.connectionKey, credentialRole: 'CAPI', graphApiVersion: config.graphApiVersion, correlationId: input.correlationId,
      });
      const delivery = await sendMetaCapiEventsWithBusinessSdk({
        client, pixelId: config.pixelId, payload: input.payload, partnerAgent: config.partnerAgent, timeoutMs: config.timeoutMs, fetchImpl: this.#fetchImpl,
      });
      return metaSuccess(delivery, input.correlationId);
    } catch (error) {
      const validationFailure = error instanceof TypeError && error.message.startsWith('META_CAPI_');
      const timeoutFailure = error instanceof Error && (error.name === 'AbortError' || error.message === 'META_CAPI_TIMEOUT');
      return metaFailure(normalizeMetaPlatformError(error, {
        code: validationFailure ? error.message : timeoutFailure ? 'META_CAPI_TIMEOUT' : 'META_CAPI_RUNTIME_FAILURE',
        category: validationFailure ? 'VALIDATION' : timeoutFailure ? 'TIMEOUT' : 'DEPENDENCY_UNAVAILABLE',
        message: validationFailure ? 'The Meta CAPI request failed local validation.' : timeoutFailure ? 'Meta CAPI delivery timed out.' : 'Meta CAPI delivery failed before a provider response was confirmed.',
        retryable: !validationFailure,
        safeDetails: validationFailure ? undefined : { requestMayHaveSucceeded: true },
        correlationId: input.correlationId,
      }));
    }
  }

  async invalidateCredential(input: { readonly connectionKey: string }) {
    return this.#factory.invalidate({ connectionKey: input.connectionKey, credentialRole: 'CAPI' });
  }
}
