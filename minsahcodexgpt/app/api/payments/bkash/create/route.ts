import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bkash from '@/lib/payments/bkash';
import type { Prisma } from '@/generated/prisma/client';

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

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        paymentMethod: true,
        paymentStatus: true,
        total: true,
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    if ((order.paymentMethod ?? '').toLowerCase() !== 'bkash') {
      return NextResponse.json(
        { success: false, message: 'Order is not configured for bKash payment' },
        { status: 400 }
      );
    }

    if (String(order.paymentStatus).toUpperCase() === 'COMPLETED') {
      return NextResponse.json(
        { success: false, message: 'Order is already paid' },
        { status: 409 }
      );
    }

    const amount = decimalToNumber(order.total);
    if (amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid order amount' },
        { status: 400 }
      );
    }

    const callbackURL = new URL('/api/payments/bkash/callback', request.nextUrl.origin);
    callbackURL.searchParams.set('orderId', order.id);

    const payment = await bkash.createPayment({
      amount,
      orderNumber: order.orderNumber,
      intent: 'sale',
      callbackURL: callbackURL.toString(),
    });
    const gatewayResponse = payment as unknown as Prisma.InputJsonValue;

    await prisma.$transaction(async (tx) => {
      await tx.payment.upsert({
        where: { gatewayTransactionId: payment.paymentID },
        update: {
          orderId: order.id,
          method: 'bkash',
          gateway: 'bkash',
          amount,
          currency: payment.currency || 'BDT',
          status: 'PROCESSING',
          rawStatus: payment.transactionStatus || 'CREATED',
          gatewayResponse,
          signatureVerified: false,
          amountMatched: false,
          currencyMatched: false,
        },
        create: {
          orderId: order.id,
          method: 'bkash',
          gateway: 'bkash',
          gatewayTransactionId: payment.paymentID,
          amount,
          currency: payment.currency || 'BDT',
          status: 'PROCESSING',
          rawStatus: payment.transactionStatus || 'CREATED',
          gatewayResponse,
          signatureVerified: false,
          amountMatched: false,
          currencyMatched: false,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'PROCESSING' },
      });
    });

    return NextResponse.json({
      success: true,
      paymentID: payment.paymentID,
      bkashURL: payment.bkashURL,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount,
      message: 'bKash payment initiated successfully',
    });
  } catch (error) {
    console.error('bKash payment API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Payment failed',
      },
      { status: 500 }
    );
  }
}
