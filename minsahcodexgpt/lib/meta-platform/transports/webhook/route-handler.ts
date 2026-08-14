import { verifyMetaWebhookChallenge, type MetaWebhookChallengeResult } from './challenge';
import { digestMetaWebhookPayload, verifyMetaWebhookSignature } from './signature';
import type { MetaWebhookSignatureFailureCode } from './types';

export const META_WEBHOOK_DEFAULT_MAX_BYTES = 1_000_000;
const META_WEBHOOK_ABSOLUTE_MAX_BYTES = 10 * 1024 * 1024;
const META_WEBHOOK_MIN_MAX_BYTES = 1_024;

export interface MetaWebhookRequestLike {
  readonly headers: {
    get(name: string): string | null;
  };
  text(): Promise<string>;
}

export interface MetaWebhookSearchParamsLike {
  get(name: string): string | null;
}

export type MetaWebhookRequestFailureCode =
  | 'CONTENT_LENGTH_INVALID'
  | 'PAYLOAD_TOO_LARGE'
  | 'BODY_READ_FAILED'
  | MetaWebhookSignatureFailureCode;

export type MetaWebhookVerifiedRequest = Readonly<{
  ok: true;
  rawBody: string;
  byteLength: number;
  payloadDigest: string;
  signatureAlgorithm: 'sha256';
}>;

export type MetaWebhookRejectedRequest = Readonly<{
  ok: false;
  code: MetaWebhookRequestFailureCode;
  httpStatus: 400 | 401 | 413 | 503;
  payloadDigest?: string;
}>;

export type MetaWebhookRequestVerificationResult = MetaWebhookVerifiedRequest | MetaWebhookRejectedRequest;

function boundedMaxBytes(value: number | undefined): number {
  if (!Number.isSafeInteger(value) || (value ?? 0) <= 0) return META_WEBHOOK_DEFAULT_MAX_BYTES;
  return Math.min(Math.max(value as number, META_WEBHOOK_MIN_MAX_BYTES), META_WEBHOOK_ABSOLUTE_MAX_BYTES);
}

function declaredContentLength(value: string | null): number | null | 'INVALID' {
  if (value === null || value.trim() === '') return null;
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return 'INVALID';
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 'INVALID';
}

function signatureFailureStatus(code: MetaWebhookSignatureFailureCode): 401 | 503 {
  return code === 'APP_SECRET_MISSING' ? 503 : 401;
}

export function metaWebhookRequestFailureMessage(code: MetaWebhookRequestFailureCode): string {
  if (code === 'PAYLOAD_TOO_LARGE') return 'Webhook payload too large';
  if (code === 'APP_SECRET_MISSING') return 'Webhook verification unavailable';
  if (code === 'CONTENT_LENGTH_INVALID' || code === 'BODY_READ_FAILED') return 'Invalid webhook request';
  return 'Invalid webhook signature';
}

export function verifyMetaWebhookChallengeRequest(input: {
  readonly searchParams: MetaWebhookSearchParamsLike;
  readonly expectedToken?: string | null;
}): MetaWebhookChallengeResult {
  return verifyMetaWebhookChallenge({
    mode: input.searchParams.get('hub.mode'),
    token: input.searchParams.get('hub.verify_token'),
    challenge: input.searchParams.get('hub.challenge'),
    expectedToken: input.expectedToken,
  });
}

export async function readAndVerifyMetaWebhookRequest(input: {
  readonly request: MetaWebhookRequestLike;
  readonly appSecret?: string | null;
  readonly maxBytes?: number;
}): Promise<MetaWebhookRequestVerificationResult> {
  const maxBytes = boundedMaxBytes(input.maxBytes);
  const contentLength = declaredContentLength(input.request.headers.get('content-length'));
  if (contentLength === 'INVALID') {
    return Object.freeze({ ok: false, code: 'CONTENT_LENGTH_INVALID', httpStatus: 400 });
  }
  if (contentLength !== null && contentLength > maxBytes) {
    return Object.freeze({ ok: false, code: 'PAYLOAD_TOO_LARGE', httpStatus: 413 });
  }

  let rawBody: string;
  try {
    rawBody = await input.request.text();
  } catch {
    return Object.freeze({ ok: false, code: 'BODY_READ_FAILED', httpStatus: 400 });
  }

  const byteLength = Buffer.byteLength(rawBody, 'utf8');
  if (byteLength > maxBytes) {
    return Object.freeze({ ok: false, code: 'PAYLOAD_TOO_LARGE', httpStatus: 413 });
  }

  const payloadDigest = digestMetaWebhookPayload(rawBody);
  const signature = verifyMetaWebhookSignature({
    rawBody,
    signatureHeader: input.request.headers.get('x-hub-signature-256'),
    appSecret: input.appSecret,
  });
  if (!signature.ok) {
    return Object.freeze({
      ok: false,
      code: signature.code,
      httpStatus: signatureFailureStatus(signature.code),
      payloadDigest,
    });
  }

  return Object.freeze({
    ok: true,
    rawBody,
    byteLength,
    payloadDigest,
    signatureAlgorithm: signature.algorithm,
  });
}
