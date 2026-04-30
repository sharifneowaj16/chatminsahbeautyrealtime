import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { createHash } from 'node:crypto';

export const dynamic = 'force-dynamic';

const PATHAO_STATUS_EVENTS = new Set([
  'Order Created',
  'Order Updated',
  'Pickup Requested',
  'Assigned For Pickup',
  'Pickup',
  'Pickup Failed',
  'Pickup Cancelled',
  'At the Sorting Hub',
  'In Transit',
  'Received at Last Mile Hub',
  'Assigned for Delivery',
  'Delivered',
  'Partial Delivery',
  'Return',
  'Delivery Failed',
  'On Hold',
  'Payment Invoice',
  'Paid Return',
  'Exchange',
  'Return Id Created',
  'Return In Transit',
  'Returned To Merchant',
]);

const IGNORE_ONLY_EVENTS = new Set(['Store Created', 'Store Updated']);

function extractString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number') {
      return String(value);
    }
  }
  return null;
}

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return (value ?? {}) as Prisma.InputJsonValue;
}

function mapPathaoEventToOrderStatus(
  eventName: string
): 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | null {
  switch (eventName) {
    case 'Order Created':
      return 'PENDING';
    case 'Order Updated':
    case 'Pickup Requested':
    case 'Assigned For Pickup':
    case 'Pickup':
    case 'At the Sorting Hub':
    case 'In Transit':
    case 'Received at Last Mile Hub':
    case 'Assigned for Delivery':
    case 'On Hold':
      return 'SHIPPED';
    case 'Delivered':
    case 'Partial Delivery':
      return 'DELIVERED';
    case 'Pickup Failed':
    case 'Pickup Cancelled':
    case 'Delivery Failed':
    case 'Return':
    case 'Paid Return':
    case 'Exchange':
    case 'Return Id Created':
    case 'Return In Transit':
    case 'Returned To Merchant':
      return 'CANCELLED';
    case 'Payment Invoice':
      return 'PROCESSING';
    default:
      return null;
  }
}

async function processPathaoEvent(payload: Record<string, unknown>, eventId: string) {
  const eventName = extractString(payload, ['event', 'event_name', 'status']) ?? '';

  if (!eventName || IGNORE_ONLY_EVENTS.has(eventName) || !PATHAO_STATUS_EVENTS.has(eventName)) {
    if (eventName) {
      console.log('Pathao webhook ignored event:', eventName);
    }
    await prisma.pathaoWebhookEvent.update({
      where: { id: eventId },
      data: {
        processingStatus: 'IGNORED',
        processedAt: new Date(),
      },
    });
    return;
  }

  const data =
    payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
      ? (payload.data as Record<string, unknown>)
      : {};

  const orderNumber =
    extractString(data, ['order_id', 'merchant_order_id', 'invoice']) ??
    extractString(payload, ['order_id', 'merchant_order_id', 'invoice']);

  const consignmentId =
    extractString(data, ['consignment_id', 'consignmentId']) ??
    extractString(payload, ['consignment_id', 'consignmentId']);
  const trackingCode =
    extractString(data, ['tracking_number', 'tracking_no']) ??
    extractString(payload, ['tracking_number', 'tracking_no']);

  if (!orderNumber && !trackingCode && !consignmentId) {
    console.log('Pathao webhook missing order identifiers');
    await prisma.pathaoWebhookEvent.update({
      where: { id: eventId },
      data: {
        processingStatus: 'NO_ORDER_REF',
        processedAt: new Date(),
        error: 'Missing order_id/merchant_order_id/invoice, tracking identifiers, and consignment_id',
      },
    });
    return;
  }

  const whereConditions = [
    ...(orderNumber ? [{ orderNumber }, { id: orderNumber }] : []),
    ...(trackingCode ? [{ trackingNumber: trackingCode }] : []),
    ...(consignmentId ? [{ pathaoConsignmentId: consignmentId }] : []),
    ...(trackingCode ? [{ pathaoTrackingCode: trackingCode }] : []),
  ];

  const order = await prisma.order.findFirst({
    where: { OR: whereConditions },
    select: {
      id: true,
      status: true,
      trackingNumber: true,
      pathaoStatus: true,
      pathaoTrackingCode: true,
      pathaoConsignmentId: true,
    },
  });

  if (!order) {
    console.log('Pathao webhook order not found', { orderNumber, trackingCode, consignmentId, eventName });
    await prisma.pathaoWebhookEvent.update({
      where: { id: eventId },
      data: {
        processingStatus: 'NO_ORDER_FOUND',
        processedAt: new Date(),
      },
    });
    return;
  }

  const mappedStatus = mapPathaoEventToOrderStatus(eventName);
  const now = new Date();

  const updateData: Record<string, unknown> = {
    shippingMethod: 'pathao',
    pathaoStatus: eventName,
    pathaoSentAt: now,
  };

  if (trackingCode && trackingCode !== order.trackingNumber) {
    updateData.trackingNumber = trackingCode;
  }
  if (consignmentId && consignmentId !== order.pathaoConsignmentId) {
    updateData.pathaoConsignmentId = consignmentId;
  }
  if (trackingCode && trackingCode !== order.pathaoTrackingCode) {
    updateData.pathaoTrackingCode = trackingCode;
  }
  if (mappedStatus && mappedStatus !== order.status) {
    updateData.status = mappedStatus;
    if (mappedStatus === 'SHIPPED') {
      updateData.shippedAt = now;
    }
    if (mappedStatus === 'DELIVERED') {
      updateData.deliveredAt = now;
    }
    if (mappedStatus === 'CANCELLED') {
      updateData.cancelledAt = now;
    }
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: updateData,
    }),
    prisma.pathaoWebhookEvent.update({
      where: { id: eventId },
      data: {
        orderId: order.id,
        processingStatus: 'PROCESSED',
        processedAt: new Date(),
      },
    }),
  ]);
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('X-PATHAO-Signature')?.trim() ?? null;

  let payload: Record<string, unknown> = {};
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  const eventName = extractString(payload, ['event', 'event_name', 'status']);
  if (eventName === 'webhook_integration') {
    const response = NextResponse.json({ accepted: true }, { status: 202 });
    response.headers.set(
      'X-Pathao-Merchant-Webhook-Integration-Secret',
      process.env.PATHAO_WEBHOOK_INTEGRATION_SECRET || ''
    );
    return response;
  }

  const incomingSignature = signature;
  const expectedSignature = process.env.PATHAO_WEBHOOK_SECRET?.trim();
  if (!incomingSignature || !expectedSignature || incomingSignature !== expectedSignature) {
    return NextResponse.json({ error: 'Unauthorized webhook request.' }, { status: 401 });
  }

  const data =
    payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
      ? (payload.data as Record<string, unknown>)
      : {};
  const eventKey = createHash('sha256')
    .update(
      JSON.stringify({
        event: extractString(payload, ['event', 'event_name', 'status']),
        orderRef:
          extractString(data, ['order_id', 'merchant_order_id', 'invoice']) ??
          extractString(payload, ['order_id', 'merchant_order_id', 'invoice']),
        consignmentId:
          extractString(data, ['consignment_id', 'tracking_number', 'tracking_no']) ??
          extractString(payload, ['consignment_id', 'tracking_number', 'tracking_no']),
        updatedAt:
          extractString(data, ['updated_at', 'updatedAt']) ??
          extractString(payload, ['updated_at', 'updatedAt']),
        payload,
      })
    )
    .digest('hex');

  const existing = await prisma.pathaoWebhookEvent.findUnique({
    where: { eventKey },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ accepted: true, duplicate: true }, { status: 202 });
  }

  const event = await prisma.pathaoWebhookEvent.create({
    data: {
      eventKey,
      eventType: extractString(payload, ['event', 'event_name', 'status']) ?? 'unknown',
      orderRef:
        extractString(data, ['order_id', 'merchant_order_id', 'invoice']) ??
        extractString(payload, ['order_id', 'merchant_order_id', 'invoice']),
      consignmentId:
        extractString(data, ['consignment_id', 'tracking_number', 'tracking_no']) ??
        extractString(payload, ['consignment_id', 'tracking_number', 'tracking_no']),
      signature: incomingSignature,
      payload: toJsonInput(payload),
      processingStatus: 'RECEIVED',
    },
    select: { id: true },
  });

  void processPathaoEvent(payload, event.id).catch(async (error) => {
    console.error('Pathao webhook async processing failed:', error);
    await prisma.pathaoWebhookEvent.update({
      where: { id: event.id },
      data: {
        processingStatus: 'FAILED',
        processedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  });

  return NextResponse.json({ accepted: true }, { status: 202 });
}
