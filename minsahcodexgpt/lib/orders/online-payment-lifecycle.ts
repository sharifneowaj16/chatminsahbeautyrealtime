import 'server-only';

import type prismaClient from '@/lib/prisma';
import {
  ONLINE_PAYMENT_EXPIRED_ORDER_STATUS,
  type TerminalGatewayFailureStatus,
} from '@/lib/orders/payment-lifecycle';
import { releaseOnlineOrderReservationInTransaction } from '@/lib/online-payment-stock';

type PrismaTransaction = Omit<
  typeof prismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Release any active reservation and move the order to the existing expired
 * online-payment state in one database transaction.
 */
export async function expireOnlinePaymentOrderInTransaction(
  tx: PrismaTransaction,
  params: {
    orderId: string;
    paymentStatus: TerminalGatewayFailureStatus;
    now?: Date;
  },
) {
  const now = params.now ?? new Date();
  const release = await releaseOnlineOrderReservationInTransaction(tx, params.orderId);

  await tx.order.update({
    where: { id: params.orderId },
    data: {
      status: ONLINE_PAYMENT_EXPIRED_ORDER_STATUS,
      paymentStatus: params.paymentStatus,
      stockReleasedAt: now,
    },
  });

  return { release, expiredAt: now };
}
