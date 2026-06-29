import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import nagad from '@/lib/payments/nagad';
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
        items: { select: { name: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    if ((order.paymentMethod ?? '').toLowerCase() !== 'nagad') {
      return NextResponse.json(
        { success: false, message: 'Order is not configured for Nagad payment' },
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

    const callbackURL = new URL('/api/payments/nagad/callback', request.nextUrl.origin);
    callbackURL.searchParams.set('orderId', order.id);

    const payment = await nagad.initializePayment({
      amount,
      orderId: order.orderNumber,
      productDetails: order.items.map((item) => item.name).join(', ').slice(0, 250) || 'Minsah order',
      merchantCallbackURL: callbackURL.toString(),
    });
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

      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'PROCESSING' },
      });
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
