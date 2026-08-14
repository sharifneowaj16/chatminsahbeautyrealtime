import { createHash } from 'node:crypto';

import {
  META_INSTAGRAM_ATTACHMENT_TYPES,
  type MetaInstagramAttachmentType,
  type MetaNormalizedInstagramAttachment,
} from '../contracts/instagram.ts';
import { isMetaMediaMimeAllowed, normalizeMetaMediaMimeType } from '../transports/media/mime.ts';
import { parseAndValidateMetaMediaUrl } from '../transports/media/url-policy.ts';

export const META_SOCIAL_ATTACHMENT_POLICY_SCHEMA_VERSION = 1 as const;
export const META_SOCIAL_ATTACHMENT_POLICY_ID = 'META_SOCIAL_ATTACHMENT_V1' as const;
export const META_SOCIAL_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

export const META_SOCIAL_ATTACHMENT_STAGES = [
  'METADATA',
  'DOWNLOADED',
  'SCANNED',
  'STORED',
] as const;

export const META_SOCIAL_ATTACHMENT_DECISIONS = [
  'ALLOWED',
  'QUARANTINED',
  'BLOCKED',
] as const;

export const META_SOCIAL_ATTACHMENT_SCAN_RESULTS = [
  'NOT_RUN',
  'CLEAN',
  'INFECTED',
  'FAILED',
] as const;

export const META_SOCIAL_ATTACHMENT_REASONS = [
  'MEDIA_READY',
  'MEDIA_DOWNLOAD_VALIDATION_REQUIRED',
  'MEDIA_SCAN_REQUIRED',
  'MEDIA_STORAGE_VERIFICATION_REQUIRED',
  'MEDIA_URL_REQUIRED',
  'MEDIA_URL_REJECTED',
  'MEDIA_TYPE_UNSUPPORTED',
  'MEDIA_FILE_NAME_REJECTED',
  'MEDIA_DECLARED_SIZE_BLOCKED',
  'MEDIA_ACTUAL_SIZE_REQUIRED',
  'MEDIA_ACTUAL_SIZE_BLOCKED',
  'MEDIA_MIME_REQUIRED',
  'MEDIA_MIME_BLOCKED',
  'MEDIA_TYPE_MIME_MISMATCH',
  'MEDIA_MIME_MISMATCH',
  'MEDIA_DIGEST_REQUIRED',
  'MEDIA_SCAN_INFECTED',
  'MEDIA_SCAN_FAILED',
  'MEDIA_STAGE_STATE_INVALID',
] as const;

export type MetaSocialAttachmentStage = (typeof META_SOCIAL_ATTACHMENT_STAGES)[number];
export type MetaSocialAttachmentDecisionStatus = (typeof META_SOCIAL_ATTACHMENT_DECISIONS)[number];
export type MetaSocialAttachmentScanResult = (typeof META_SOCIAL_ATTACHMENT_SCAN_RESULTS)[number];
export type MetaSocialAttachmentReason = (typeof META_SOCIAL_ATTACHMENT_REASONS)[number];

export interface EvaluateMetaSocialAttachmentPolicyInput {
  readonly attachment: MetaNormalizedInstagramAttachment;
  readonly stage?: unknown;
  readonly evaluatedAt: unknown;
  readonly actualMimeType?: unknown;
  readonly actualSize?: unknown;
  readonly contentDigest?: unknown;
  readonly scanResult?: unknown;
  readonly storageVerified?: unknown;
}

export interface MetaSocialAttachmentPolicyDecision {
  readonly schemaVersion: typeof META_SOCIAL_ATTACHMENT_POLICY_SCHEMA_VERSION;
  readonly provider: 'META';
  readonly policyId: typeof META_SOCIAL_ATTACHMENT_POLICY_ID;
  readonly decisionKey: string;
  readonly attachmentKey: string;
  readonly stage: MetaSocialAttachmentStage;
  readonly decision: MetaSocialAttachmentDecisionStatus;
  readonly allowed: boolean;
  readonly quarantined: boolean;
  readonly reason: MetaSocialAttachmentReason;
  readonly evaluatedAt: string;
  readonly declaredType: MetaInstagramAttachmentType;
  readonly declaredMimeType: string | null;
  readonly effectiveMimeType: string | null;
  readonly declaredSize: number | null;
  readonly actualSize: number | null;
  readonly maxBytes: typeof META_SOCIAL_ATTACHMENT_MAX_BYTES;
  readonly sourceHost: string | null;
  readonly contentDigest: string | null;
  readonly scanResult: MetaSocialAttachmentScanResult;
  readonly storageVerified: boolean;
  readonly requiresDownloadValidation: boolean;
  readonly requiresMalwareScan: boolean;
  readonly requiresStorageVerification: boolean;
}

const ATTACHMENT_KEYS = new Set([
  'attachmentKey',
  'externalId',
  'type',
  'url',
  'mimeType',
  'fileName',
  'fileSize',
  'thumbnailUrl',
]);

const DECISION_KEYS = new Set([
  'schemaVersion',
  'provider',
  'policyId',
  'decisionKey',
  'attachmentKey',
  'stage',
  'decision',
  'allowed',
  'quarantined',
  'reason',
  'evaluatedAt',
  'declaredType',
  'declaredMimeType',
  'effectiveMimeType',
  'declaredSize',
  'actualSize',
  'maxBytes',
  'sourceHost',
  'contentDigest',
  'scanResult',
  'storageVerified',
  'requiresDownloadValidation',
  'requiresMalwareScan',
  'requiresStorageVerification',
]);

const ALLOWED_EXACT_MIME_TYPES = Object.freeze(['application/pdf', 'application/octet-stream']);
const ALLOWED_MIME_PREFIXES = Object.freeze(['image/', 'video/', 'audio/']);
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const ATTACHMENT_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,1024}$/;
const HOST_PATTERN = /^[a-z0-9.-]{1,253}$/;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: Readonly<Record<string, unknown>>, allowed: ReadonlySet<string>): boolean {
  const keys = Object.keys(value);
  return keys.length === allowed.size && keys.every((key) => allowed.has(key));
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], code: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw new TypeError(code);
  return value as T;
}

function optionalString(value: unknown, code: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new TypeError(code);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) throw new TypeError(code);
  return normalized;
}

function dateValue(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new TypeError('META_ATTACHMENT_POLICY_EVALUATED_AT_INVALID');
  return date.toISOString();
}

function optionalSize(value: unknown, code: string): number | null {
  if (value === undefined || value === null || value === '') return null;
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) throw new TypeError(code);
  return normalized;
}

function optionalBoolean(value: unknown, code: string, fallback = false): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'boolean') throw new TypeError(code);
  return value;
}

function optionalDigest(value: unknown): string | null {
  const normalized = optionalString(value, 'META_ATTACHMENT_POLICY_DIGEST_INVALID', 64)?.toLowerCase() ?? null;
  if (normalized !== null && !DIGEST_PATTERN.test(normalized)) {
    throw new TypeError('META_ATTACHMENT_POLICY_DIGEST_INVALID');
  }
  return normalized;
}

function normalizeDeclaredMime(value: string | null): string | null {
  if (value === null) return null;
  return normalizeMetaMediaMimeType(value);
}

function mimeMatchesType(type: MetaInstagramAttachmentType, mimeType: string): boolean {
  if (mimeType === 'application/octet-stream') return true;
  if (type === 'IMAGE') return mimeType.startsWith('image/');
  if (type === 'VIDEO') return mimeType.startsWith('video/');
  if (type === 'AUDIO') return mimeType.startsWith('audio/');
  if (type === 'FILE') return mimeType === 'application/pdf' || mimeType === 'application/octet-stream';
  return false;
}

function isSafeFileName(value: string | null): boolean {
  if (value === null) return true;
  return !/[\\/\u0000-\u001f\u007f]/.test(value)
    && value !== '.'
    && value !== '..'
    && !value.includes('..');
}

function assertAttachment(value: unknown): asserts value is MetaNormalizedInstagramAttachment {
  if (!isRecord(value)
    || !hasExactKeys(value, ATTACHMENT_KEYS)
    || typeof value.attachmentKey !== 'string'
    || !ATTACHMENT_KEY_PATTERN.test(value.attachmentKey)
    || (value.externalId !== null && typeof value.externalId !== 'string')
    || typeof value.type !== 'string'
    || !META_INSTAGRAM_ATTACHMENT_TYPES.includes(value.type as MetaInstagramAttachmentType)
    || (value.url !== null && typeof value.url !== 'string')
    || (value.mimeType !== null && typeof value.mimeType !== 'string')
    || (value.fileName !== null && typeof value.fileName !== 'string')
    || (value.fileSize !== null
      && (typeof value.fileSize !== 'number' || !Number.isSafeInteger(value.fileSize) || value.fileSize < 0))
    || (value.thumbnailUrl !== null && typeof value.thumbnailUrl !== 'string')) {
    throw new TypeError('META_ATTACHMENT_POLICY_ATTACHMENT_INVALID');
  }
}

function createDecisionKey(input: Omit<MetaSocialAttachmentPolicyDecision, 'decisionKey'>): string {
  const fingerprint = [
    input.policyId,
    input.attachmentKey,
    input.stage,
    input.decision,
    input.reason,
    input.evaluatedAt,
    input.declaredType,
    input.declaredMimeType ?? '',
    input.effectiveMimeType ?? '',
    input.declaredSize ?? '',
    input.actualSize ?? '',
    input.sourceHost ?? '',
    input.contentDigest ?? '',
    input.scanResult,
    String(input.storageVerified),
  ].join('|');
  return createHash('sha256').update(fingerprint).digest('hex');
}

function decision(input: {
  readonly attachment: MetaNormalizedInstagramAttachment;
  readonly stage: MetaSocialAttachmentStage;
  readonly status: MetaSocialAttachmentDecisionStatus;
  readonly reason: MetaSocialAttachmentReason;
  readonly evaluatedAt: string;
  readonly declaredMimeType: string | null;
  readonly effectiveMimeType: string | null;
  readonly actualSize: number | null;
  readonly sourceHost: string | null;
  readonly contentDigest: string | null;
  readonly scanResult: MetaSocialAttachmentScanResult;
  readonly storageVerified: boolean;
}): MetaSocialAttachmentPolicyDecision {
  const base = Object.freeze({
    schemaVersion: META_SOCIAL_ATTACHMENT_POLICY_SCHEMA_VERSION,
    provider: 'META' as const,
    policyId: META_SOCIAL_ATTACHMENT_POLICY_ID,
    attachmentKey: input.attachment.attachmentKey,
    stage: input.stage,
    decision: input.status,
    allowed: input.status === 'ALLOWED',
    quarantined: input.status === 'QUARANTINED',
    reason: input.reason,
    evaluatedAt: input.evaluatedAt,
    declaredType: input.attachment.type,
    declaredMimeType: input.declaredMimeType,
    effectiveMimeType: input.effectiveMimeType,
    declaredSize: input.attachment.fileSize,
    actualSize: input.actualSize,
    maxBytes: META_SOCIAL_ATTACHMENT_MAX_BYTES,
    sourceHost: input.sourceHost,
    contentDigest: input.contentDigest,
    scanResult: input.scanResult,
    storageVerified: input.storageVerified,
    requiresDownloadValidation: input.stage === 'METADATA',
    requiresMalwareScan: input.stage === 'METADATA' || input.stage === 'DOWNLOADED',
    requiresStorageVerification: input.stage !== 'STORED' || !input.storageVerified,
  });
  return Object.freeze({ ...base, decisionKey: createDecisionKey(base) });
}

export function evaluateMetaSocialAttachmentPolicy(
  input: EvaluateMetaSocialAttachmentPolicyInput,
): MetaSocialAttachmentPolicyDecision {
  assertAttachment(input.attachment);
  const attachment = input.attachment;
  const stage = input.stage === undefined
    ? 'METADATA'
    : enumValue(input.stage, META_SOCIAL_ATTACHMENT_STAGES, 'META_ATTACHMENT_POLICY_STAGE_INVALID');
  const evaluatedAt = dateValue(input.evaluatedAt);
  const actualMimeType = optionalString(input.actualMimeType, 'META_ATTACHMENT_POLICY_ACTUAL_MIME_INVALID', 160);
  const effectiveMimeType = actualMimeType === null ? null : normalizeMetaMediaMimeType(actualMimeType);
  const actualSize = optionalSize(input.actualSize, 'META_ATTACHMENT_POLICY_ACTUAL_SIZE_INVALID');
  const contentDigest = optionalDigest(input.contentDigest);
  const scanResult = input.scanResult === undefined
    ? 'NOT_RUN'
    : enumValue(input.scanResult, META_SOCIAL_ATTACHMENT_SCAN_RESULTS, 'META_ATTACHMENT_POLICY_SCAN_RESULT_INVALID');
  const storageVerified = optionalBoolean(input.storageVerified, 'META_ATTACHMENT_POLICY_STORAGE_VERIFIED_INVALID');
  const declaredMimeType = normalizeDeclaredMime(attachment.mimeType);

  let sourceHost: string | null = null;
  if (!attachment.url) {
    return decision({ attachment, stage, status: 'BLOCKED', reason: 'MEDIA_URL_REQUIRED', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
  }
  try {
    sourceHost = parseAndValidateMetaMediaUrl(attachment.url).hostname.toLowerCase();
  } catch {
    return decision({ attachment, stage, status: 'BLOCKED', reason: 'MEDIA_URL_REJECTED', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
  }

  if (attachment.type === 'UNKNOWN') {
    return decision({ attachment, stage, status: 'BLOCKED', reason: 'MEDIA_TYPE_UNSUPPORTED', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
  }
  if (!isSafeFileName(attachment.fileName)) {
    return decision({ attachment, stage, status: 'BLOCKED', reason: 'MEDIA_FILE_NAME_REJECTED', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
  }
  if (attachment.fileSize !== null && attachment.fileSize > META_SOCIAL_ATTACHMENT_MAX_BYTES) {
    return decision({ attachment, stage, status: 'BLOCKED', reason: 'MEDIA_DECLARED_SIZE_BLOCKED', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
  }
  if (declaredMimeType !== null
    && !isMetaMediaMimeAllowed({ mimeType: declaredMimeType, allowedMimeTypes: ALLOWED_EXACT_MIME_TYPES, allowedMimePrefixes: ALLOWED_MIME_PREFIXES })) {
    return decision({ attachment, stage, status: 'BLOCKED', reason: 'MEDIA_MIME_BLOCKED', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
  }
  if (declaredMimeType !== null && !mimeMatchesType(attachment.type, declaredMimeType)) {
    return decision({ attachment, stage, status: 'BLOCKED', reason: 'MEDIA_TYPE_MIME_MISMATCH', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
  }

  if (stage === 'METADATA') {
    if (actualSize !== null || effectiveMimeType !== null || contentDigest !== null || scanResult !== 'NOT_RUN' || storageVerified) {
      return decision({ attachment, stage, status: 'BLOCKED', reason: 'MEDIA_STAGE_STATE_INVALID', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
    }
    return decision({ attachment, stage, status: 'QUARANTINED', reason: 'MEDIA_DOWNLOAD_VALIDATION_REQUIRED', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
  }

  if (actualSize === null || actualSize === 0) {
    return decision({ attachment, stage, status: 'BLOCKED', reason: 'MEDIA_ACTUAL_SIZE_REQUIRED', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
  }
  if (actualSize > META_SOCIAL_ATTACHMENT_MAX_BYTES) {
    return decision({ attachment, stage, status: 'BLOCKED', reason: 'MEDIA_ACTUAL_SIZE_BLOCKED', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
  }
  if (effectiveMimeType === null) {
    return decision({ attachment, stage, status: 'BLOCKED', reason: 'MEDIA_MIME_REQUIRED', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
  }
  if (!isMetaMediaMimeAllowed({ mimeType: effectiveMimeType, allowedMimeTypes: ALLOWED_EXACT_MIME_TYPES, allowedMimePrefixes: ALLOWED_MIME_PREFIXES })) {
    return decision({ attachment, stage, status: 'BLOCKED', reason: 'MEDIA_MIME_BLOCKED', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
  }
  if (!mimeMatchesType(attachment.type, effectiveMimeType)) {
    return decision({ attachment, stage, status: 'BLOCKED', reason: 'MEDIA_TYPE_MIME_MISMATCH', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
  }
  if (declaredMimeType !== null
    && declaredMimeType !== 'application/octet-stream'
    && declaredMimeType !== effectiveMimeType) {
    return decision({ attachment, stage, status: 'BLOCKED', reason: 'MEDIA_MIME_MISMATCH', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
  }
  if (contentDigest === null) {
    return decision({ attachment, stage, status: 'BLOCKED', reason: 'MEDIA_DIGEST_REQUIRED', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
  }

  if (stage === 'DOWNLOADED') {
    if (scanResult !== 'NOT_RUN' || storageVerified) {
      return decision({ attachment, stage, status: 'BLOCKED', reason: 'MEDIA_STAGE_STATE_INVALID', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
    }
    return decision({ attachment, stage, status: 'QUARANTINED', reason: 'MEDIA_SCAN_REQUIRED', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
  }

  if (scanResult === 'INFECTED') {
    return decision({ attachment, stage, status: 'BLOCKED', reason: 'MEDIA_SCAN_INFECTED', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
  }
  if (scanResult === 'FAILED') {
    return decision({ attachment, stage, status: 'QUARANTINED', reason: 'MEDIA_SCAN_FAILED', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
  }
  if (scanResult !== 'CLEAN') {
    return decision({ attachment, stage, status: 'QUARANTINED', reason: 'MEDIA_SCAN_REQUIRED', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
  }

  if (stage === 'SCANNED') {
    if (storageVerified) {
      return decision({ attachment, stage, status: 'BLOCKED', reason: 'MEDIA_STAGE_STATE_INVALID', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
    }
    return decision({ attachment, stage, status: 'QUARANTINED', reason: 'MEDIA_STORAGE_VERIFICATION_REQUIRED', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
  }

  if (!storageVerified) {
    return decision({ attachment, stage, status: 'QUARANTINED', reason: 'MEDIA_STORAGE_VERIFICATION_REQUIRED', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
  }
  return decision({ attachment, stage, status: 'ALLOWED', reason: 'MEDIA_READY', evaluatedAt, declaredMimeType, effectiveMimeType, actualSize, sourceHost, contentDigest, scanResult, storageVerified });
}

export function isMetaSocialAttachmentPolicyDecision(
  value: unknown,
): value is MetaSocialAttachmentPolicyDecision {
  if (!isRecord(value)
    || !hasExactKeys(value, DECISION_KEYS)
    || value.schemaVersion !== META_SOCIAL_ATTACHMENT_POLICY_SCHEMA_VERSION
    || value.provider !== 'META'
    || value.policyId !== META_SOCIAL_ATTACHMENT_POLICY_ID
    || typeof value.decisionKey !== 'string'
    || !DIGEST_PATTERN.test(value.decisionKey)
    || typeof value.attachmentKey !== 'string'
    || !ATTACHMENT_KEY_PATTERN.test(value.attachmentKey)
    || typeof value.stage !== 'string'
    || !META_SOCIAL_ATTACHMENT_STAGES.includes(value.stage as MetaSocialAttachmentStage)
    || typeof value.decision !== 'string'
    || !META_SOCIAL_ATTACHMENT_DECISIONS.includes(value.decision as MetaSocialAttachmentDecisionStatus)
    || typeof value.allowed !== 'boolean'
    || typeof value.quarantined !== 'boolean'
    || typeof value.reason !== 'string'
    || !META_SOCIAL_ATTACHMENT_REASONS.includes(value.reason as MetaSocialAttachmentReason)
    || typeof value.evaluatedAt !== 'string'
    || Number.isNaN(new Date(value.evaluatedAt).getTime())
    || typeof value.declaredType !== 'string'
    || !META_INSTAGRAM_ATTACHMENT_TYPES.includes(value.declaredType as MetaInstagramAttachmentType)
    || (value.declaredMimeType !== null && typeof value.declaredMimeType !== 'string')
    || (value.effectiveMimeType !== null && typeof value.effectiveMimeType !== 'string')
    || (value.declaredSize !== null && (typeof value.declaredSize !== 'number' || !Number.isSafeInteger(value.declaredSize) || value.declaredSize < 0))
    || (value.actualSize !== null && (typeof value.actualSize !== 'number' || !Number.isSafeInteger(value.actualSize) || value.actualSize < 0))
    || value.maxBytes !== META_SOCIAL_ATTACHMENT_MAX_BYTES
    || (value.sourceHost !== null && (typeof value.sourceHost !== 'string' || !HOST_PATTERN.test(value.sourceHost)))
    || (value.contentDigest !== null && (typeof value.contentDigest !== 'string' || !DIGEST_PATTERN.test(value.contentDigest)))
    || typeof value.scanResult !== 'string'
    || !META_SOCIAL_ATTACHMENT_SCAN_RESULTS.includes(value.scanResult as MetaSocialAttachmentScanResult)
    || typeof value.storageVerified !== 'boolean'
    || typeof value.requiresDownloadValidation !== 'boolean'
    || typeof value.requiresMalwareScan !== 'boolean'
    || typeof value.requiresStorageVerification !== 'boolean') {
    return false;
  }

  if (value.allowed !== (value.decision === 'ALLOWED')
    || value.quarantined !== (value.decision === 'QUARANTINED')
    || value.requiresDownloadValidation !== (value.stage === 'METADATA')
    || value.requiresMalwareScan !== (value.stage === 'METADATA' || value.stage === 'DOWNLOADED')
    || value.requiresStorageVerification !== (value.stage !== 'STORED' || !value.storageVerified)) {
    return false;
  }

  const { decisionKey, ...base } = value as unknown as MetaSocialAttachmentPolicyDecision;
  return createDecisionKey(base) === decisionKey;
}
