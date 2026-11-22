import 'server-only';

import prisma from '@/lib/prisma';
import { withRedisLock } from '@/lib/cache/redis';
import {
  evaluateCustomerFraudRisk,
  type CustomerFraudRiskDetails,
} from '@/lib/courier/fraud-check';
import {
  formatCourierHistoryForTelegram,
  notifyNewOrder,
  sendTelegramHtmlMessage,
  type DetailedOrderNotification,
} from '@/lib/telegram-notify';

export type OrderTelegramJobData =
  | {
      type: 'standard_order';
      sourceRoute: string;
      order: DetailedOrderNotification;
    }
  | {
      type: 'gift_order';
      orderId: string;
      orderNumber: string;
      customerPhone: string;
      baseHtmlMessage: string;
    };

export interface OrderTelegramProcessResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  messageId?: string | number;
}

const COURIER_VERIFY_TIMEOUT_MS = 4_500;

async function persistCourierSnapshot(
  orderId: string,
  score: number,
  level: 'LOW' | 'MEDIUM' | 'HIGH',
  details: CustomerFraudRiskDetails
) {
  await prisma.order
    .update({
      where: { id: orderId },
      data: {
        fraudRiskScore: score,
        fraudRiskLevel: level,
        fraudRiskDetails: details as any,
      },
    })
    .catch((err) => {
      console.error('[OrderTelegramProcessor] Failed to persist fraudRiskDetails:', err);
    });
}

async function markAdminNotified(orderId: string) {
  await prisma.order
    .update({
      where: { id: orderId },
      data: { adminNotifiedAt: new Date() },
    })
    .catch((err) => {
      console.error('[OrderTelegramProcessor] Failed to update adminNotifiedAt:', err);
    });
}

async function runLockedOrderNotification(
  data: OrderTelegramJobData
): Promise<OrderTelegramProcessResult> {
  const orderId = data.type === 'standard_order' ? data.order.orderId : data.orderId;
  const customerPhone =
    data.type === 'standard_order' ? data.order.customerPhone : data.customerPhone;

  // Idempotency check (load-balancer / retry safe: never double-send for the same order)
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, adminNotifiedAt: true },
  });

  if (existing?.adminNotifiedAt) {
    return { ok: true, skipped: true, reason: 'ALREADY_NOTIFIED' };
  }

  // Run Steadfast + Pathao + Minsah history check within strict 4.5s budget
  let courierDetails: CustomerFraudRiskDetails | null = null;
  if (customerPhone && customerPhone !== 'N/A') {
    try {
      const result = await evaluateCustomerFraudRisk(customerPhone, {
        excludeOrderId: orderId,
        timeoutMs: COURIER_VERIFY_TIMEOUT_MS,
      });
      courierDetails = result.details;
      await persistCourierSnapshot(
        orderId,
        result.fraudRiskScore,
        result.fraudRiskLevel,
        result.details
      );
    } catch (err) {
      console.error('[OrderTelegramProcessor] Courier verification failed (continuing to Telegram):', err);
    }
  }

  if (data.type === 'standard_order') {
    const notifyResult = await notifyNewOrder({
      ...data.order,
      courierVerification: courierDetails,
    });

    if (!notifyResult.ok) {
      if (notifyResult.error === 'TELEGRAM_NOT_CONFIGURED') {
        return { ok: false, skipped: true, reason: 'TELEGRAM_NOT_CONFIGURED' };
      }
      throw new Error(notifyResult.error || 'TELEGRAM_SEND_FAILED');
    }

    await markAdminNotified(orderId);
    return { ok: true, messageId: notifyResult.messageId };
  }

  // Gift order flow: preserve exact gift layout + append raw courier & store history
  const courierBlock = formatCourierHistoryForTelegram(courierDetails);
  const fullMessage = courierBlock
    ? `${data.baseHtmlMessage}\n\n${courierBlock}`
    : data.baseHtmlMessage;

  const giftResult = await sendTelegramHtmlMessage(fullMessage);
  if (!giftResult.ok) {
    if (giftResult.error === 'TELEGRAM_NOT_CONFIGURED') {
      return { ok: false, skipped: true, reason: 'TELEGRAM_NOT_CONFIGURED' };
    }
    throw new Error(giftResult.error || 'GIFT_TELEGRAM_SEND_FAILED');
  }

  await markAdminNotified(orderId);
  return { ok: true, messageId: giftResult.messageId };
}

/**
 * Executes courier verification + Telegram order notification under a distributed Redis lock.
 */
export async function processOrderTelegramJobData(
  data: OrderTelegramJobData
): Promise<OrderTelegramProcessResult> {
  const orderId = data.type === 'standard_order' ? data.order.orderId : data.orderId;

  const lock = await withRedisLock(`telegram:order-notify:${orderId}`, 20_000, () =>
    runLockedOrderNotification(data)
  );

  if (!lock.acquired) {
    return { ok: true, skipped: true, reason: 'LOCK_HELD_BY_ANOTHER_REPLICA' };
  }

  return lock.value;
}
