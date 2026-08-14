import type { MetaNormalizedWebhookEvent } from '../../contracts/webhook';

export type MetaWebhookSignatureFailureCode =
  | 'SIGNATURE_MISSING'
  | 'APP_SECRET_MISSING'
  | 'SIGNATURE_FORMAT_INVALID'
  | 'SIGNATURE_MISMATCH';

export type MetaWebhookSignatureResult =
  | { readonly ok: true; readonly algorithm: 'sha256' }
  | { readonly ok: false; readonly code: MetaWebhookSignatureFailureCode };

export interface MetaWebhookEnvelopeEntry {
  readonly id?: string;
  readonly time?: number;
  readonly changes?: readonly unknown[];
  readonly messaging?: readonly unknown[];
  readonly standby?: readonly unknown[];
  readonly [key: string]: unknown;
}

export interface MetaWebhookEnvelope {
  readonly object?: string;
  readonly entry: readonly MetaWebhookEnvelopeEntry[];
  readonly [key: string]: unknown;
}

export type MetaWebhookNotification = MetaNormalizedWebhookEvent;

export interface MetaWebhookReceipt {
  readonly id: string;
  readonly eventKey: string;
  readonly orderingKey: string;
  readonly payloadDigest: string;
  readonly occurredAt: string | null;
  readonly created: boolean;
}

export interface MetaWebhookReceiptStore {
  putIfAbsent(notification: MetaWebhookNotification): Promise<Omit<MetaWebhookReceipt, 'created'> & { readonly created?: boolean }>;
}
