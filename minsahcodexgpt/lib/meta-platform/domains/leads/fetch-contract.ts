import type { MetaLeadProviderPayload } from './types.ts';

export const META_LEAD_FETCH_FIELDS = Object.freeze([
  'id', 'created_time', 'ad_id', 'ad_name', 'adset_id', 'adset_name', 'campaign_id', 'campaign_name',
  'form_id', 'field_data', 'is_organic', 'platform', 'partner_name', 'retailer_item_id', 'is_test_lead',
] as const);

export type MetaLeadRetrievalStatus = 'PENDING' | 'FETCHING' | 'RETRYING' | 'FETCHED' | 'NOT_FOUND' | 'TOKEN_ERROR' | 'PERMANENT_FAILURE';

export class MetaLeadFetchError extends Error {
  code: string;
  retrievalStatus: MetaLeadRetrievalStatus;
  permanent: boolean;
  traceId: string | undefined;
  httpStatus: number | undefined;

  constructor(input: {
    code: string;
    message: string;
    retrievalStatus: MetaLeadRetrievalStatus;
    permanent: boolean;
    traceId?: string | undefined;
    httpStatus?: number | undefined;
  }) {
    super(input.message);
    this.name = 'MetaLeadFetchError';
    this.code = input.code;
    this.retrievalStatus = input.retrievalStatus;
    this.permanent = input.permanent;
    this.traceId = input.traceId;
    this.httpStatus = input.httpStatus;
  }
}

type MetaLeadFetchClient = Readonly<{
  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T>;
}>;

function candidateError(error: unknown): Readonly<Record<string, unknown>> {
  return error && typeof error === 'object' ? error as Record<string, unknown> : Object.freeze({});
}

export function classifyMetaLeadFetchError(error: unknown): MetaLeadFetchError {
  if (error instanceof MetaLeadFetchError) return error;
  const candidate = candidateError(error);
  const code = typeof candidate.code === 'string' || typeof candidate.code === 'number' ? String(candidate.code) : '';
  const httpStatus = typeof candidate.httpStatus === 'number'
    ? candidate.httpStatus
    : typeof candidate.status === 'number' ? candidate.status : undefined;
  const traceId = typeof candidate.traceId === 'string' ? candidate.traceId : undefined;
  const message = typeof candidate.message === 'string' && candidate.message.trim()
    ? candidate.message.trim().slice(0, 500)
    : 'Lead retrieval failed.';
  const graphError = candidate.name === 'MetaGraphConnectionError'
    || Boolean(code && (httpStatus !== undefined || traceId));

  if (code === '190') {
    return new MetaLeadFetchError({
      code: 'META_LEAD_TOKEN_ERROR', message, retrievalStatus: 'TOKEN_ERROR', permanent: false,
      ...(traceId ? { traceId } : {}), ...(httpStatus !== undefined ? { httpStatus } : {}),
    });
  }
  if (code === '100' || code === '803' || httpStatus === 404) {
    return new MetaLeadFetchError({
      code: 'META_LEAD_NOT_FOUND',
      message: 'Meta lead is unavailable, deleted, expired, or not accessible.',
      retrievalStatus: 'NOT_FOUND', permanent: true,
      ...(traceId ? { traceId } : {}), ...(httpStatus !== undefined ? { httpStatus } : {}),
    });
  }
  if (graphError) {
    return new MetaLeadFetchError({
      code: 'META_LEAD_GRAPH_RETRYABLE', message, retrievalStatus: 'RETRYING', permanent: false,
      ...(traceId ? { traceId } : {}), ...(httpStatus !== undefined ? { httpStatus } : {}),
    });
  }
  return new MetaLeadFetchError({
    code: 'META_LEAD_FETCH_NETWORK_ERROR', message, retrievalStatus: 'RETRYING', permanent: false,
  });
}

export function validateMetaLeadFreshness(input: { createdTime?: string | undefined; now?: Date | undefined; maxAgeSeconds: number }) {
  if (!input.createdTime) return Object.freeze({ ok: true as const, freshnessSeconds: undefined });
  const createdAt = new Date(input.createdTime);
  if (Number.isNaN(createdAt.getTime())) {
    throw new MetaLeadFetchError({
      code: 'META_LEAD_CREATED_TIME_INVALID', message: 'Lead created_time is invalid.',
      retrievalStatus: 'PERMANENT_FAILURE', permanent: true,
    });
  }
  const seconds = Math.floor(((input.now ?? new Date()).getTime() - createdAt.getTime()) / 1_000);
  if (seconds < -300) {
    throw new MetaLeadFetchError({
      code: 'META_LEAD_CREATED_IN_FUTURE', message: 'Lead created_time is too far in the future.',
      retrievalStatus: 'PERMANENT_FAILURE', permanent: true,
    });
  }
  if (seconds > input.maxAgeSeconds) {
    throw new MetaLeadFetchError({
      code: 'META_LEAD_TOO_OLD', message: 'Lead is outside the configured retrieval freshness window.',
      retrievalStatus: 'PERMANENT_FAILURE', permanent: true,
    });
  }
  return Object.freeze({ ok: true as const, freshnessSeconds: Math.max(0, seconds) });
}

export async function fetchMetaLeadWithClient(input: {
  leadgenId: string;
  client: MetaLeadFetchClient;
  now?: Date | undefined;
  maxAgeSeconds: number;
}) {
  try {
    const payload = await input.client.get<MetaLeadProviderPayload>(`/${encodeURIComponent(input.leadgenId)}`, {
      fields: META_LEAD_FETCH_FIELDS.join(','),
    });
    if (!payload?.id || payload.id !== input.leadgenId) {
      throw new MetaLeadFetchError({
        code: 'META_LEAD_ID_MISMATCH', message: 'Retrieved Meta lead ID does not match notification.',
        retrievalStatus: 'PERMANENT_FAILURE', permanent: true,
      });
    }
    const freshness = validateMetaLeadFreshness({
      createdTime: payload.created_time,
      now: input.now,
      maxAgeSeconds: input.maxAgeSeconds,
    });
    return Object.freeze({ payload, freshnessSeconds: freshness.freshnessSeconds });
  } catch (error) {
    throw classifyMetaLeadFetchError(error);
  }
}
