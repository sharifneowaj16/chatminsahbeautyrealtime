import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';
import { extractVariantWeightKg, parseWeightToKg } from '@/lib/buy-now';
import { extractPathaoObject, getPathaoBaseUrl, pathaoRequest } from '@/lib/pathao';
import { Prisma } from '@/generated/prisma/client';

export const dynamic = 'force-dynamic';

const DEFAULT_CREATE_ORDER_ENDPOINT = '/aladdin/api/v1/orders';

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

function extractNumericField(data: unknown, keys: string[]): number | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const source = data as Record<string, unknown>;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return (value ?? {}) as Prisma.InputJsonValue;
}

function getPathaoCreateOrderEndpoint(): string {
  const rawEndpoint = process.env.PATHAO_CREATE_ORDER_ENDPOINT;
  const endpoint = rawEndpoint === undefined ? DEFAULT_CREATE_ORDER_ENDPOINT : rawEndpoint.trim();

  if (!endpoint) {
    throw new Error('PATHAO_CREATE_ORDER_ENDPOINT is empty');
  }

  if (/^https?:\/\//i.test(endpoint)) {
    throw new Error('PATHAO_CREATE_ORDER_ENDPOINT must be a path only');
  }

  if (!endpoint.startsWith('/')) {
    throw new Error('PATHAO_CREATE_ORDER_ENDPOINT must start with "/"');
  }

  return endpoint;
}

type DispatchOrderItem = {
  name: string;
  quantity: number;
  product: {
    weight: unknown;
    shippingWeight: string | null;
  } | null;
  variant: {
    attributes: unknown;
  } | null;
};

function calculateOrderWeightKg(items: DispatchOrderItem[]): number {
  if (!items.length) {
    return 0;
  }

  const weight = items.reduce((sum, item) => {
    const variantWeightKg = item.variant ? extractVariantWeightKg(item.variant.attributes) : null;
    const productWeightKg =
      parseWeightToKg(item.product?.weight?.valueOf?.() ?? item.product?.weight) ??
      parseWeightToKg(item.product?.shippingWeight);
    const itemWeight = Number(variantWeightKg ?? productWeightKg ?? 0.2);
    return sum + itemWeight * Math.max(1, item.quantity);
  }, 0);

  if (!Number.isFinite(weight) || weight <= 0) {
    return 0;
  }

  return Number(Math.max(0.5, Math.min(weight, 10)).toFixed(3));
}

function generateItemDescription(items: DispatchOrderItem[]): string {
  return items
    .map((item) => `${item.name} x${Math.max(1, item.quantity)}`)
    .join(', ')
    .slice(0, 255);
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

  let endpoint: string;
  try {
    endpoint = getPathaoCreateOrderEndpoint();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid Pathao endpoint configuration' },
      { status: 501 }
    );
  }

  const order = await prisma.order.findFirst({
    where: { OR: [{ id: orderId }, { orderNumber: orderId }] },
    include: {
      shippingAddress: true,
      user: true,
      items: {
        include: {
          product: {
            select: {
              weight: true,
              shippingWeight: true,
            },
          },
          variant: {
            select: {
              attributes: true,
            },
          },
        },
      },
    },
  });
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  if (order.pathaoConsignmentId) {
    return NextResponse.json(
      {
        success: true,
        alreadyDispatched: true,
        consignmentId: order.pathaoConsignmentId,
        trackingCode: order.pathaoTrackingCode ?? order.trackingNumber,
        shippingCost: Number(order.shippingCost),
      },
      { status: 200 }
    );
  }

  if (!order.shippingAddress) {
    return NextResponse.json({ error: 'Order is missing a shipping address' }, { status: 400 });
  }

  const storeId = Number(process.env.PATHAO_STORE_ID);
  if (!storeId) {
    return NextResponse.json({ error: 'PATHAO_STORE_ID is not configured' }, { status: 501 });
  }

  const recipientName =
    `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`.trim() ||
    `${order.user.firstName ?? ''} ${order.user.lastName ?? ''}`.trim();
  const recipientPhone = order.shippingAddress.phone || order.user.phone || '';
  const recipientAddress = order.shippingAddress.street1 || '';
  const totalQuantity = order.items.reduce((sum, item) => sum + Math.max(1, item.quantity), 0);
  const finalWeightKg = calculateOrderWeightKg(order.items);
  const isCOD = order.paymentMethod?.toLowerCase() === 'cod';

  if (!recipientName) {
    return NextResponse.json({ error: 'Missing recipient_name' }, { status: 400 });
  }
  if (!recipientPhone) {
    return NextResponse.json({ error: 'Missing recipient_phone' }, { status: 400 });
  }
  if (!recipientAddress) {
    return NextResponse.json({ error: 'Missing recipient_address' }, { status: 400 });
  }
  if (finalWeightKg <= 0) {
    return NextResponse.json({ error: 'Invalid item_weight' }, { status: 400 });
  }

  const createOrderPayload = {
    store_id: storeId,
    merchant_order_id: order.id.toString(),
    recipient_name: recipientName,
    recipient_phone: recipientPhone,
    recipient_address: recipientAddress,
    ...(order.shippingAddress.pathaoCityId ? { recipient_city: order.shippingAddress.pathaoCityId } : {}),
    ...(order.shippingAddress.pathaoZoneId ? { recipient_zone: order.shippingAddress.pathaoZoneId } : {}),
    ...(order.shippingAddress.pathaoAreaId ? { recipient_area: order.shippingAddress.pathaoAreaId } : {}),
    delivery_type: 48,
    item_type: 2,
    special_instruction: order.customerNote || order.adminNote || '',
    item_quantity: totalQuantity,
    item_weight: finalWeightKg,
    item_description: generateItemDescription(order.items),
    amount_to_collect: isCOD ? Number(order.total) : 0,
  };

  const finalUrl = `${getPathaoBaseUrl()}${endpoint}`;
  console.info('Pathao create-order request', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    url: finalUrl,
    payload: createOrderPayload,
  });

  try {
    const response = await pathaoRequest<Record<string, unknown>>(endpoint, createOrderPayload);
    console.info('Pathao create-order response', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      response,
    });

    const data = extractPathaoObject(response);
    const consignmentId =
      extractField(data, ['consignment_id', 'consignmentId', 'order_id', 'id']) ??
      extractField(response, ['consignment_id', 'order_id', 'id']);
    const trackingCode =
      extractField(data, ['tracking_number', 'tracking_no', 'trackingCode']) ??
      extractField(response, ['tracking_number', 'tracking_no']);
    const status =
      extractField(data, ['status', 'delivery_status']) ??
      extractField(response, ['status', 'delivery_status']) ??
      'Order Created';
    const deliveryFee =
      extractNumericField(data, ['delivery_fee']) ??
      extractNumericField(response, ['delivery_fee']);

    const updateData = {
      shippingMethod: 'pathao',
      pathaoStatus: status,
      pathaoConsignmentId: consignmentId ?? null,
      pathaoTrackingCode: trackingCode ?? null,
      trackingNumber: trackingCode ?? order.trackingNumber,
      pathaoSentAt: new Date(),
      pathaoResponse: toJsonInput(response),
      ...(deliveryFee !== null ? { shippingCost: deliveryFee } : {}),
      shippedAt: order.shippedAt ?? new Date(),
      status: order.status === 'PENDING' || order.status === 'CONFIRMED' ? 'SHIPPED' : order.status,
    } as unknown as Prisma.OrderUpdateInput;

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      pathaoStatus: updated.pathaoStatus,
      consignmentId: updated.pathaoConsignmentId,
      trackingCode: updated.pathaoTrackingCode ?? updated.trackingNumber,
      shippingCost: Number(updated.shippingCost),
    });
  } catch (error) {
    console.error('Pathao create-order failed', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Pathao create-order failed' },
      { status: 502 }
    );
  }
}
