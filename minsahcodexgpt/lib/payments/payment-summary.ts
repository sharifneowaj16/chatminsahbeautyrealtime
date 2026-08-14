import prisma from '@/lib/prisma';
import {
  isCanonicalOnlinePaymentMethod,
  normalizePaymentMethod,
} from '@/lib/payments/canonical-payment-contract';
import {
  ACTIVE_PAYMENT_STATUSES,
  ONLINE_PAYMENT_COMPLETED_STATUS,
  ONLINE_PAYMENT_INITIAL_STATUS,
  ONLINE_PAYMENT_PENDING_ORDER_STATUS,
  TERMINAL_ORDER_STATUSES,
  TERMINAL_PAYMENT_STATUSES,
  isPaymentWindowExpired,
  normalizeLifecycleStatus,
} from '@/lib/orders/payment-lifecycle';

export type PaymentSummaryGateway = 'bkash' | 'nagad';

export type PaymentSummary = {
  success: true;
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: 'BDT';
  paymentMethod: PaymentSummaryGateway;
  paymentStatus: string;
  orderStatus: string;
  customerPhone: string | null;
  canInitiatePayment: boolean;
  paymentExpiresAt: string | null;
  paymentWindowExpired: boolean;
  latestPaymentStatus: string | null;
  latestPaymentCreatedAt: string | null;
  disabledReason: string | null;
  message: string;
};

export type PaymentSummaryResult =
  | { ok: true; summary: PaymentSummary }
  | {
      ok: false;
      status: number;
      body: Record<string, unknown>;
    };

export function decimalToNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === 'object' && 'toString' in value) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function normalizePaymentSummaryGateway(value?: string | null): PaymentSummaryGateway | null {
  const gateway = normalizePaymentMethod(value);
  return gateway === 'bkash' || gateway === 'nagad' ? gateway : null;
}

function buildDisabledReason(params: {
  orderStatus: string;
  paymentStatus: string;
  amount: number;
  paymentWindowExpired: boolean;
  latestPaymentStatus: string | null;
}) {
  const { orderStatus, paymentStatus, amount, paymentWindowExpired, latestPaymentStatus } = params;

  if (amount <= 0) return 'INVALID_AMOUNT';
  if (paymentWindowExpired) return 'PAYMENT_WINDOW_EXPIRED';
  if (TERMINAL_ORDER_STATUSES.has(orderStatus)) return 'ORDER_TERMINAL_STATE';
  if (paymentStatus === ONLINE_PAYMENT_COMPLETED_STATUS) return 'ORDER_ALREADY_PAID';
  if (TERMINAL_PAYMENT_STATUSES.has(paymentStatus)) return 'PAYMENT_TERMINAL_STATE';
  if (orderStatus !== ONLINE_PAYMENT_PENDING_ORDER_STATUS) return 'ORDER_NOT_PENDING_PAYMENT';
  if (ACTIVE_PAYMENT_STATUSES.has(paymentStatus) || latestPaymentStatus === 'PROCESSING') {
    return 'PAYMENT_ALREADY_PROCESSING';
  }
  if (paymentStatus !== ONLINE_PAYMENT_INITIAL_STATUS) return 'PAYMENT_NOT_PENDING';

  return null;
}

function getSummaryMessage(disabledReason: string | null) {
  switch (disabledReason) {
    case null:
      return 'Order is ready for payment.';
    case 'INVALID_AMOUNT':
      return 'This order amount is invalid for payment.';
    case 'PAYMENT_WINDOW_EXPIRED':
      return 'This payment window has expired. Please create a new order.';
    case 'ORDER_TERMINAL_STATE':
      return 'This order is closed and cannot be paid.';
    case 'ORDER_ALREADY_PAID':
      return 'This order is already paid.';
    case 'PAYMENT_TERMINAL_STATE':
      return 'This payment attempt is closed. Please create a new order if needed.';
    case 'ORDER_NOT_PENDING_PAYMENT':
      return 'This order is not waiting for online payment.';
    case 'PAYMENT_ALREADY_PROCESSING':
      return 'A payment attempt is already in progress for this order.';
    case 'PAYMENT_NOT_PENDING':
      return 'This order is not in a payable payment state.';
    default:
      return 'This order is not available for payment.';
  }
}

export async function getOwnerBoundPaymentSummary(params: {
  orderId: string;
  userId: string;
  gateway: PaymentSummaryGateway;
  now?: Date;
}): Promise<PaymentSummaryResult> {
  const now = params.now ?? new Date();
  const order = await prisma.order.findFirst({
    where: { id: params.orderId, userId: params.userId },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      paymentMethod: true,
      paymentStatus: true,
      status: true,
      paymentExpiresAt: true,
      shippingAddress: {
        select: {
          phone: true,
        },
      },
      payments: {
        where: { gateway: params.gateway },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!order) {
    return {
      ok: false,
      status: 404,
      body: {
        success: false,
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found.',
      },
    };
  }

  const paymentMethod = normalizePaymentMethod(order.paymentMethod);
  if (!isCanonicalOnlinePaymentMethod(paymentMethod) || paymentMethod !== params.gateway) {
    return {
      ok: false,
      status: 409,
      body: {
        success: false,
        code: 'PAYMENT_METHOD_MISMATCH',
        message: `This order is not configured for ${params.gateway} payment.`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.status,
        canInitiatePayment: false,
      },
    };
  }

  const paymentStatus = normalizeLifecycleStatus(order.paymentStatus);
  const orderStatus = normalizeLifecycleStatus(order.status);
  const amount = decimalToNumber(order.total);
  const latestPayment = order.payments[0];
  const latestPaymentStatus = latestPayment ? String(latestPayment.status).toUpperCase() : null;
  const latestPaymentCreatedAt = latestPayment?.createdAt ? latestPayment.createdAt.toISOString() : null;
  const paymentWindowExpired = isPaymentWindowExpired({
    orderStatus,
    paymentExpiresAt: order.paymentExpiresAt,
    now,
  });
  const disabledReason = buildDisabledReason({
    orderStatus,
    paymentStatus,
    amount,
    paymentWindowExpired,
    latestPaymentStatus,
  });
  const canInitiatePayment = disabledReason === null;

  return {
    ok: true,
    summary: {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount,
      currency: 'BDT',
      paymentMethod: params.gateway,
      paymentStatus,
      orderStatus,
      customerPhone: order.shippingAddress?.phone ?? null,
      canInitiatePayment,
      paymentExpiresAt: order.paymentExpiresAt ? order.paymentExpiresAt.toISOString() : null,
      paymentWindowExpired,
      latestPaymentStatus,
      latestPaymentCreatedAt,
      disabledReason,
      message: getSummaryMessage(disabledReason),
    },
  };
}
