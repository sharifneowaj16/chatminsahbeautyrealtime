import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { buildUnifiedCourierTracking } from '@/lib/courier-tracking';
import { Prisma } from '@/generated/prisma/client';

export const dynamic = 'force-dynamic';

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

const trackingInclude = {
  shippingAddress: {
    select: { city: true, phone: true },
  },
  user: {
    select: { phone: true },
  },
  items: {
    select: { name: true, quantity: true },
    take: 5,
  },
  pathaoWebhookEvents: {
    orderBy: { receivedAt: 'desc' },
    select: {
      eventType: true,
      payload: true,
      processedAt: true,
      receivedAt: true,
    },
  },
  steadfastWebhookEvents: {
    orderBy: { receivedAt: 'desc' },
    select: {
      eventType: true,
      status: true,
      trackingMessage: true,
      processedAt: true,
      receivedAt: true,
    },
  },
} as const satisfies Prisma.OrderInclude;

async function findTrackingOrder(where: Prisma.OrderWhereInput) {
  return prisma.order.findFirst({
    where,
    include: trackingInclude,
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trackingCode = searchParams.get('code')?.trim();
  const orderNumber = searchParams.get('order')?.trim();
  const phone = searchParams.get('phone')?.trim();

  if (!trackingCode && (!orderNumber || !phone)) {
    return NextResponse.json(
      { error: 'Provide either ?code= or ?order= with ?phone=' },
      { status: 400 }
    );
  }

  try {
    let order: Awaited<ReturnType<typeof findTrackingOrder>> | null = null;

    if (trackingCode) {
      order = await findTrackingOrder({
        OR: [
          { trackingNumber: trackingCode },
          { steadfastTrackingCode: trackingCode },
          { steadfastConsignmentId: trackingCode },
          { pathaoTrackingCode: trackingCode },
          { pathaoConsignmentId: trackingCode },
        ],
      });
    } else if (orderNumber && phone) {
      const normalizedPhone = normalizePhone(phone);
      order = await findTrackingOrder({ orderNumber });

      if (order) {
        const addressPhone = normalizePhone(order.shippingAddress?.phone ?? '');
        const userPhone = normalizePhone(order.user?.phone ?? '');
        const phoneMatches =
          addressPhone.endsWith(normalizedPhone.slice(-10)) ||
          userPhone.endsWith(normalizedPhone.slice(-10));

        if (!phoneMatches) {
          order = null;
        }
      }
    }

    if (!order) {
      return NextResponse.json({ found: false, error: 'Order not found' }, { status: 404 });
    }

    const tracking = buildUnifiedCourierTracking(order);

    return NextResponse.json({
      found: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      courier: tracking.courier,
      trackingId: tracking.trackingId,
      consignmentId: tracking.consignmentId,
      currentStatus: tracking.currentStatus,
      lastUpdatedAt: tracking.lastUpdatedAt,
      deliveryCharge: tracking.deliveryCharge,
      timeline: tracking.timeline,
      deliveryCity: order.shippingAddress?.city ?? null,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      items: order.items,
    });
  } catch (error) {
    console.error('[Track] Error:', error);
    return NextResponse.json({ error: 'Tracking lookup failed' }, { status: 500 });
  }
}
