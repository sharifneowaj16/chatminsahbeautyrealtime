import { createHash, randomUUID } from 'node:crypto';
import { MetaInstagramPersistenceError, type InstagramProviderDeliveryStatus, type MetaInstagramScope } from './instagram-messages.ts';

export type InstagramReconciliationStatus = 'NOT_REQUIRED' | 'REQUIRED' | 'IN_PROGRESS' | 'RESOLVED_SENT' | 'RESOLVED_FAILED';
export type InstagramOutboundAttempt = MetaInstagramScope & Readonly<{
  id: string; idempotencyKey: string; payloadHash: string; providerMessageId: string | null;
  providerStatus: InstagramProviderDeliveryStatus; reconciliationStatus: InstagramReconciliationStatus;
  localMessageKey: string; failureCode: string | null;
}>;
export function hashInstagramOutboundPayload(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function key(input: MetaInstagramScope & { idempotencyKey: string }) { return `${input.environment}\u001f${input.connectionKey.trim()}\u001f${input.accountIdentityReferenceId.trim()}\u001f${input.idempotencyKey.trim()}`; }
export function isInstagramWriteOutcomeUnknown(error: unknown) {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '');
  return /timeout|timed out|ECONNRESET|EPIPE|socket hang up|fetch failed|connection reset|UND_ERR/i.test(message);
}
export class InMemoryInstagramOutboundRepository {
  #createId: () => string; #attempts = new Map<string, InstagramOutboundAttempt>(); #providerIds = new Map<string, string>();
  constructor(options: { createId?: () => string } = {}) { this.#createId = options.createId ?? randomUUID; }
  createOrGet(input: MetaInstagramScope & { idempotencyKey: string; payloadHash: string }) {
    const scoped = key(input); const existing = this.#attempts.get(scoped);
    if (existing) { if (existing.payloadHash !== input.payloadHash) throw new MetaInstagramPersistenceError('INSTAGRAM_SEND_IDEMPOTENCY_PAYLOAD_MISMATCH'); return { created: false, attempt: existing }; }
    const attempt = Object.freeze({ id: this.#createId(), environment: input.environment, connectionKey: input.connectionKey.trim(), accountIdentityReferenceId: input.accountIdentityReferenceId.trim(), idempotencyKey: input.idempotencyKey.trim(), payloadHash: input.payloadHash, providerMessageId: null, providerStatus: 'PENDING' as const, reconciliationStatus: 'NOT_REQUIRED' as const, localMessageKey: `outbound:${this.#createId()}`, failureCode: null });
    this.#attempts.set(scoped, attempt); return { created: true, attempt };
  }
  markSent(input: MetaInstagramScope & { idempotencyKey: string; providerMessageId: string }) {
    const scoped = key(input); const row = this.#attempts.get(scoped); if (!row) throw new MetaInstagramPersistenceError('INSTAGRAM_SEND_ATTEMPT_NOT_FOUND');
    const providerKey = `${input.environment}\u001f${input.connectionKey}\u001f${input.accountIdentityReferenceId}\u001f${input.providerMessageId}`;
    const owner = this.#providerIds.get(providerKey); if (owner && owner !== row.id) throw new MetaInstagramPersistenceError('INSTAGRAM_PROVIDER_MESSAGE_ID_CONFLICT');
    this.#providerIds.set(providerKey, row.id); const updated = Object.freeze({ ...row, providerMessageId: input.providerMessageId, providerStatus: 'SENT' as const, reconciliationStatus: 'NOT_REQUIRED' as const }); this.#attempts.set(scoped, updated); return updated;
  }
  markUnknown(input: MetaInstagramScope & { idempotencyKey: string; failureCode?: string }) {
    const scoped = key(input); const row = this.#attempts.get(scoped); if (!row) throw new MetaInstagramPersistenceError('INSTAGRAM_SEND_ATTEMPT_NOT_FOUND');
    const updated = Object.freeze({ ...row, providerStatus: 'UNKNOWN_OUTCOME' as const, reconciliationStatus: 'REQUIRED' as const, failureCode: input.failureCode ?? 'INSTAGRAM_PROVIDER_WRITE_OUTCOME_UNKNOWN' }); this.#attempts.set(scoped, updated); return updated;
  }
  snapshot() { return [...this.#attempts.values()]; }
}
