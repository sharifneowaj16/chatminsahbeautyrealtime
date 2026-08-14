/**
 * Shared online-payment lifecycle rules.
 *
 * This module does not write to the database. It only centralizes the status
 * vocabulary already used by the order/payment routes so those routes cannot
 * silently drift apart.
 */
export const ONLINE_PAYMENT_PENDING_ORDER_STATUS = 'PENDING_PAYMENT' as const;
export const ONLINE_PAYMENT_EXPIRED_ORDER_STATUS = 'PAYMENT_EXPIRED' as const;
export const ONLINE_PAYMENT_INITIAL_STATUS = 'PENDING' as const;
export const ONLINE_PAYMENT_PROCESSING_STATUS = 'PROCESSING' as const;
export const ONLINE_PAYMENT_COMPLETED_STATUS = 'COMPLETED' as const;

export const TERMINAL_PAYMENT_STATUSES = new Set([
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
  'FAILED',
]);

export const TERMINAL_ORDER_STATUSES = new Set([
  'CANCELLED',
  'REFUNDED',
  'PAYMENT_EXPIRED',
]);

export const ACTIVE_PAYMENT_STATUSES = new Set(['PROCESSING']);
export const EXPIRABLE_PAYMENT_STATUSES = ['PENDING', 'PROCESSING'] as const;

const PAID_GATEWAY_STATUSES = new Set([
  'paid',
  'completed',
  'complete',
  'success',
  'successful',
  'validated',
]);

export type TerminalGatewayFailureStatus = 'FAILED' | 'CANCELLED' | 'REFUNDED';

export type PaymentCreateBlockReason =
  | 'PAYMENT_WINDOW_EXPIRED'
  | 'PAYMENT_NOT_ALLOWED_FOR_ORDER_STATE'
  | 'ORDER_NOT_PENDING_PAYMENT'
  | 'PAYMENT_NOT_PENDING';

export function normalizeLifecycleStatus(status?: string | null) {
  return String(status ?? '').trim().toUpperCase();
}

export function isPaidGatewayStatus(status?: string | null) {
  return PAID_GATEWAY_STATUSES.has(String(status ?? '').trim().toLowerCase());
}

export function normalizeTerminalGatewayFailureStatus(
  status?: string | null,
): TerminalGatewayFailureStatus | null {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (['failed', 'fail', 'declined'].includes(normalized)) return 'FAILED';
  if (['cancelled', 'canceled'].includes(normalized)) return 'CANCELLED';
  if (['refunded', 'refund'].includes(normalized)) return 'REFUNDED';
  return null;
}

export function isPaymentWindowExpired(params: {
  orderStatus?: string | null;
  paymentExpiresAt?: Date | string | null;
  now?: Date;
}) {
  if (
    normalizeLifecycleStatus(params.orderStatus) !==
      ONLINE_PAYMENT_PENDING_ORDER_STATUS ||
    !params.paymentExpiresAt
  ) {
    return false;
  }

  const expiresAt = new Date(params.paymentExpiresAt);
  if (Number.isNaN(expiresAt.getTime())) return false;
  return expiresAt.getTime() <= (params.now ?? new Date()).getTime();
}

export function getPaymentCreateBlockReason(params: {
  orderStatus?: string | null;
  paymentStatus?: string | null;
  paymentExpiresAt?: Date | string | null;
  now?: Date;
}): PaymentCreateBlockReason | null {
  const orderStatus = normalizeLifecycleStatus(params.orderStatus);
  const paymentStatus = normalizeLifecycleStatus(params.paymentStatus);

  if (
    isPaymentWindowExpired({
      orderStatus,
      paymentExpiresAt: params.paymentExpiresAt,
      now: params.now,
    })
  ) {
    return 'PAYMENT_WINDOW_EXPIRED';
  }

  if (
    TERMINAL_PAYMENT_STATUSES.has(paymentStatus) ||
    TERMINAL_ORDER_STATUSES.has(orderStatus)
  ) {
    return 'PAYMENT_NOT_ALLOWED_FOR_ORDER_STATE';
  }

  if (orderStatus !== ONLINE_PAYMENT_PENDING_ORDER_STATUS) {
    return 'ORDER_NOT_PENDING_PAYMENT';
  }

  if (paymentStatus !== ONLINE_PAYMENT_INITIAL_STATUS) {
    return 'PAYMENT_NOT_PENDING';
  }

  return null;
}
