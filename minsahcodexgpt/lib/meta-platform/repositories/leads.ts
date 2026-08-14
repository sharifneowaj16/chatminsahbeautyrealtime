import { createHmac, randomUUID } from 'node:crypto';
import type { MetaPlatformEnvironment } from '../context/asset-context';

export const META_LEAD_FINGERPRINT_VERSION = 'hmac-sha256:v1' as const;
export const META_LEAD_HANDOFF_DESTINATIONS = Object.freeze([
  'INTERNAL_CRM', 'CUSTOMER', 'CONTACT', 'ORDER', 'ADMIN_ASSIGNMENT',
] as const);
export type MetaLeadHandoffDestination = (typeof META_LEAD_HANDOFF_DESTINATIONS)[number];
export type MetaLeadRetrievalStatus = 'PENDING' | 'FETCHING' | 'RETRYING' | 'FETCHED' | 'NOT_FOUND' | 'TOKEN_ERROR' | 'PERMANENT_FAILURE';
export type MetaLeadDuplicateReason = 'LEADGEN_ID' | 'PHONE' | 'EMAIL';

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,79}$/;
const SECRET_PATTERN = /(access.?token|app.?secret|authorization|cookie|password|signed.?url|raw.?payload|field.?data|email|phone)/i;

function requiredText(value: unknown, code: string, max = 255): string {
  if (typeof value !== 'string') throw new TypeError(code);
  const clean = value.trim();
  if (!clean || clean.length > max) throw new TypeError(code);
  return clean;
}

function optionalId(value: unknown, code: string): string | null {
  if (value === null || value === undefined) return null;
  const clean = requiredText(value, code);
  if (!ID_PATTERN.test(clean)) throw new TypeError(code);
  return clean;
}

export function sanitizeMetaLeadFailure(input: unknown): Readonly<{ code: string; category: string; summary: string }> {
  const candidate = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const rawCode = typeof candidate.code === 'string' ? candidate.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_') : 'META_LEAD_PROCESSING_ERROR';
  const code = SAFE_CODE_PATTERN.test(rawCode) ? rawCode : 'META_LEAD_PROCESSING_ERROR';
  const rawCategory = typeof candidate.category === 'string' ? candidate.category.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_') : 'UNKNOWN';
  const category = SAFE_CODE_PATTERN.test(rawCategory) ? rawCategory : 'UNKNOWN';
  let summary = typeof candidate.summary === 'string' ? candidate.summary : typeof candidate.message === 'string' ? candidate.message : 'Lead processing failed.';
  summary = summary
    .replace(/EA[A-Za-z0-9_-]{20,}/g, '[REDACTED]')
    .replace(/https?:\/\/\S+/g, '[REDACTED_URL]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[REDACTED_PHONE]')
    .trim().slice(0, 500) || 'Lead processing failed.';
  return Object.freeze({ code, category, summary });
}

export function fingerprintMetaLeadIdentity(input: {
  readonly normalizedValue?: string | null;
  readonly secret: string;
  readonly environment: MetaPlatformEnvironment;
  readonly connectionKey: string;
  readonly kind: 'PHONE' | 'EMAIL';
}): string | null {
  if (!input.normalizedValue) return null;
  const secret = requiredText(input.secret, 'META_LEAD_FINGERPRINT_KEY_REQUIRED', 4096);
  const connectionKey = requiredText(input.connectionKey, 'META_LEAD_CONNECTION_KEY_INVALID', 80);
  return createHmac('sha256', secret)
    .update(['meta-lead', META_LEAD_FINGERPRINT_VERSION, input.environment, connectionKey, input.kind, input.normalizedValue].join('\u001f'))
    .digest('hex');
}

export function buildMetaLeadHandoffIdempotencyKey(leadId: string, destination: MetaLeadHandoffDestination): string {
  const id = requiredText(leadId, 'META_LEAD_ID_INVALID');
  if (!META_LEAD_HANDOFF_DESTINATIONS.includes(destination)) throw new TypeError('META_LEAD_HANDOFF_DESTINATION_INVALID');
  return `META_LEAD:${id}:${destination}`;
}

export function sanitizeMetaLeadAttribution(input: Readonly<Record<string, unknown>>): Readonly<Record<string, string | boolean | null>> {
  const allowed = new Set(['pageId', 'formId', 'adId', 'adName', 'adsetId', 'adsetName', 'campaignId', 'campaignName', 'isOrganic', 'platform', 'partnerName', 'retailerItemId']);
  const output: Record<string, string | boolean | null> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.has(key) || SECRET_PATTERN.test(key)) continue;
    if (value === null || typeof value === 'boolean') output[key] = value;
    else if (typeof value === 'string') {
      const clean = value.trim();
      if (clean) output[key] = clean.slice(0, 500);
    }
  }
  return Object.freeze(output);
}

export type MetaLeadAttemptRecord = Readonly<{
  id: string;
  receiptId: string;
  providerLeadId: string;
  environment: MetaPlatformEnvironment;
  connectionKey: string;
  pageId: string | null;
  formId: string | null;
  pageIdentityReferenceId: string | null;
  formIdentityReferenceId: string | null;
  retrievalStatus: MetaLeadRetrievalStatus;
  retrievalAttempt: number;
  normalizedLeadId: string | null;
  duplicateReason: MetaLeadDuplicateReason | null;
  isTestLead: boolean | null;
  failureCode: string | null;
  failureCategory: string | null;
  failureSummary: string | null;
}>;

export type MetaLeadStorageRecord = Readonly<{
  id: string;
  providerLeadId: string;
  environment: MetaPlatformEnvironment;
  connectionKey: string;
  pageId: string | null;
  formId: string | null;
  pageIdentityReferenceId: string | null;
  formIdentityReferenceId: string | null;
  phoneFingerprint: string | null;
  emailFingerprint: string | null;
  fingerprintVersion: typeof META_LEAD_FINGERPRINT_VERSION | null;
  isTestLead: boolean | null;
}>;

export type MetaLeadHandoffRecord = Readonly<{
  id: string;
  leadId: string;
  destination: MetaLeadHandoffDestination;
  idempotencyKey: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'BLOCKED';
}>;

export class MetaLeadStorageError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.name = 'MetaLeadStorageError'; this.code = code; }
}

export class InMemoryMetaLeadStorageRepository {
  readonly #createId: () => string;
  readonly #attempts = new Map<string, MetaLeadAttemptRecord>();
  readonly #leadsById = new Map<string, MetaLeadStorageRecord>();
  readonly #leadIdByProvider = new Map<string, string>();
  readonly #leadIdByPhone = new Map<string, string>();
  readonly #leadIdByEmail = new Map<string, string>();
  readonly #receiptLead = new Map<string, string>();
  readonly #handoffs = new Map<string, MetaLeadHandoffRecord>();

  constructor(input: { createId?: () => string } = {}) { this.#createId = input.createId ?? randomUUID; }

  beginAttempt(input: {
    receiptId: string; providerLeadId: string; environment: MetaPlatformEnvironment; connectionKey: string;
    pageId?: string | null; formId?: string | null; pageIdentityReferenceId?: string | null; formIdentityReferenceId?: string | null;
  }): MetaLeadAttemptRecord {
    const receiptId = requiredText(input.receiptId, 'META_LEAD_RECEIPT_ID_INVALID');
    const providerLeadId = requiredText(input.providerLeadId, 'META_LEAD_PROVIDER_ID_INVALID');
    const existing = this.#attempts.get(receiptId);
    if (existing) {
      if (existing.providerLeadId !== providerLeadId || existing.environment !== input.environment || existing.connectionKey !== input.connectionKey.trim()) {
        throw new MetaLeadStorageError('META_LEAD_ATTEMPT_RECEIPT_CONFLICT');
      }
      return existing;
    }
    const row: MetaLeadAttemptRecord = Object.freeze({
      id: this.#createId(), receiptId, providerLeadId, environment: input.environment,
      connectionKey: requiredText(input.connectionKey, 'META_LEAD_CONNECTION_KEY_INVALID', 80),
      pageId: optionalId(input.pageId, 'META_LEAD_PAGE_ID_INVALID'), formId: optionalId(input.formId, 'META_LEAD_FORM_ID_INVALID'),
      pageIdentityReferenceId: optionalId(input.pageIdentityReferenceId, 'META_LEAD_PAGE_IDENTITY_INVALID'),
      formIdentityReferenceId: optionalId(input.formIdentityReferenceId, 'META_LEAD_FORM_IDENTITY_INVALID'),
      retrievalStatus: 'PENDING', retrievalAttempt: 0, normalizedLeadId: null, duplicateReason: null,
      isTestLead: null, failureCode: null, failureCategory: null, failureSummary: null,
    });
    this.#attempts.set(receiptId, row);
    return row;
  }

  markFetching(receiptId: string): MetaLeadAttemptRecord {
    const row = this.#attempts.get(receiptId);
    if (!row) throw new MetaLeadStorageError('META_LEAD_ATTEMPT_NOT_FOUND');
    if (!['PENDING', 'RETRYING', 'TOKEN_ERROR'].includes(row.retrievalStatus)) throw new MetaLeadStorageError('META_LEAD_RETRIEVAL_TRANSITION_INVALID');
    const next = Object.freeze({ ...row, retrievalStatus: 'FETCHING' as const, retrievalAttempt: row.retrievalAttempt + 1, failureCode: null, failureCategory: null, failureSummary: null });
    this.#attempts.set(receiptId, next); return next;
  }

  markFailure(receiptId: string, status: Exclude<MetaLeadRetrievalStatus, 'PENDING' | 'FETCHING' | 'FETCHED'>, error: unknown): MetaLeadAttemptRecord {
    const row = this.#attempts.get(receiptId);
    if (!row) throw new MetaLeadStorageError('META_LEAD_ATTEMPT_NOT_FOUND');
    const safe = sanitizeMetaLeadFailure(error);
    const next = Object.freeze({ ...row, retrievalStatus: status, failureCode: safe.code, failureCategory: safe.category, failureSummary: safe.summary });
    this.#attempts.set(receiptId, next); return next;
  }

  persist(input: {
    receiptId: string; providerLeadId: string; environment: MetaPlatformEnvironment; connectionKey: string;
    pageId?: string | null; formId?: string | null; pageIdentityReferenceId?: string | null; formIdentityReferenceId?: string | null;
    phoneFingerprint?: string | null; emailFingerprint?: string | null; isTestLead?: boolean | null;
    destination?: MetaLeadHandoffDestination;
  }): Readonly<{ lead: MetaLeadStorageRecord; created: boolean; duplicate: boolean; duplicateReason: MetaLeadDuplicateReason | null; handoff: MetaLeadHandoffRecord }> {
    const attempt = this.#attempts.get(input.receiptId);
    if (!attempt) throw new MetaLeadStorageError('META_LEAD_ATTEMPT_NOT_FOUND');
    if (attempt.providerLeadId !== input.providerLeadId) throw new MetaLeadStorageError('META_LEAD_ATTEMPT_PROVIDER_MISMATCH');
    if (attempt.environment !== input.environment || attempt.connectionKey !== input.connectionKey.trim()) throw new MetaLeadStorageError('META_LEAD_ATTEMPT_SCOPE_MISMATCH');
    const existingReceiptLead = this.#receiptLead.get(input.receiptId);
    const byProvider = this.#leadIdByProvider.get(input.providerLeadId);
    const byPhone = input.phoneFingerprint ? this.#leadIdByPhone.get(input.phoneFingerprint) : undefined;
    const byEmail = input.emailFingerprint ? this.#leadIdByEmail.get(input.emailFingerprint) : undefined;
    const leadId = byProvider ?? byPhone ?? byEmail ?? this.#createId();
    if (existingReceiptLead && existingReceiptLead !== leadId) throw new MetaLeadStorageError('META_LEAD_RECEIPT_LINK_CONFLICT');
    const reason: MetaLeadDuplicateReason | null = byProvider ? 'LEADGEN_ID' : byPhone ? 'PHONE' : byEmail ? 'EMAIL' : null;
    let lead = this.#leadsById.get(leadId);
    const created = !lead;
    if (!lead) {
      lead = Object.freeze({
        id: leadId, providerLeadId: input.providerLeadId, environment: input.environment,
        connectionKey: requiredText(input.connectionKey, 'META_LEAD_CONNECTION_KEY_INVALID', 80),
        pageId: optionalId(input.pageId, 'META_LEAD_PAGE_ID_INVALID'), formId: optionalId(input.formId, 'META_LEAD_FORM_ID_INVALID'),
        pageIdentityReferenceId: optionalId(input.pageIdentityReferenceId, 'META_LEAD_PAGE_IDENTITY_INVALID'),
        formIdentityReferenceId: optionalId(input.formIdentityReferenceId, 'META_LEAD_FORM_IDENTITY_INVALID'),
        phoneFingerprint: input.phoneFingerprint ?? null, emailFingerprint: input.emailFingerprint ?? null,
        fingerprintVersion: input.phoneFingerprint || input.emailFingerprint ? META_LEAD_FINGERPRINT_VERSION : null,
        isTestLead: input.isTestLead ?? null,
      });
      this.#leadsById.set(leadId, lead);
      this.#leadIdByProvider.set(input.providerLeadId, leadId);
      if (input.phoneFingerprint) this.#leadIdByPhone.set(input.phoneFingerprint, leadId);
      if (input.emailFingerprint) this.#leadIdByEmail.set(input.emailFingerprint, leadId);
    }
    this.#receiptLead.set(input.receiptId, leadId);
    const completedAttempt = Object.freeze({ ...attempt, retrievalStatus: 'FETCHED' as const, normalizedLeadId: leadId, duplicateReason: reason, isTestLead: input.isTestLead ?? null, failureCode: null, failureCategory: null, failureSummary: null });
    this.#attempts.set(input.receiptId, completedAttempt);
    const destination = input.destination ?? 'INTERNAL_CRM';
    const key = buildMetaLeadHandoffIdempotencyKey(leadId, destination);
    let handoff = this.#handoffs.get(key);
    if (!handoff) {
      handoff = Object.freeze({ id: this.#createId(), leadId, destination, idempotencyKey: key, status: 'PENDING' as const });
      this.#handoffs.set(key, handoff);
    }
    return Object.freeze({ lead, created, duplicate: reason !== null, duplicateReason: reason, handoff });
  }

  getAttempt(receiptId: string) { return this.#attempts.get(receiptId) ?? null; }
  getReceiptLead(receiptId: string) { return this.#receiptLead.get(receiptId) ?? null; }
  snapshot() { return Object.freeze({ attempts: [...this.#attempts.values()], leads: [...this.#leadsById.values()], handoffs: [...this.#handoffs.values()] }); }
}
