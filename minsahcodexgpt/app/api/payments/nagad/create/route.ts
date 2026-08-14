import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import nagad from '@/lib/payments/nagad';
import type { Prisma } from '@/generated/prisma/client';
import {
  authorizePaymentCreate,
  claimPaymentCreate,
  logPaymentCreateAudit,
  releasePaymentCreateClaim,
} from '@/lib/payments/payment-create-security';

function decimalToNumber(value: unknown) {
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

export async function POST(request: NextRequest) {
  let claimedOrder: { orderId: string; userId: string } | null = null;
  let gatewaySessionCreated = false;

  try {
    const body = await request.json();
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : '';

    if (!orderId || !phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Order ID and phone number are required' },
        { status: 400 }
      );
    }

    const guard = await authorizePaymentCreate(request, { orderId, gateway: 'nagad' });
    if (!guard.ok) {
      return NextResponse.json(guard.body, {
        status: guard.status,
        headers: guard.headers,
      });
    }

    const { order, userId, ip } = guard;

    const amount = decimalToNumber(order.total);
    if (amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid order amount' },
        { status: 400 }
      );
    }

    const claimed = await claimPaymentCreate({ orderId: order.id, userId });
    if (!claimed) {
      logPaymentCreateAudit({
        orderId: order.id,
        userId,
        gateway: 'nagad',
        previousStatus: String(order.paymentStatus),
        ip,
        outcome: 'blocked',
        reason: 'PAYMENT_ALREADY_CLAIMED',
      });
      return NextResponse.json(
        {
          success: false,
          code: 'PAYMENT_ALREADY_PROCESSING',
          message: 'A payment attempt is already in progress for this order.',
        },
        { status: 409 },
      );
    }
    claimedOrder = { orderId: order.id, userId };

    const callbackURL = new URL('/api/payments/nagad/callback', request.nextUrl.origin);
    callbackURL.searchParams.set('orderId', order.id);

    const payment = await nagad.initializePayment({
      amount,
      orderId: order.orderNumber,
      productDetails: order.items.map((item) => item.name).join(', ').slice(0, 250) || 'Minsah order',
      merchantCallbackURL: callbackURL.toString(),
    });
    gatewaySessionCreated = true;
    const gatewayResponse = payment as unknown as Prisma.InputJsonValue;

    await prisma.$transaction(async (tx) => {
      await tx.payment.upsert({
        where: { gatewayTransactionId: payment.paymentReferenceId },
        update: {
          orderId: order.id,
          method: 'nagad',
          gateway: 'nagad',
          amount,
          currency: 'BDT',
          status: 'PROCESSING',
          rawStatus: payment.status || 'INITIALIZED',
          gatewayResponse,
          signatureVerified: false,
          amountMatched: false,
          currencyMatched: false,
        },
        create: {
          orderId: order.id,
          method: 'nagad',
          gateway: 'nagad',
          gatewayTransactionId: payment.paymentReferenceId,
          amount,
          currency: 'BDT',
          status: 'PROCESSING',
          rawStatus: payment.status || 'INITIALIZED',
          gatewayResponse,
          signatureVerified: false,
          amountMatched: false,
          currencyMatched: false,
        },
      });

      const updatedOrder = await tx.order.updateMany({
        where: {
          id: order.id,
          userId,
          status: 'PENDING_PAYMENT',
          paymentStatus: 'PROCESSING',
        },
        data: { paymentStatus: 'PROCESSING' },
      });

      if (updatedOrder.count !== 1) {
        throw new Error('PAYMENT_ORDER_OWNER_UPDATE_FAILED');
      }
    });

    claimedOrder = null;

    logPaymentCreateAudit({
      orderId: order.id,
      userId,
      gateway: 'nagad',
      previousStatus: String(order.paymentStatus),
      newStatus: 'PROCESSING',
      ip,
      outcome: 'initiated',
    });

    return NextResponse.json({
      success: true,
      paymentID: payment.paymentReferenceId,
      nagadURL: payment.callbackURL,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount,
      message: 'Nagad payment initiated successfully',
    });
  } catch (error) {
    if (claimedOrder && !gatewaySessionCreated) {
      await releasePaymentCreateClaim(claimedOrder).catch((releaseError) => {
        console.error('nagad payment claim release failed:', releaseError);
      });
    }

    console.error('Nagad payment API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Payment failed',
      },
      { status: 500 }
    );
  }
}
