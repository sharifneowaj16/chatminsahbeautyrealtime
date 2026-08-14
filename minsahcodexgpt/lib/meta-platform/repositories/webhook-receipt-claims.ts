import { randomUUID } from 'node:crypto';

export const META_SOCIAL_WEBHOOK_DEFAULT_LEASE_MS = 5 * 60 * 1_000;
export const META_SOCIAL_WEBHOOK_MIN_LEASE_MS = 5_000;
export const META_SOCIAL_WEBHOOK_MAX_LEASE_MS = 30 * 60 * 1_000;

const SAFE_ACTOR_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

export type MetaSocialWebhookReceiptClaimInput = Readonly<{
  receiptId: string;
  leaseOwner: string;
  leaseMs?: number;
  now?: Date;
}>;

export type MetaSocialWebhookReceiptClaimMetadata = Readonly<{
  leaseToken: string;
  leaseOwner: string;
  leaseExpiresAt: Date;
  reclaimed: boolean;
}>;

export function normalizeMetaSocialWebhookLeaseMs(value?: number): number {
  const leaseMs = value ?? META_SOCIAL_WEBHOOK_DEFAULT_LEASE_MS;
  if (!Number.isSafeInteger(leaseMs)
    || leaseMs < META_SOCIAL_WEBHOOK_MIN_LEASE_MS
    || leaseMs > META_SOCIAL_WEBHOOK_MAX_LEASE_MS) {
    throw new TypeError('META_SOCIAL_WEBHOOK_LEASE_DURATION_INVALID');
  }
  return leaseMs;
}

export function normalizeMetaSocialWebhookLifecycleActor(value: unknown, code = 'META_SOCIAL_WEBHOOK_ACTOR_INVALID'): string {
  if (typeof value !== 'string') throw new TypeError(code);
  const normalized = value.trim();
  if (!SAFE_ACTOR_PATTERN.test(normalized)) throw new TypeError(code);
  return normalized;
}

export function createMetaSocialWebhookLeaseToken(): string {
  return randomUUID();
}

export function resolveMetaSocialWebhookLeaseWindow(input: {
  readonly leaseOwner: string;
  readonly leaseMs?: number;
  readonly now?: Date;
}) {
  const leaseOwner = normalizeMetaSocialWebhookLifecycleActor(input.leaseOwner, 'META_SOCIAL_WEBHOOK_LEASE_OWNER_INVALID');
  const leaseMs = normalizeMetaSocialWebhookLeaseMs(input.leaseMs);
  const now = input.now ? new Date(input.now) : new Date();
  if (!Number.isFinite(now.getTime())) throw new TypeError('META_SOCIAL_WEBHOOK_TRANSITION_TIME_INVALID');
  return Object.freeze({
    leaseOwner,
    leaseMs,
    now,
    leaseToken: createMetaSocialWebhookLeaseToken(),
    leaseExpiresAt: new Date(now.getTime() + leaseMs),
  });
}
