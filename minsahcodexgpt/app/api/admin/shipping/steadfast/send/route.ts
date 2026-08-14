/**
 * POST /api/admin/shipping/steadfast/send
 *
 * Send a single order to Steadfast courier.
 * Saves consignment ID and tracking code back to the Order.
 *
 * Body: { orderId: string }
 * orderId can be the DB id OR orderNumber
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';
import {
  createSteadfastOrder,
  mapSteadfastStatusToOrderStatus,
  SteadfastError,
} from '@/lib/steadfast/client';
import {
  calculateCourierSendAccounting,
  extractCourierResponseCharge,
} from '@/lib/courier-send-accounting';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const accessToken = request.cookies.get('admin_access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const payload = await verifyAdminAccessToken(accessToken);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let orderId: string;
  let codOverride: number | undefined;
  let noteOverride: string | undefined;

  try {
    const body = await request.json();
    orderId = body.orderId;
    codOverride = body.codAmount;
    noteOverride = body.note;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }

  // ── Fetch order ───────────────────────────────────────────────────────────
  const order = await prisma.order.findFirst({
    where: { OR: [{ id: orderId }, { orderNumber: orderId }] },
    include: {
      shippingAddress: true,
      user: { select: { firstName: true, lastName: true, phone: true, email: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status === 'CANCELLED' || order.status === 'DELIVERED') {
    return NextResponse.json(
      { error: `Cannot dispatch a ${order.status.toLowerCase()} order` },
      { status: 400 }
    );
  }

  // Prevent double-dispatch
  if (order.steadfastConsignmentId) {
    return NextResponse.json(
      {
        error: 'Order already sent to Steadfast',
        consignmentId: order.steadfastConsignmentId,
        trackingCode: order.steadfastTrackingCode,
        shippingCost: Number(order.shippingCost),
        customerDeliveryCharge: Number(order.shippingCost),
        courierDeliveryCharge: order.courierDeliveryCharge === null ? null : Number(order.courierDeliveryCharge),
        deliveryDiscountAmount: Number(order.deliveryDiscountAmount),
      },
      { status: 409 }
    );
  }

  // ── Build Steadfast payload ───────────────────────────────────────────────
  const addr = order.shippingAddress;
  if (!addr) {
    return NextResponse.json(
      { error: 'Order has no shipping address' },
      { status: 400 }
    );
  }

  const recipientName =
    `${addr.firstName} ${addr.lastName}`.trim() ||
    `${order.user.firstName ?? ''} ${order.user.lastName ?? ''}`.trim() ||
    'Customer';

  const recipientPhone = addr.phone || order.user.phone || '';
  if (!recipientPhone) {
    return NextResponse.json(
      { error: 'Recipient phone number is missing' },
      { status: 400 }
    );
  }

  const recipientAddress = [
    addr.street1,
    addr.street2,
    addr.city,
    addr.state,
  ]
    .filter(Boolean)
    .join(', ');

  // COD = 0 for prepaid, order total for COD
  const isCOD =
    order.paymentMethod?.toLowerCase().includes('cod') ||
    order.paymentMethod?.toLowerCase().includes('cash') ||
    order.paymentStatus !== 'COMPLETED';

  const codAmount =
    codOverride !== undefined
      ? codOverride
      : isCOD
      ? Number(order.total)
      : 0;

  // ── Call Steadfast API ────────────────────────────────────────────────────
  try {
    const result = await createSteadfastOrder({
      invoice: order.orderNumber,
      recipient_name: recipientName,
      recipient_phone: recipientPhone,
      recipient_address: recipientAddress,
      cod_amount: codAmount,
      note: noteOverride || order.customerNote || undefined,
    });

    const consignment = result.consignment;
    const courierResponseCharge =
      extractCourierResponseCharge(consignment) ?? extractCourierResponseCharge(result);
    const courierAccounting = calculateCourierSendAccounting({
      customerShippingCost: order.shippingCost,
      currentCourierDeliveryCharge: order.courierDeliveryCharge,
      currentDeliveryDiscountAmount: order.deliveryDiscountAmount,
      courierResponseCharge,
    });

    // ── Save to DB ────────────────────────────────────────────────────────
    const mappedStatus = mapSteadfastStatusToOrderStatus(consignment.status);

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        steadfastConsignmentId: String(consignment.id),
        steadfastTrackingCode: consignment.tracking_code,
        steadfastStatus: consignment.status,
        steadfastSentAt: new Date(),
        // Auto-advance order status
        status: mappedStatus ?? 'SHIPPED',
        shippingMethod: 'steadfast',
        trackingNumber: consignment.tracking_code,
        shippedAt: new Date(),
        // Phase 4F safety: never write courier actual fee into shippingCost.
        // shippingCost remains the customer-facing delivery charge locked at order creation.
        ...(courierAccounting.hasCourierResponseCharge
          ? {
              courierDeliveryCharge: courierAccounting.courierDeliveryCharge,
              deliveryDiscountAmount: courierAccounting.deliveryDiscountAmount,
            }
          : {}),
      },
    });

    return NextResponse.json({
      success: true,
      consignmentId: consignment.id,
      trackingCode: consignment.tracking_code,
      deliveryStatus: consignment.status,
      shippingCost: Number(updatedOrder.shippingCost),
      customerDeliveryCharge: Number(updatedOrder.shippingCost),
      courierDeliveryCharge: updatedOrder.courierDeliveryCharge === null ? null : Number(updatedOrder.courierDeliveryCharge),
      deliveryDiscountAmount: Number(updatedOrder.deliveryDiscountAmount),
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
      },
    });
  } catch (err) {
    if (err instanceof SteadfastError) {
      console.error('[Steadfast] Send order failed:', err.message, err.raw);
      return NextResponse.json(
        { error: `Steadfast error: ${err.message}`, details: err.raw },
        { status: err.statusCode ?? 502 }
      );
    }
    console.error('[Steadfast] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Failed to send order to Steadfast' },
      { status: 500 }
    );
  }
}
