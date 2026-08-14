/**
 * POST /api/admin/shipping/steadfast/send-bulk
 *
 * Send multiple orders to Steadfast in one API call.
 * Body: { orderIds: string[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';
import {
  createSteadfastBulkOrders,
  mapSteadfastStatusToOrderStatus,
  SteadfastError,
  type SteadfastCreateOrderPayload,
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
  let orderIds: string[];
  try {
    const body = await request.json();
    orderIds = body.orderIds;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return NextResponse.json({ error: 'orderIds array is required' }, { status: 400 });
  }

  if (orderIds.length > 50) {
    return NextResponse.json(
      { error: 'Maximum 50 orders per bulk dispatch' },
      { status: 400 }
    );
  }

  // ── Fetch orders ──────────────────────────────────────────────────────────
  const orders = await prisma.order.findMany({
    where: {
      OR: orderIds.map((id) => [{ id }, { orderNumber: id }]).flat(),
      // Exclude already dispatched, cancelled, or delivered
      steadfastConsignmentId: null,
      status: { notIn: ['CANCELLED', 'DELIVERED', 'REFUNDED'] },
    },
    include: {
      shippingAddress: true,
      user: { select: { firstName: true, lastName: true, phone: true } },
    },
  });

  if (orders.length === 0) {
    return NextResponse.json(
      { error: 'No eligible orders found (already dispatched, cancelled, or not found)' },
      { status: 400 }
    );
  }

  // ── Build Steadfast payloads ──────────────────────────────────────────────
  const skipped: Array<{ orderId: string; reason: string }> = [];
  const payloads: Array<{ orderId: string; payload: SteadfastCreateOrderPayload }> = [];

  for (const order of orders) {
    const addr = order.shippingAddress;
    if (!addr) {
      skipped.push({ orderId: order.orderNumber, reason: 'No shipping address' });
      continue;
    }

    const recipientPhone = addr.phone || order.user.phone || '';
    if (!recipientPhone) {
      skipped.push({ orderId: order.orderNumber, reason: 'No phone number' });
      continue;
    }

    const isCOD =
      order.paymentMethod?.toLowerCase().includes('cod') ||
      order.paymentMethod?.toLowerCase().includes('cash') ||
      order.paymentStatus !== 'COMPLETED';

    payloads.push({
      orderId: order.id,
      payload: {
        invoice: order.orderNumber,
        recipient_name:
          `${addr.firstName} ${addr.lastName}`.trim() ||
          `${order.user.firstName ?? ''} ${order.user.lastName ?? ''}`.trim() ||
          'Customer',
        recipient_phone: recipientPhone,
        recipient_address: [addr.street1, addr.street2, addr.city, addr.state]
          .filter(Boolean)
          .join(', '),
        cod_amount: isCOD ? Number(order.total) : 0,
        note: order.customerNote || undefined,
      },
    });
  }

  if (payloads.length === 0) {
    return NextResponse.json(
      { error: 'No valid orders to dispatch', skipped },
      { status: 400 }
    );
  }

  // ── Call Steadfast Bulk API ───────────────────────────────────────────────
  try {
    const result = await createSteadfastBulkOrders(
      payloads.map((p) => p.payload)
    );

    // Map invoice → DB order/accounting data
    const invoiceToOrder = new Map(
      payloads.map((p) => {
        const sourceOrder = orders.find((order) => order.id === p.orderId);
        return [p.payload.invoice, sourceOrder];
      })
    );

    // ── Update DB for successful consignments ──────────────────────────────
    const updatedOrders = await Promise.all(
      result.data.success.map((consignment) => {
        const sourceOrder = invoiceToOrder.get(consignment.invoice);
        if (!sourceOrder) return Promise.resolve(null);

        const courierResponseCharge =
          extractCourierResponseCharge(consignment) ?? extractCourierResponseCharge(result);
        const courierAccounting = calculateCourierSendAccounting({
          customerShippingCost: sourceOrder.shippingCost,
          currentCourierDeliveryCharge: sourceOrder.courierDeliveryCharge,
          currentDeliveryDiscountAmount: sourceOrder.deliveryDiscountAmount,
          courierResponseCharge,
        });

        const mappedStatus = mapSteadfastStatusToOrderStatus(consignment.status);
        return prisma.order.update({
          where: { id: sourceOrder.id },
          data: {
            steadfastConsignmentId: String(consignment.id),
            steadfastTrackingCode: consignment.tracking_code,
            steadfastStatus: consignment.status,
            steadfastSentAt: new Date(),
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
      })
    );

    const orderAccountingByInvoice = new Map(
      result.data.success.map((consignment, index) => [consignment.invoice, updatedOrders[index]])
    );

    return NextResponse.json({
      success: true,
      dispatched: result.data.success.length,
      failed: result.data.failed.length,
      skipped: skipped.length,
      details: {
        success: result.data.success.map((c) => {
          const updatedOrder = orderAccountingByInvoice.get(c.invoice);
          return {
            invoice: c.invoice,
            consignmentId: c.id,
            trackingCode: c.tracking_code,
            shippingCost: updatedOrder ? Number(updatedOrder.shippingCost) : undefined,
            customerDeliveryCharge: updatedOrder ? Number(updatedOrder.shippingCost) : undefined,
            courierDeliveryCharge: updatedOrder?.courierDeliveryCharge === null || updatedOrder?.courierDeliveryCharge === undefined
              ? null
              : Number(updatedOrder.courierDeliveryCharge),
            deliveryDiscountAmount: updatedOrder ? Number(updatedOrder.deliveryDiscountAmount) : undefined,
          };
        }),
        failed: result.data.failed,
        skipped,
      },
    });
  } catch (err) {
    if (err instanceof SteadfastError) {
      return NextResponse.json(
        { error: `Steadfast error: ${err.message}` },
        { status: err.statusCode ?? 502 }
      );
    }
    console.error('[Steadfast] Bulk dispatch error:', err);
    return NextResponse.json(
      { error: 'Failed to bulk dispatch orders' },
      { status: 500 }
    );
  }
}
