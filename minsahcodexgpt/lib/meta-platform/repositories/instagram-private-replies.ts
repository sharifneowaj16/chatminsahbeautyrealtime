import { randomUUID } from 'node:crypto';
import { MetaInstagramPersistenceError, type InstagramPrivateReplyStatus, type MetaInstagramScope } from './instagram-messages.ts';
export type InstagramPrivateReplyReservation = MetaInstagramScope & Readonly<{ id: string; sourceCommentId: string; sourceMessageId: string; status: InstagramPrivateReplyStatus; expiresAt: Date; providerMessageId: string | null }>;
function key(input: MetaInstagramScope & { sourceCommentId: string }) { return `${input.environment}\u001f${input.connectionKey.trim()}\u001f${input.accountIdentityReferenceId.trim()}\u001f${input.sourceCommentId.trim()}`; }
export class InMemoryInstagramPrivateReplyRepository {
  #createId: () => string; #rows = new Map<string, InstagramPrivateReplyReservation>();
  constructor(options: { createId?: () => string } = {}) { this.#createId = options.createId ?? randomUUID; }
  reserve(input: MetaInstagramScope & { sourceCommentId: string; sourceMessageId: string; expiresAt: Date; now?: Date }) {
    const now = input.now ?? new Date(); if (input.expiresAt <= now) throw new MetaInstagramPersistenceError('INSTAGRAM_PRIVATE_REPLY_WINDOW_EXPIRED');
    const scoped = key(input); const existing = this.#rows.get(scoped); if (existing) throw new MetaInstagramPersistenceError('INSTAGRAM_PRIVATE_REPLY_ALREADY_RESERVED');
    const row = Object.freeze({ id: this.#createId(), environment: input.environment, connectionKey: input.connectionKey.trim(), accountIdentityReferenceId: input.accountIdentityReferenceId.trim(), sourceCommentId: input.sourceCommentId.trim(), sourceMessageId: input.sourceMessageId, status: 'RESERVED' as const, expiresAt: input.expiresAt, providerMessageId: null }); this.#rows.set(scoped, row); return row;
  }
  markSent(input: MetaInstagramScope & { sourceCommentId: string; providerMessageId: string }) { const scoped = key(input); const row = this.#rows.get(scoped); if (!row) throw new MetaInstagramPersistenceError('INSTAGRAM_PRIVATE_REPLY_RESERVATION_NOT_FOUND'); const updated = Object.freeze({ ...row, status: 'SENT' as const, providerMessageId: input.providerMessageId }); this.#rows.set(scoped, updated); return updated; }
  markUnknown(input: MetaInstagramScope & { sourceCommentId: string }) { const scoped = key(input); const row = this.#rows.get(scoped); if (!row) throw new MetaInstagramPersistenceError('INSTAGRAM_PRIVATE_REPLY_RESERVATION_NOT_FOUND'); const updated = Object.freeze({ ...row, status: 'UNKNOWN_OUTCOME' as const }); this.#rows.set(scoped, updated); return updated; }
  snapshot() { return [...this.#rows.values()]; }
}
