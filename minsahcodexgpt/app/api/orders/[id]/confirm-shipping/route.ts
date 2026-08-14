import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createPathaoDeliveryForOrder } from '@/lib/pathao-delivery';
import { recordProductLifecycleTransitionInTransaction } from '@/lib/analytics/product-metrics';
import { verifyTelegramInternalSecretHeader } from '@/lib/telegram/auth';
import { canTelegramCancel, canTelegramPathaoSend } from '@/lib/telegram/order-state';

export const dynamic = 'force-dynamic';

function orderSelectFields() {
  return {
    id: true,
    orderNumber: true,
    shippingMethod: true,
    status: true,
    paymentStatus: true,
    paymentMethod: true,
    phoneConfirmedAt: true,
    metaPurchaseSent: true,
    isTest: true,
    pathaoConsignmentId: true,
    pathaoTrackingCode: true,
    pathaoSentAt: true,
    shippedAt: true,
    deliveredAt: true,
    cancelledAt: true,
    returnedAt: true,
    refundedAt: true,
    courierDeliveredAt: true,
    courierReturnedAt: true,
    addressId: true,
  } as const;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const internalSecret = process.env.TELEGRAM_BOT_INTERNAL_SECRET?.trim() || '';
  if (!verifyTelegramInternalSecretHeader(request, internalSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = body.action;

  if (action !== 'confirm' && action !== 'cancel') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: orderSelectFields(),
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (action === 'cancel') {
    const allowed = canTelegramCancel(order);
    if (!allowed.ok) {
      return NextResponse.json(
        { error: allowed.reason, orderNumber: order.orderNumber },
        { status: 409 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const before = await tx.order.findUnique({ where: { id }, select: orderSelectFields() });
      if (!before) return null;

      const allowedInsideTransaction = canTelegramCancel(before);
      if (!allowedInsideTransaction.ok) {
        return { blocked: true as const, reason: allowedInsideTransaction.reason, orderNumber: before.orderNumber };
      }

      const updated = await tx.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          paymentStatus: before.paymentStatus === 'COMPLETED' ? before.paymentStatus : 'CANCELLED',
          cancelledAt: new Date(),
          confirmationStatus: 'CANCELLED_FROM_TELEGRAM_LEGACY',
          confirmationNote: 'Cancelled from legacy Telegram internal endpoint after state guard.',
        },
        select: orderSelectFields(),
      });

      await recordProductLifecycleTransitionInTransaction(tx, before, updated);
      return { blocked: false as const, orderNumber: updated.orderNumber };
    });

    if (!result) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (result.blocked) {
      return NextResponse.json(
        { error: result.reason, orderNumber: result.orderNumber },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      action: 'cancelled',
      orderNumber: result.orderNumber,
    });
  }

  const allowed = canTelegramPathaoSend(order);
  if (!allowed.ok) {
    return NextResponse.json(
      { error: allowed.reason, orderNumber: order.orderNumber },
      { status: 409 }
    );
  }

  let pathaoDelivery = null;
  if ((order.shippingMethod || '').toLowerCase() === 'pathao') {
    try {
      pathaoDelivery = await createPathaoDeliveryForOrder(order.id, {
        preserveOrderStatus: true,
        saveFailureStatus: true,
      });
    } catch (err) {
      console.error('Pathao delivery creation failed:', err);
      return NextResponse.json(
        { error: 'Pathao delivery creation failed', orderNumber: order.orderNumber },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    action: 'confirmed',
    orderNumber: order.orderNumber,
    pathaoDelivery,
  });
}
