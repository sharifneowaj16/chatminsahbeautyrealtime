import 'server-only';

import prisma from '@/lib/prisma';
import { withRedisLock } from '@/lib/cache/redis';
import {
  createSteadfastOrder,
  mapSteadfastStatusToOrderStatus,
  SteadfastError,
} from '@/lib/steadfast/client';
import {
  calculateCourierSendAccounting,
  extractCourierResponseCharge,
} from '@/lib/courier-send-accounting';

export type SteadfastDeliveryResult =
  | {
      success: true;
      alreadyDispatched?: boolean;
      orderId: string;
      orderNumber: string;
      steadfastStatus: string | null;
      consignmentId: string | null;
      trackingCode: string | null;
      shippingCost: number;
      customerDeliveryCharge: number;
      courierDeliveryCharge: number | null;
      deliveryDiscountAmount: number;
    }
  | {
      success: false;
      error: string;
    };

export type CreateSteadfastDeliveryOptions = {
  codOverride?: number;
  noteOverride?: string;
  actorId?: string;
};

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (
    value &&
    typeof value === 'object' &&
    'toNumber' in value &&
    typeof (value as { toNumber?: unknown }).toNumber === 'function'
  ) {
    const parsed = (value as { toNumber: () => number }).toNumber();
    if (Number.isFinite(parsed)) return parsed;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dedupeParts(parts: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of parts) {
    const cleaned = part.trim().replace(/\s+/g, ' ');
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }
  return result;
}

function normalizeBangladeshPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('01')) return digits;
  if (digits.length === 13 && digits.startsWith('8801')) return `0${digits.slice(3)}`;
  if (digits.length === 10 && digits.startsWith('1')) return `0${digits}`;
  return digits;
}

export async function createSteadfastDeliveryForOrder(
  orderId: string,
  options: CreateSteadfastDeliveryOptions = {}
): Promise<SteadfastDeliveryResult> {
  const initialOrder = await prisma.order.findFirst({
    where: { OR: [{ id: orderId }, { orderNumber: orderId }] },
    select: { id: true },
  });

  if (!initialOrder) {
    return { success: false, error: 'Order not found' };
  }

  const lock = await withRedisLock(
    `courier:dispatch:${initialOrder.id}`,
    15_000,
    async (): Promise<SteadfastDeliveryResult> => {
      try {
        const order = await prisma.order.findUnique({
          where: { id: initialOrder.id },
          include: {
            shippingAddress: true,
            user: { select: { firstName: true, lastName: true, phone: true } },
          },
        });

        if (!order) {
          return { success: false, error: 'Order not found' };
        }

        if (order.steadfastConsignmentId || order.steadfastTrackingCode) {
          return {
            success: true,
            alreadyDispatched: true,
            orderId: order.id,
            orderNumber: order.orderNumber,
            steadfastStatus: order.steadfastStatus,
            consignmentId: order.steadfastConsignmentId,
            trackingCode: order.steadfastTrackingCode ?? order.trackingNumber,
            shippingCost: toNumber(order.shippingCost),
            customerDeliveryCharge: toNumber(order.shippingCost),
            courierDeliveryCharge:
              order.courierDeliveryCharge === null ? null : toNumber(order.courierDeliveryCharge),
            deliveryDiscountAmount: toNumber(order.deliveryDiscountAmount),
          };
        }

        if (order.pathaoConsignmentId || order.pathaoTrackingCode) {
          return {
            success: false,
            error: `Order is already dispatched via Pathao (${order.pathaoTrackingCode || order.pathaoConsignmentId})`,
          };
        }

        if (order.pathaoBookingStatus === 'BOOKING_IN_PROGRESS') {
          return {
            success: false,
            error: 'Pathao booking is currently in progress for this order. Please wait.',
          };
        }

        if (
          order.status === 'CANCELLED' ||
          order.status === 'DELIVERED' ||
          order.status === 'REFUNDED' ||
          order.cancelledAt ||
          order.deliveredAt ||
          order.refundedAt
        ) {
          return {
            success: false,
            error: `Cannot dispatch a ${order.status.toLowerCase()} order`,
          };
        }

        const addr = order.shippingAddress;
        if (!addr) {
          return { success: false, error: 'Order has no shipping address' };
        }

        const recipientName =
          `${addr.firstName} ${addr.lastName}`.trim() ||
          `${order.user.firstName ?? ''} ${order.user.lastName ?? ''}`.trim() ||
          'Customer';

        const recipientPhone = normalizeBangladeshPhone(addr.phone || order.user.phone || '');
        if (!/^01\d{9}$/.test(recipientPhone)) {
          return { success: false, error: 'Recipient phone number is invalid or missing' };
        }

        const recipientAddress = dedupeParts([
          addr.street1 ?? '',
          addr.street2 ?? '',
          addr.city ?? '',
          addr.state ?? '',
        ]).join(', ');

        if (!recipientAddress) {
          return { success: false, error: 'Recipient address is missing' };
        }

        const paymentMethod = order.paymentMethod?.toLowerCase() ?? '';
        const isCOD =
          paymentMethod === 'cod' ||
          paymentMethod === 'cash_on_delivery' ||
          paymentMethod.includes('cod') ||
          paymentMethod.includes('cash');

        if (!isCOD && order.paymentStatus !== 'COMPLETED') {
          return {
            success: false,
            error: 'ONLINE_PAYMENT_NOT_CAPTURED: Steadfast dispatch is blocked until online payment is completed',
          };
        }

        const orderTotal = toNumber(order.total);
        const advancePaid = toNumber(order.advancePaidAmount);
        const explicitCod = toNumber(order.codCollectionAmount);

        const codAmount =
          options.codOverride !== undefined
            ? Math.max(0, Math.round(options.codOverride))
            : isCOD
              ? Math.max(
                  0,
                  Math.round(
                    explicitCod > 0
                      ? explicitCod
                      : advancePaid > 0
                        ? Math.max(0, orderTotal - advancePaid)
                        : orderTotal
                  )
                )
              : 0;

        const result = await createSteadfastOrder({
          invoice: order.orderNumber,
          recipient_name: recipientName.slice(0, 100),
          recipient_phone: recipientPhone,
          recipient_address: recipientAddress.slice(0, 250),
          cod_amount: codAmount,
          note: (options.noteOverride || order.customerNote || order.adminNote || '').trim().slice(0, 250) || undefined,
        });

        const rawResult = result as unknown as Record<string, unknown> | undefined;
        const rawConsignment =
          rawResult?.consignment && typeof rawResult.consignment === 'object'
            ? (rawResult.consignment as Record<string, unknown>)
            : undefined;
        const consignmentIdRaw = rawConsignment?.consignment_id ?? rawConsignment?.id;
        const consignmentId = consignmentIdRaw != null && String(consignmentIdRaw).trim()
          ? String(consignmentIdRaw).trim()
          : null;
        const trackingCode =
          typeof rawConsignment?.tracking_code === 'string' && rawConsignment.tracking_code.trim()
            ? rawConsignment.tracking_code.trim()
            : null;

        const apiStatus = typeof rawResult?.status === 'number' ? rawResult.status : 200;
        if (apiStatus !== 200 || !rawConsignment || (!consignmentId && !trackingCode)) {
          const errMessage =
            typeof rawResult?.message === 'string' && rawResult.message.trim()
              ? rawResult.message.trim()
              : rawResult?.errors
                ? JSON.stringify(rawResult.errors).slice(0, 180)
                : `Steadfast returned invalid consignment response (status ${apiStatus})`;
          console.error('[SteadfastDelivery] Invalid consignment response:', rawResult);
          return { success: false, error: errMessage };
        }

        const steadfastStatus =
          typeof rawConsignment.status === 'string' && rawConsignment.status.trim()
            ? rawConsignment.status.trim()
            : 'in_review';

        const courierResponseCharge =
          extractCourierResponseCharge(result.consignment) ?? extractCourierResponseCharge(result);
        const courierAccounting = calculateCourierSendAccounting({
          customerShippingCost: order.shippingCost,
          currentCourierDeliveryCharge: order.courierDeliveryCharge,
          currentDeliveryDiscountAmount: order.deliveryDiscountAmount,
          courierResponseCharge,
        });

        const mappedStatus = mapSteadfastStatusToOrderStatus(steadfastStatus);
        const now = new Date();

        const updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: {
            steadfastConsignmentId: consignmentId,
            steadfastTrackingCode: trackingCode,
            steadfastStatus,
            steadfastSentAt: now,
            courierName: 'steadfast',
            courierConsignmentId: consignmentId,
            courierStatus: steadfastStatus,
            status: mappedStatus ?? 'SHIPPED',
            shippingMethod: 'steadfast',
            trackingNumber: trackingCode ?? order.trackingNumber,
            shippedAt: order.shippedAt ?? now,
            ...(courierAccounting.hasCourierResponseCharge
              ? {
                  courierDeliveryCharge: courierAccounting.courierDeliveryCharge,
                  deliveryDiscountAmount: courierAccounting.deliveryDiscountAmount,
                }
              : {}),
          },
        });

        return {
          success: true,
          alreadyDispatched: false,
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          steadfastStatus,
          consignmentId,
          trackingCode,
          shippingCost: toNumber(updatedOrder.shippingCost),
          customerDeliveryCharge: toNumber(updatedOrder.shippingCost),
          courierDeliveryCharge:
            updatedOrder.courierDeliveryCharge === null
              ? null
              : toNumber(updatedOrder.courierDeliveryCharge),
          deliveryDiscountAmount: toNumber(updatedOrder.deliveryDiscountAmount),
        };
      } catch (err) {
        if (err instanceof SteadfastError) {
          console.error('[SteadfastDelivery] API error:', err.message, err.raw);
          return { success: false, error: `Steadfast error: ${err.message}` };
        }
        const msg = err instanceof Error ? err.message : 'Failed to create Steadfast consignment';
        console.error('[SteadfastDelivery] Unexpected error:', err);
        return { success: false, error: msg };
      }
    }
  );

  if (!lock.acquired) {
    return { success: false, error: 'Courier booking already in progress for this order. Please wait.' };
  }

  return lock.value;
}
