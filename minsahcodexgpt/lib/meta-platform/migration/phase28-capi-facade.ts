import 'server-only';

import type { MetaPlatformCapiService } from '../domains/capi/service';
import type { MetaPlatformCapiDeliveryResult, MetaPlatformCapiRequest } from '../domains/capi/types';
import type { MetaPlatformError } from '../core/errors';
import { resolveMetaCapiCutover } from './phase28-cutover';
import { META_BUSINESS_SDK_VERSION, DEFAULT_META_GRAPH_API_VERSION } from '../versioning/registry';
import { getMetaPlatformCapiConfig } from '../domains/capi/config';

export interface MetaCapiCutoverDeliveryResult {
  readonly ok: boolean;
  readonly status: number;
  readonly responsePayload: MetaPlatformCapiDeliveryResult['responsePayload'];
  readonly responseHeaders: Readonly<Record<string, string>>;
  readonly graphApiVersion: string;
  readonly sdkVersion: string;
  readonly transport: 'LEGACY_BUSINESS_SDK' | 'META_PLATFORM_BUSINESS_SDK';
  readonly cutoverMode: ReturnType<typeof resolveMetaCapiCutover>['mode'];
  readonly credentialVersion?: string;
}

export class MetaCapiCutoverError extends Error {
  readonly code: string;
  readonly providerStatus: number;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
  readonly safeDetails?: Readonly<Record<string, unknown>>;

  constructor(input: {
    readonly code: string;
    readonly message: string;
    readonly providerStatus: number;
    readonly retryable: boolean;
    readonly retryAfterMs?: number;
    readonly safeDetails?: Readonly<Record<string, unknown>>;
  }) {
    super(input.message);
    this.name = 'MetaCapiCutoverError';
    this.code = input.code;
    this.providerStatus = input.providerStatus;
    this.retryable = input.retryable;
    this.retryAfterMs = input.retryAfterMs;
    this.safeDetails = input.safeDetails;
  }
}

let service: MetaPlatformCapiService | undefined;

async function platformService() {
  if (!service) {
    const runtime = await import('../domains/capi/service');
    service = new runtime.MetaPlatformCapiService();
  }
  return service;
}

function statusFor(error: MetaPlatformError) {
  if (error.category === 'AUTHENTICATION') return 401;
  if (error.category === 'AUTHORIZATION') return 403;
  if (error.category === 'VALIDATION' || error.category === 'CONFIGURATION') return 400;
  if (error.category === 'RATE_LIMIT') return 429;
  if (error.category === 'TIMEOUT') return 504;
  return 503;
}

function throwPlatformError(error: MetaPlatformError): never {
  throw new MetaCapiCutoverError({
    code: error.code,
    message: error.message,
    providerStatus: statusFor(error),
    retryable: error.retryable,
    safeDetails: error.safeDetails,
  });
}

export function getMetaCapiCutoverStatus(input: { readonly eventId?: string; readonly testEventCode?: string | null; readonly env?: NodeJS.ProcessEnv } = {}) {
  return resolveMetaCapiCutover({ eventId: input.eventId?.trim() || 'status-probe', testEventCode: input.testEventCode, env: input.env });
}

export async function sendMetaCapiWithPhase28Cutover(input: {
  readonly payload: MetaPlatformCapiRequest;
  readonly correlationId?: string;
  readonly pixelId?: string;
}): Promise<MetaCapiCutoverDeliveryResult> {
  const eventId = input.payload.data[0]?.event_id?.trim();
  if (!eventId) throw new MetaCapiCutoverError({ code: 'META_CAPI_EVENT_ID_REQUIRED', message: 'A stable event ID is required for CAPI cutover.', providerStatus: 400, retryable: false });
  const cutover = resolveMetaCapiCutover({ eventId, testEventCode: input.payload.test_event_code });
  if (cutover.selected) {
    const baseConfig = getMetaPlatformCapiConfig();
    const config = input.pixelId?.trim() ? Object.freeze({ ...baseConfig, pixelId: input.pixelId.trim() }) : baseConfig;
    const result = await (await platformService()).send({ payload: input.payload, config, correlationId: input.correlationId });
    if (!result.ok) throwPlatformError(result.error);
    return Object.freeze({ ...result.value, cutoverMode: cutover.mode });
  }
  if (cutover.legacyDisabled) {
    throw new MetaCapiCutoverError({
      code: 'META_CAPI_LEGACY_DISABLED_CUTOVER_REQUIRED',
      message: 'Legacy CAPI delivery is disabled and this event was not selected for MetaPlatform delivery.',
      providerStatus: 409,
      retryable: false,
      safeDetails: { canaryPercent: cutover.canaryPercent, bucket: cutover.bucket },
    });
  }

  const [{ sendMetaCapiWithBusinessSdk }, schema] = await Promise.all([
    import('@/lib/tracking/meta-business-sdk'),
    import('@/lib/tracking/meta-schema'),
  ]);
  const pixelId = input.pixelId?.trim() || schema.getMetaPixelId();
  const accessToken = schema.getMetaCapiAccessToken();
  if (!pixelId || !accessToken) {
    throw new MetaCapiCutoverError({ code: 'META_ENV_MISSING', message: 'Meta Pixel ID or legacy CAPI credential is missing.', providerStatus: 400, retryable: false });
  }
  const legacy = await sendMetaCapiWithBusinessSdk({
    pixelId,
    accessToken,
    payload: input.payload as import('@/lib/tracking/meta-business-sdk').MetaBusinessSdkRequestInput,
  });
  return Object.freeze({
    ok: legacy.ok,
    status: legacy.status,
    responsePayload: legacy.responsePayload,
    responseHeaders: Object.freeze({ ...legacy.responseHeaders }),
    graphApiVersion: legacy.graphApiVersion || DEFAULT_META_GRAPH_API_VERSION,
    sdkVersion: legacy.sdkVersion || META_BUSINESS_SDK_VERSION,
    transport: 'LEGACY_BUSINESS_SDK',
    cutoverMode: cutover.mode,
  });
}
