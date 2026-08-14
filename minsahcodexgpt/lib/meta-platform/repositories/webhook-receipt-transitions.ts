import type { MetaSocialWebhookReceiptState } from './webhook-receipts';

export const META_SOCIAL_WEBHOOK_RECEIPT_TRANSITIONS = Object.freeze({
  RECEIVED: Object.freeze(['QUEUED', 'BLOCKED'] as const),
  QUEUED: Object.freeze(['PROCESSING'] as const),
  PROCESSING: Object.freeze(['PROCESSED', 'FAILED'] as const),
  FAILED: Object.freeze(['QUEUED', 'DEAD_LETTERED'] as const),
  PROCESSED: Object.freeze([] as const),
  BLOCKED: Object.freeze([] as const),
  DEAD_LETTERED: Object.freeze([] as const),
} satisfies Readonly<Record<MetaSocialWebhookReceiptState, readonly MetaSocialWebhookReceiptState[]>>);

export const META_SOCIAL_WEBHOOK_RECEIPT_TERMINAL_STATES = Object.freeze([
  'PROCESSED', 'BLOCKED', 'DEAD_LETTERED',
] as const);

export type MetaSocialWebhookReceiptTransitionCode =
  | 'QUEUE_HANDOFF_COMPLETED'
  | 'PRE_PROCESSING_BLOCKED'
  | 'PROCESSING_CLAIMED'
  | 'PROCESSING_RECLAIMED'
  | 'PROCESSING_LEASE_RENEWED'
  | 'PROCESSING_COMPLETED'
  | 'PROCESSING_FAILED'
  | 'RETRY_QUEUED'
  | 'RETRY_EXHAUSTED'
  | 'CONTROLLED_REPLAY_CREATED';

export class MetaSocialWebhookReceiptLifecycleError extends Error {
  readonly code: string;
  readonly safeDetails: Readonly<Record<string, string | number | boolean | null>>;

  constructor(
    code: string,
    message: string,
    safeDetails: Readonly<Record<string, string | number | boolean | null>> = {},
  ) {
    super(message);
    this.name = 'MetaSocialWebhookReceiptLifecycleError';
    this.code = code;
    this.safeDetails = Object.freeze({ ...safeDetails });
  }
}

export function canTransitionMetaSocialWebhookReceipt(
  from: MetaSocialWebhookReceiptState,
  to: MetaSocialWebhookReceiptState,
): boolean {
  return META_SOCIAL_WEBHOOK_RECEIPT_TRANSITIONS[from].includes(to as never);
}

export function isTerminalMetaSocialWebhookReceiptState(
  state: MetaSocialWebhookReceiptState,
): boolean {
  return META_SOCIAL_WEBHOOK_RECEIPT_TERMINAL_STATES.includes(state as never);
}

export function assertMetaSocialWebhookReceiptTransition(
  from: MetaSocialWebhookReceiptState,
  to: MetaSocialWebhookReceiptState,
): void {
  if (!canTransitionMetaSocialWebhookReceipt(from, to)) {
    throw new MetaSocialWebhookReceiptLifecycleError(
      'META_SOCIAL_WEBHOOK_TRANSITION_NOT_ALLOWED',
      `Meta social webhook receipt cannot transition from ${from} to ${to}.`,
      { fromState: from, toState: to },
    );
  }
}
