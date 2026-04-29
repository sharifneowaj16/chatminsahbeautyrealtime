import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';
import { pathaoRequest } from '@/lib/pathao';

export const dynamic = 'force-dynamic';

function extractField(data: unknown, keys: string[]): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const source = data as Record<string, unknown>;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return null;
}

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('admin_access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const payload = await verifyAdminAccessToken(accessToken);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const { orderId } = (await request.json()) as { orderId?: string };
  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }

  const endpoint = process.env.PATHAO_CREATE_ORDER_ENDPOINT?.trim();
  if (!endpoint) {
    return NextResponse.json(
      { error: 'PATHAO_CREATE_ORDER_ENDPOINT is not configured' },
      { status: 501 }
    );
  }

  const order = await prisma.order.findFirst({
    where: { OR: [{ id: orderId }, { orderNumber: orderId }] },
    include: { shippingAddress: true, user: true },
  });
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  if (!order.shippingAddress?.pathaoCityId || !order.shippingAddress?.pathaoZoneId) {
    return NextResponse.json({ error: 'Address missing Pathao city/zone IDs' }, { status: 400 });
  }
  if (order.pathaoConsignmentId) {
    return NextResponse.json(
      {
        success: true,
        alreadyDispatched: true,
        consignmentId: order.pathaoConsignmentId,
        trackingCode: order.pathaoTrackingCode ?? order.trackingNumber,
      },
      { status: 200 }
    );
  }

  const response = await pathaoRequest<Record<string, unknown>>(endpoint, {
    store_id: Number(process.env.PATHAO_STORE_ID),
    merchant_order_id: order.orderNumber,
    recipient_name:
      `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`.trim() ||
      `${order.user.firstName ?? ''} ${order.user.lastName ?? ''}`.trim() ||
      'Customer',
    recipient_phone: order.shippingAddress.phone || order.user.phone || '',
    recipient_address: [order.shippingAddress.street1, order.shippingAddress.street2, order.shippingAddress.city]
      .filter(Boolean)
      .join(', '),
    recipient_city: order.shippingAddress.pathaoCityId,
    recipient_zone: order.shippingAddress.pathaoZoneId,
    recipient_area: order.shippingAddress.pathaoAreaId ?? undefined,
    amount_to_collect:
      order.paymentMethod?.toLowerCase().includes('cod') || order.paymentStatus !== 'COMPLETED'
        ? Number(order.total)
        : 0,
  });

  const data = (response.data ?? response) as unknown;
  const consignmentId =
    extractField(data, ['consignment_id', 'order_id', 'id']) ??
    extractField(response, ['consignment_id', 'order_id', 'id']);
  const trackingCode =
    extractField(data, ['tracking_number', 'tracking_no']) ??
    extractField(response, ['tracking_number', 'tracking_no']);
  const status =
    extractField(data, ['status', 'delivery_status']) ??
    extractField(response, ['status', 'delivery_status']) ??
    'Order Created';

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      shippingMethod: 'pathao',
      pathaoStatus: status,
      pathaoConsignmentId: consignmentId ?? null,
      pathaoTrackingCode: trackingCode ?? null,
      trackingNumber: trackingCode ?? order.trackingNumber,
      pathaoSentAt: new Date(),
      shippedAt: order.shippedAt ?? new Date(),
      status: order.status === 'PENDING' || order.status === 'CONFIRMED' ? 'SHIPPED' : order.status,
    },
  });

  return NextResponse.json({
    success: true,
    orderId: updated.id,
    orderNumber: updated.orderNumber,
    pathaoStatus: updated.pathaoStatus,
    consignmentId: updated.pathaoConsignmentId,
    trackingCode: updated.pathaoTrackingCode ?? updated.trackingNumber,
  });
}
