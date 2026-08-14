import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId } from '@/app/api/auth/_utils';
import { checkRateLimit } from '@/lib/cache/redis';
import { normalizePaymentMethod } from '@/lib/payments/canonical-payment-contract';
import type { OnlinePaymentMethod } from '@/lib/payments/payment-methods';
import {
  getPaymentCreateBlockReason,
  normalizeLifecycleStatus,
  ONLINE_PAYMENT_INITIAL_STATUS,
  ONLINE_PAYMENT_PENDING_ORDER_STATUS,
  ONLINE_PAYMENT_PROCESSING_STATUS,
} from '@/lib/orders/payment-lifecycle';

export type PaymentCreateGateway = OnlinePaymentMethod;

type GuardOrder = {
  id: string;
  userId: string;
  orderNumber: string;
  status: string;
  paymentMethod: string | null;
  paymentStatus: string;
  total: unknown;
  paymentExpiresAt: Date | null;
  items: { name: string }[];
};

export type PaymentCreateGuardResult =
  | {
      ok: true;
      userId: string;
      ip: string;
      order: GuardOrder;
    }
  | {
      ok: false;
      status: number;
      body: Record<string, unknown>;
      headers?: HeadersInit;
    };

const PAYMENT_CREATE_RATE_LIMIT_MAX = 5;
const PAYMENT_CREATE_RATE_LIMIT_WINDOW_SECONDS = 10 * 60;

export function getRequestIp(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function logPaymentCreateAudit(event: {
  orderId: string;
  userId?: string | null;
  gateway: PaymentCreateGateway;
  previousStatus?: string | null;
  newStatus?: string | null;
  ip: string;
  outcome: 'allowed' | 'blocked' | 'initiated';
  reason?: string;
}) {
  console.info('[payment-create-audit]', {
    orderId: event.orderId,
    userId: event.userId ?? null,
    gateway: event.gateway,
    previousStatus: event.previousStatus ?? null,
    newStatus: event.newStatus ?? null,
    ip: event.ip,
    outcome: event.outcome,
    reason: event.reason ?? null,
    timestamp: new Date().toISOString(),
  });
}

export async function claimPaymentCreate(params: {
  orderId: string;
  userId: string;
}) {
  const claimed = await prisma.order.updateMany({
    where: {
      id: params.orderId,
      userId: params.userId,
      status: ONLINE_PAYMENT_PENDING_ORDER_STATUS,
      paymentStatus: ONLINE_PAYMENT_INITIAL_STATUS,
    },
    data: { paymentStatus: ONLINE_PAYMENT_PROCESSING_STATUS },
  });

  return claimed.count === 1;
}

export async function releasePaymentCreateClaim(params: {
  orderId: string;
  userId: string;
}) {
  const released = await prisma.order.updateMany({
    where: {
      id: params.orderId,
      userId: params.userId,
      status: ONLINE_PAYMENT_PENDING_ORDER_STATUS,
      paymentStatus: ONLINE_PAYMENT_PROCESSING_STATUS,
    },
    data: { paymentStatus: ONLINE_PAYMENT_INITIAL_STATUS },
  });

  return released.count === 1;
}

export async function authorizePaymentCreate(
  request: NextRequest,
  params: { orderId: string; gateway: PaymentCreateGateway },
): Promise<PaymentCreateGuardResult> {
  const ip = getRequestIp(request);
  const userId = await getAuthenticatedUserId(request);

  if (!userId) {
    logPaymentCreateAudit({
      orderId: params.orderId,
      gateway: params.gateway,
      ip,
      outcome: 'blocked',
      reason: 'AUTH_REQUIRED',
    });

    return {
      ok: false,
      status: 401,
      body: {
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Please log in before initiating payment.',
      },
    };
  }

  const rateLimitKey = `payment-create:${params.gateway}:${params.orderId}:${userId}:${ip}`;
  const rateLimit = await checkRateLimit(
    rateLimitKey,
    PAYMENT_CREATE_RATE_LIMIT_MAX,
    PAYMENT_CREATE_RATE_LIMIT_WINDOW_SECONDS,
  );

  if (!rateLimit.allowed) {
    logPaymentCreateAudit({
      orderId: params.orderId,
      userId,
      gateway: params.gateway,
      ip,
      outcome: 'blocked',
      reason: 'RATE_LIMITED',
    });

    return {
      ok: false,
      status: 429,
      headers: {
        'Retry-After': String(rateLimit.resetIn),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
      body: {
        success: false,
        code: 'PAYMENT_CREATE_RATE_LIMITED',
        message: 'Too many payment attempts for this order. Please try again later.',
        retryAfter: rateLimit.resetIn,
      },
    };
  }

  const order = await prisma.order.findFirst({
    where: { id: params.orderId, userId },
    select: {
      id: true,
      userId: true,
      orderNumber: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
      total: true,
      paymentExpiresAt: true,
      items: { select: { name: true } },
    },
  });

  if (!order) {
    logPaymentCreateAudit({
      orderId: params.orderId,
      userId,
      gateway: params.gateway,
      ip,
      outcome: 'blocked',
      reason: 'ORDER_NOT_FOUND_OR_NOT_OWNER',
    });

    return {
      ok: false,
      status: 404,
      body: {
        success: false,
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found',
      },
    };
  }

  const paymentMethod = normalizePaymentMethod(order.paymentMethod);
  if (paymentMethod !== params.gateway) {
    logPaymentCreateAudit({
      orderId: order.id,
      userId,
      gateway: params.gateway,
      previousStatus: String(order.paymentStatus),
      ip,
      outcome: 'blocked',
      reason: 'WRONG_PAYMENT_METHOD',
    });

    return {
      ok: false,
      status: 400,
      body: {
        success: false,
        code: 'WRONG_PAYMENT_METHOD',
        message: `Order is not configured for ${params.gateway} payment`,
      },
    };
  }

  const paymentStatus = normalizeLifecycleStatus(order.paymentStatus);
  const orderStatus = normalizeLifecycleStatus(order.status);
  const blockReason = getPaymentCreateBlockReason({
    orderStatus,
    paymentStatus,
    paymentExpiresAt: order.paymentExpiresAt,
  });

  if (blockReason) {
    logPaymentCreateAudit({
      orderId: order.id,
      userId,
      gateway: params.gateway,
      previousStatus: paymentStatus,
      ip,
      outcome: 'blocked',
      reason: blockReason,
    });

    const responseByReason = {
      PAYMENT_WINDOW_EXPIRED: {
        code: 'PAYMENT_WINDOW_EXPIRED',
        message: 'This payment window has expired. Please create a new order.',
      },
      PAYMENT_NOT_ALLOWED_FOR_ORDER_STATE: {
        code: 'PAYMENT_NOT_ALLOWED_FOR_ORDER_STATE',
        message: 'Payment cannot be initiated for this order state.',
      },
      ORDER_NOT_PENDING_PAYMENT: {
        code: 'ORDER_NOT_PENDING_PAYMENT',
        message: 'This order is not waiting for online payment.',
      },
      PAYMENT_NOT_PENDING: {
        code: 'PAYMENT_NOT_PENDING',
        message: 'This order is not in a payable payment state.',
      },
    } as const;

    return {
      ok: false,
      status: 409,
      body: {
        success: false,
        ...responseByReason[blockReason],
      },
    };
  }

  logPaymentCreateAudit({
    orderId: order.id,
    userId,
    gateway: params.gateway,
    previousStatus: paymentStatus,
    ip,
    outcome: 'allowed',
  });

  return { ok: true, userId, ip, order };
}
