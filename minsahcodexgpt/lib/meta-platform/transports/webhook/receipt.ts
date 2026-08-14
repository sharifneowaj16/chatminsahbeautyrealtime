import type { MetaWebhookNotification, MetaWebhookReceipt, MetaWebhookReceiptStore } from './types';

export async function persistMetaWebhookReceipts(input: {
  readonly notifications: readonly MetaWebhookNotification[];
  readonly store: MetaWebhookReceiptStore;
}): Promise<readonly MetaWebhookReceipt[]> {
  const receipts: MetaWebhookReceipt[] = [];
  for (const notification of input.notifications) {
    const stored = await input.store.putIfAbsent(notification);
    receipts.push(Object.freeze({
      id: stored.id,
      eventKey: stored.eventKey,
      orderingKey: stored.orderingKey,
      payloadDigest: stored.payloadDigest,
      occurredAt: stored.occurredAt,
      created: stored.created !== false,
    }));
  }
  return Object.freeze(receipts);
}

export class InMemoryMetaWebhookReceiptStore implements MetaWebhookReceiptStore {
  readonly #receipts = new Map<string, Omit<MetaWebhookReceipt, 'created'>>();

  async putIfAbsent(notification: MetaWebhookNotification) {
    const existing = this.#receipts.get(notification.eventKey);
    if (existing) return { ...existing, created: false };
    const created = Object.freeze({
      id: `receipt:${notification.eventKey}`,
      eventKey: notification.eventKey,
      orderingKey: notification.orderingKey,
      payloadDigest: notification.payloadDigest,
      occurredAt: notification.occurredAt,
    });
    this.#receipts.set(notification.eventKey, created);
    return { ...created, created: true };
  }

  snapshot(): readonly Omit<MetaWebhookReceipt, 'created'>[] {
    return Object.freeze([...this.#receipts.values()]);
  }
}
