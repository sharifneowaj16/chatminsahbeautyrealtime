import 'server-only';

import { isCodPaymentMethod } from '@/lib/payments/canonical-payment-contract';

type TelegramOrderState = {
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  phoneConfirmedAt: Date | null;
  metaPurchaseSent: boolean;
  isTest: boolean;
  pathaoConsignmentId: string | null;
  pathaoTrackingCode: string | null;
  pathaoSentAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  refundedAt: Date | null;
  addressId?: string | null;
};

function normalize(value?: string | null) {
  return String(value ?? '').trim().toUpperCase();
}

function isFinalOrUnsafe(order: TelegramOrderState) {
  const status = normalize(order.status);
  return (
    status === 'SHIPPED' ||
    status === 'DELIVERED' ||
    status === 'CANCELLED' ||
    status === 'REFUNDED' ||
    Boolean(order.shippedAt || order.deliveredAt || order.cancelledAt || order.refundedAt)
  );
}

function isPaidOnline(order: TelegramOrderState) {
  return !isCodPaymentMethod(order.paymentMethod) && normalize(order.paymentStatus) === 'COMPLETED';
}

function hasPathaoDispatch(order: TelegramOrderState) {
  return Boolean(order.pathaoConsignmentId || order.pathaoTrackingCode || order.pathaoSentAt);
}

export function canTelegramPhoneConfirm(order: TelegramOrderState) {
  if (!isCodPaymentMethod(order.paymentMethod)) {
    return { ok: false as const, reason: 'Only COD orders can be phone-confirmed from Telegram.' };
  }
  if (normalize(order.status) === 'CANCELLED' || order.cancelledAt) {
    return { ok: false as const, reason: 'Cancelled orders cannot be phone-confirmed.' };
  }
  if (normalize(order.status) === 'REFUNDED' || order.refundedAt) {
    return { ok: false as const, reason: 'Refunded orders cannot be phone-confirmed.' };
  }
  if (normalize(order.status) === 'DELIVERED' || order.deliveredAt) {
    return { ok: false as const, reason: 'Delivered orders cannot be phone-confirmed.' };
  }
  if (order.metaPurchaseSent) {
    return { ok: false as const, reason: 'Meta Purchase already sent for this order.' };
  }
  return { ok: true as const };
}

export function canTelegramPhoneOff(order: TelegramOrderState) {
  if (order.phoneConfirmedAt || normalize(order.status) === 'CONFIRMED') {
    return { ok: false as const, reason: 'Already confirmed orders cannot be marked Phone Off.' };
  }
  if (isFinalOrUnsafe(order)) {
    return { ok: false as const, reason: 'This order state cannot be marked Phone Off.' };
  }
  return { ok: true as const };
}

export function canTelegramCancel(order: TelegramOrderState) {
  if (isPaidOnline(order)) {
    return { ok: false as const, reason: 'Paid online orders cannot be cancelled from Telegram.' };
  }
  if (order.phoneConfirmedAt || normalize(order.status) === 'CONFIRMED') {
    return { ok: false as const, reason: 'Phone-confirmed orders must be cancelled from the admin panel with review.' };
  }
  if (isFinalOrUnsafe(order)) {
    return { ok: false as const, reason: 'This order state cannot be cancelled from Telegram.' };
  }
  if (hasPathaoDispatch(order)) {
    return { ok: false as const, reason: 'Pathao-dispatched orders cannot be cancelled from Telegram.' };
  }
  return { ok: true as const };
}

export function canTelegramPathaoSend(order: TelegramOrderState) {
  if (normalize(order.status) !== 'CONFIRMED' && !order.phoneConfirmedAt) {
    return { ok: false as const, reason: 'Order must be phone-confirmed before Pathao dispatch.' };
  }
  if (isCodPaymentMethod(order.paymentMethod) && !order.phoneConfirmedAt) {
    return { ok: false as const, reason: 'COD order needs phoneConfirmedAt before Pathao dispatch.' };
  }
  if (normalize(order.status) === 'CANCELLED' || normalize(order.status) === 'REFUNDED') {
    return { ok: false as const, reason: 'Cancelled/refunded orders cannot be sent to Pathao.' };
  }
  if (order.cancelledAt || order.refundedAt) {
    return { ok: false as const, reason: 'Cancelled/refunded orders cannot be sent to Pathao.' };
  }
  if (normalize(order.status) === 'DELIVERED' || order.deliveredAt) {
    return { ok: false as const, reason: 'Delivered orders cannot be sent to Pathao again.' };
  }
  if (!order.addressId) {
    return { ok: false as const, reason: 'Order is missing shipping address.' };
  }
  return { ok: true as const };
}
