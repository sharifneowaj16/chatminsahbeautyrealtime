import prisma from '@/lib/prisma';
import { extractVariantWeightKg, parseWeightToKg } from '@/lib/buy-now';
import {
  extractPathaoObject,
  getPathaoBaseUrl,
  pathaoRequest,
  resolvePathaoStore,
} from '@/lib/pathao';
import { Prisma } from '@/generated/prisma/client';

const DEFAULT_CREATE_ORDER_ENDPOINT = '/aladdin/api/v1/orders';

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

export type PathaoDeliveryResult =
  | {
      success: true;
      alreadyDispatched?: boolean;
      orderId: string;
      orderNumber: string;
      pathaoStatus: string | null;
      consignmentId: string | null;
      trackingCode: string | null;
      shippingCost: number;
    }
  | {
      success: false;
      error: string;
    };

type CreatePathaoDeliveryOptions = {
  preserveOrderStatus?: boolean;
  saveFailureStatus?: boolean;
};

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
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return (value ?? {}) as Prisma.InputJsonValue;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (
    value &&
    typeof value === 'object' &&
    'toNumber' in value &&
    typeof (value as { toNumber?: unknown }).toNumber === 'function'
  ) {
    const parsed = (value as { toNumber: () => number }).toNumber();
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

async function savePathaoFailure(orderId: string, message: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      shippingMethod: 'pathao',
      pathaoStatus: 'Create failed',
      pathaoResponse: toJsonInput({
        error: message,
        failedAt: new Date().toISOString(),
      }),
    },
  });
}

export async function createPathaoDeliveryForOrder(
  orderId: string,
  options: CreatePathaoDeliveryOptions = {}
): Promise<PathaoDeliveryResult> {
  let resolvedOrderId: string | null = null;

  try {
    const endpoint = getPathaoCreateOrderEndpoint();
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
      throw new Error('Order not found');
    }

    resolvedOrderId = order.id;

    if (
      order.pathaoConsignmentId ||
      order.pathaoTrackingCode ||
      (order.pathaoSentAt && order.pathaoStatus && order.pathaoStatus !== 'Create failed')
    ) {
      return {
        success: true,
        alreadyDispatched: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        pathaoStatus: order.pathaoStatus,
        consignmentId: order.pathaoConsignmentId,
        trackingCode: order.pathaoTrackingCode ?? order.trackingNumber,
        shippingCost: toNumber(order.shippingCost),
      };
    }

    if (!order.shippingAddress) {
      throw new Error('Order is missing a shipping address');
    }

    const storeInfo = await resolvePathaoStore();
    const recipientName =
      `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`.trim() ||
      `${order.user.firstName ?? ''} ${order.user.lastName ?? ''}`.trim();
    const recipientPhone = order.shippingAddress.phone || order.user.phone || '';
    const recipientAddress = order.shippingAddress.street1 || '';
    const totalQuantity = order.items.reduce((sum, item) => sum + Math.max(1, item.quantity), 0);
    const finalWeightKg = calculateOrderWeightKg(order.items);
    const paymentMethod = order.paymentMethod?.toLowerCase() ?? '';
    const isCOD = paymentMethod === 'cod' || paymentMethod === 'cash_on_delivery';

    if (!recipientName) {
      throw new Error('Missing recipient_name');
    }
    if (!recipientPhone) {
      throw new Error('Missing recipient_phone');
    }
    if (!recipientAddress) {
      throw new Error('Missing recipient_address');
    }
    if (finalWeightKg <= 0) {
      throw new Error('Invalid item_weight');
    }

    const createOrderPayload = {
      store_id: storeInfo.storeId,
      merchant_order_id: order.orderNumber,
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
      amount_to_collect: isCOD ? toNumber(order.total) : 0,
    };

    console.info('Pathao create-order request', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      url: `${getPathaoBaseUrl()}${endpoint}`,
      payload: createOrderPayload,
    });

    const response = await pathaoRequest<Record<string, unknown>>(endpoint, createOrderPayload);

    console.info('Pathao create-order response', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      response,
    });

    const data = extractPathaoObject(response);
    const consignmentId =
      extractField(data, ['consignment_id', 'consignmentId', 'order_id', 'id']) ??
      extractField(response, ['consignment_id', 'consignmentId', 'order_id', 'id']);
    const trackingCode =
      extractField(data, ['tracking_number', 'tracking_no', 'tracking_code', 'trackingCode']) ??
      extractField(response, ['tracking_number', 'tracking_no', 'tracking_code', 'trackingCode']);
    const status =
      extractField(data, ['status', 'delivery_status']) ??
      extractField(response, ['status', 'delivery_status']) ??
      'Order Created';
    const deliveryFee =
      extractNumericField(data, ['delivery_fee', 'delivery_charge', 'courier_charge', 'charge']) ??
      extractNumericField(response, ['delivery_fee', 'delivery_charge', 'courier_charge', 'charge']);

    const updateData: Prisma.OrderUpdateInput = {
      shippingMethod: 'pathao',
      pathaoStatus: status,
      pathaoConsignmentId: consignmentId ?? null,
      pathaoTrackingCode: trackingCode ?? null,
      trackingNumber: trackingCode ?? order.trackingNumber,
      pathaoSentAt: new Date(),
      pathaoResponse: toJsonInput(response),
      ...(deliveryFee !== null ? { shippingCost: deliveryFee } : {}),
    };

    if (!options.preserveOrderStatus && (order.status === 'PENDING' || order.status === 'CONFIRMED')) {
      updateData.status = 'SHIPPED';
      updateData.shippedAt = order.shippedAt ?? new Date();
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: updateData,
    });

    return {
      success: true,
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      pathaoStatus: updated.pathaoStatus,
      consignmentId: updated.pathaoConsignmentId,
      trackingCode: updated.pathaoTrackingCode ?? updated.trackingNumber,
      shippingCost: toNumber(updated.shippingCost),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pathao create-order failed';

    console.error('Pathao auto create-order failed', {
      orderId,
      error: message,
    });

    if (options.saveFailureStatus && resolvedOrderId) {
      try {
        await savePathaoFailure(resolvedOrderId, message);
      } catch (saveError) {
        console.error('Failed to save Pathao failure status', {
          orderId: resolvedOrderId,
          error: saveError instanceof Error ? saveError.message : saveError,
        });
      }
    }

    return {
      success: false,
      error: message,
    };
  }
}
