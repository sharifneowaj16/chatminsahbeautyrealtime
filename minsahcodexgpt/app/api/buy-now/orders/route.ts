import { NextRequest, NextResponse } from 'next/server';
import { recordProductOrderCreatedInTransaction } from '@/lib/analytics/product-metrics';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId } from '@/app/api/auth/_utils';
import {
  extractVariantWeightKg,
  parseWeightToKg,
  resolvePackagingWeightKg,
} from '@/lib/buy-now';
import { generateDailyOrderNumber } from '@/lib/order-number';
import { notifyNewOrder } from '@/lib/telegram-notify';
import { readOrderAttribution } from '@/lib/tracking/order-attribution';
import { buildOrderTrackingExclusionData } from '@/lib/tracking/traffic-filter';
import { resolveOrderDeliveryAccounting } from '@/lib/order-delivery-accounting';
import { isCanonicalOnlinePaymentMethod } from '@/lib/payments/canonical-payment-contract';
import { parseSupportedCheckoutPaymentMethod } from '@/lib/payments/payment-methods';
import {
  ONLINE_PAYMENT_INITIAL_STATUS,
  ONLINE_PAYMENT_PENDING_ORDER_STATUS,
} from '@/lib/orders/payment-lifecycle';
import {
  availableProductStock,
  availableVariantStock,
  decrementCodOrderStockInTransaction,
  getOnlinePaymentExpiresAt,
  reserveOnlineOrderStockInTransaction,
} from '@/lib/online-payment-stock';

export const dynamic = 'force-dynamic';

interface BuyNowItemInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

interface BuyNowAddressInput {
  name: string;
  phone: string;
  address?: string;
  city: string;
  zone?: string;
  area: string;
  pathao_city_id?: number | null;
  pathao_zone_id?: number | null;
  pathao_area_id?: number | null;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Please log in to place this order.', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      items?: BuyNowItemInput[];
      shippingAddress?: BuyNowAddressInput;
      deliveryCharge?: number;
      customerDeliveryCharge?: number;
      courierDeliveryCharge?: number;
      deliveryDiscountAmount?: number;
      deliveryPricingSource?: string;
      deliveryOfferType?: string;
      deliveryOfferProductId?: string | null;
      deliveryOfferBadgeText?: string | null;
      subtotal?: number;
      grandTotal?: number;
      parcelWeight?: number;
      paymentMethod?: string;
      deliveryPendingConfirmation?: boolean;
    };

    const items = body.items ?? [];
    const shippingAddress = body.shippingAddress;
    const paymentMethod = parseSupportedCheckoutPaymentMethod(
      body.paymentMethod?.trim() || 'cod',
    );
    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Unsupported payment method', code: 'UNSUPPORTED_PAYMENT_METHOD' },
        { status: 400 },
      );
    }
    const isOnlinePaymentOrder = isCanonicalOnlinePaymentMethod(paymentMethod);
    const orderLifecycleNow = new Date();
    const onlinePaymentExpiresAt = isOnlinePaymentOrder
      ? getOnlinePaymentExpiresAt(orderLifecycleNow)
      : null;
    const clientDeliveryCharge = Math.max(0, Number(body.deliveryCharge ?? 0));
    const deliveryPendingConfirmation = Boolean(body.deliveryPendingConfirmation);

    if (!items.length) {
      return NextResponse.json({ error: 'No items selected' }, { status: 400 });
    }

    if (
      !shippingAddress?.name?.trim() ||
      !shippingAddress.phone?.trim() ||
      !shippingAddress.city?.trim() ||
      !shippingAddress.area?.trim() ||
      !shippingAddress.pathao_city_id ||
      !shippingAddress.pathao_zone_id ||
      !shippingAddress.pathao_area_id
    ) {
      return NextResponse.json({ error: 'Shipping address is incomplete' }, { status: 400 });
    }

    const productIds = [...new Set(items.map((item) => item.productId))];
    const variantIds = [...new Set(items.map((item) => item.variantId).filter(Boolean))] as string[];

    const [products, variants, configs, customerForTracking] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          quantity: true,
          reservedQuantity: true,
          trackInventory: true,
          allowBackorder: true,
          weight: true,
          shippingWeight: true,
          deliveryOfferEnabled: true,
          deliveryOfferType: true,
          deliveryOfferAmount: true,
          deliveryOfferStartDate: true,
          deliveryOfferEndDate: true,
          deliveryOfferBadgeText: true,
        },
      }),
      variantIds.length
        ? prisma.productVariant.findMany({
            where: { id: { in: variantIds } },
            select: {
              id: true,
              productId: true,
              name: true,
              sku: true,
              price: true,
              quantity: true,
              reservedQuantity: true,
              attributes: true,
            },
          })
        : Promise.resolve([]),
      prisma.siteConfig.findMany({
        where: {
          key: {
            in: ['packagingWeight', 'shippingSettings', 'deliverySettings', 'orderPackagingWeight'],
          },
        },
        select: { value: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, phone: true },
      }),
    ]);

    const productMap = new Map(products.map((product) => [product.id, product]));
    const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
    const packagingWeightKg = resolvePackagingWeightKg(configs.map((config) => config.value));

    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(`PRODUCT_NOT_FOUND:${item.productId}`);
      }

      const quantity = Math.max(1, Math.trunc(item.quantity || 1));
      const variant = item.variantId ? variantMap.get(item.variantId) : null;

      if (item.variantId && (!variant || variant.productId !== item.productId)) {
        throw new Error(`VARIANT_NOT_FOUND:${item.variantId}`);
      }

      const availableStock = variant ? availableVariantStock(variant) : availableProductStock(product);
      if (product.trackInventory && !product.allowBackorder && availableStock < quantity) {
        throw new Error(`INSUFFICIENT_STOCK:${product.id}`);
      }

      const unitPrice = Number((variant?.price ?? product.price).toString());
      const unitWeightKg =
        extractVariantWeightKg(variant?.attributes) ??
        parseWeightToKg(product.weight?.toNumber?.() ?? product.weight) ??
        parseWeightToKg(product.shippingWeight) ??
        0.1;
      const variantLabel = variant
        ? (() => {
            const attributes = variant.attributes as Record<string, unknown> | null;
            const parts = [
              typeof attributes?.size === 'string' ? attributes.size : null,
              typeof attributes?.color === 'string' ? attributes.color : null,
            ].filter(Boolean);

            return parts.length > 0 ? parts.join(' / ') : variant.name;
          })()
        : null;

      return {
        productId: product.id,
        productName: product.name,
        variantId: variant?.id ?? null,
        variantLabel,
        sku: variant?.sku ?? product.sku,
        price: unitPrice,
        quantity,
        total: Number((unitPrice * quantity).toFixed(2)),
        unitWeightKg,
      };
    });

    const subtotal = Number(
      orderItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)
    );
    const itemsWeightKg = Number(
      orderItems.reduce((sum, item) => sum + item.unitWeightKg * item.quantity, 0).toFixed(3)
    );
    const parcelWeightKg = Number((itemsWeightKg + packagingWeightKg).toFixed(3));
    const deliveryAccounting = await resolveOrderDeliveryAccounting({
      items: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: item.quantity,
      })),
      products,
      variants,
      address: shippingAddress,
      client: {
        shippingCost: clientDeliveryCharge,
        customerDeliveryCharge: body.customerDeliveryCharge,
        courierDeliveryCharge: body.courierDeliveryCharge,
        deliveryDiscountAmount: body.deliveryDiscountAmount,
        deliveryPricingSource: body.deliveryPricingSource,
        deliveryOfferType: body.deliveryOfferType,
        deliveryOfferProductId: body.deliveryOfferProductId ?? null,
        deliveryOfferBadgeText: body.deliveryOfferBadgeText ?? null,
      },
    });
    const deliveryCharge = deliveryAccounting.shippingCost;
    const total = Number((subtotal + deliveryCharge).toFixed(2));
    const computedSubtotal = Number(body.subtotal ?? 0);
    const computedGrandTotal = Number(body.grandTotal ?? 0);
    const orderAttribution = readOrderAttribution(request, { userId });
    const orderTrackingExclusion = buildOrderTrackingExclusionData({
      request,
      email: customerForTracking?.email,
      phones: [customerForTracking?.phone, shippingAddress.phone],
    });

    const order = await prisma.$transaction(async (tx) => {
      const addressRecord = await tx.address.create({
        data: {
          userId,
          firstName: shippingAddress.name.trim(),
          lastName: '',
          phone: shippingAddress.phone.trim(),
          street1: shippingAddress.address?.trim() || shippingAddress.area.trim(),
          street2: shippingAddress.zone?.trim() || shippingAddress.area.trim(),
          city: shippingAddress.city.trim(),
          state: shippingAddress.zone?.trim() || shippingAddress.area.trim(),
          postalCode: '',
          country: 'Bangladesh',
          isDefault: false,
          type: 'SHIPPING',
          pathaoCityId: shippingAddress.pathao_city_id ?? null,
          pathaoZoneId: shippingAddress.pathao_zone_id ?? null,
          pathaoAreaId: shippingAddress.pathao_area_id ?? null,
        },
      });

      const orderNumber = await generateDailyOrderNumber(tx);
      const customerNoteParts = [
        'Placed with Buy Now flow',
        `Parcel weight: ${parcelWeightKg.toFixed(3)}kg`,
        deliveryPendingConfirmation ? 'Delivery charge pending courier confirmation' : null,
        deliveryAccounting.pricingNote,
        computedSubtotal && Math.abs(computedSubtotal - subtotal) > 0.01
          ? `Client subtotal mismatch: ${computedSubtotal}`
          : null,
        computedGrandTotal && Math.abs(computedGrandTotal - total) > 0.01
          ? `Client total mismatch: ${computedGrandTotal}`
          : null,
      ].filter(Boolean);

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId: addressRecord.id,
          status: isOnlinePaymentOrder
            ? ONLINE_PAYMENT_PENDING_ORDER_STATUS
            : 'CONFIRMED',
          paymentStatus: ONLINE_PAYMENT_INITIAL_STATUS,
          paymentMethod,
          paymentExpiresAt: onlinePaymentExpiresAt,
          stockReservedAt: isOnlinePaymentOrder ? orderLifecycleNow : null,
          stockFinalizedAt: isOnlinePaymentOrder ? null : orderLifecycleNow,
          subtotal,
          shippingCost: deliveryCharge,
          courierDeliveryCharge: deliveryAccounting.courierDeliveryCharge,
          deliveryDiscountAmount: deliveryAccounting.deliveryDiscountAmount,
          deliveryPricingSource: deliveryAccounting.deliveryPricingSource,
          deliveryOfferType: deliveryAccounting.deliveryOfferType,
          deliveryOfferProductId: deliveryAccounting.deliveryOfferProductId,
          deliveryOfferBadgeText: deliveryAccounting.deliveryOfferBadgeText,
          shippingMethod: 'pathao',
          taxAmount: 0,
          discountAmount: 0,
          total,
          customerNote: customerNoteParts.join(' | '),
          ...orderAttribution,
          ...orderTrackingExclusion,
          items: {
            create: orderItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              name: item.variantLabel ? `${item.productName} - ${item.variantLabel}` : item.productName,
              sku: item.sku,
              price: item.price,
              quantity: item.quantity,
              total: item.total,
            })),
          },
        },
      });

      if (isOnlinePaymentOrder) {
        await reserveOnlineOrderStockInTransaction(
          tx,
          orderItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
          productMap,
          variantMap,
        );
      } else {
        await decrementCodOrderStockInTransaction(
          tx,
          orderItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
          productMap,
        );
      }

      await recordProductOrderCreatedInTransaction(
        tx,
        orderItems.map((item) => ({ productId: item.productId, quantity: item.quantity, total: item.total })),
        undefined,
        { skip: Boolean(orderTrackingExclusion.isTest), reason: orderTrackingExclusion.trackingFilteredReason ?? undefined }
      );

      return createdOrder;
    });

    // Pathao delivery is deferred until phone confirmation via Telegram/Admin callback.
    if (!isOnlinePaymentOrder) {
      notifyNewOrder({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: shippingAddress.name.trim(),
        customerPhone: shippingAddress.phone.trim(),
        address: {
          city: shippingAddress.city.trim(),
          zone: shippingAddress.zone?.trim() || null,
          area: shippingAddress.area.trim(),
        },
        items: orderItems.map((item) => ({
          name: item.productName,
          variant: item.variantLabel || null,
          quantity: item.quantity,
          unitPrice: item.price,
          total: item.total,
        })),
        subtotal,
        shippingCost: deliveryCharge,
        courierDeliveryCharge: deliveryAccounting.courierDeliveryCharge,
        deliveryDiscountAmount: deliveryAccounting.deliveryDiscountAmount,
        deliveryPricingSource: deliveryAccounting.deliveryPricingSource,
        deliveryOfferType: deliveryAccounting.deliveryOfferType,
        deliveryOfferBadgeText: deliveryAccounting.deliveryOfferBadgeText,
        total,
        paymentMethod,
      }).catch(() => {});
    }

    const pathaoDelivery = { skipped: true, reason: 'DEFERRED_UNTIL_PHONE_CONFIRMATION' };

    const normalizedPaymentMethod = paymentMethod.trim().toLowerCase();
    const redirectURL = ['bkash', 'nagad'].includes(normalizedPaymentMethod)
      ? `/checkout/payment/${normalizedPaymentMethod}?orderId=${order.id}&orderNumber=${order.orderNumber}`
      : `/checkout/order-confirmed?orderNumber=${order.orderNumber}`;

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      subtotal,
      deliveryCharge,
      deliveryAccounting: {
        shippingCost: deliveryCharge,
        courierDeliveryCharge: deliveryAccounting.courierDeliveryCharge,
        deliveryDiscountAmount: deliveryAccounting.deliveryDiscountAmount,
        deliveryPricingSource: deliveryAccounting.deliveryPricingSource,
        deliveryOfferType: deliveryAccounting.deliveryOfferType,
        deliveryOfferProductId: deliveryAccounting.deliveryOfferProductId,
        quoteVerified: deliveryAccounting.quoteVerified,
      },
      grandTotal: total,
      parcelWeightKg,
      estimatedDelivery: shippingAddress.city.toLowerCase().includes('dhaka') ? '1-2 days' : '2-3 days',
      redirectURL,
      pathaoDelivery,
    });
  } catch (error) {
    console.error('POST /api/buy-now/orders error:', error);

    if (error instanceof Error) {
      if (error.message.startsWith('PRODUCT_NOT_FOUND:') || error.message.startsWith('VARIANT_NOT_FOUND:')) {
        return NextResponse.json({ error: 'One or more selected items are unavailable' }, { status: 400 });
      }

      if (
        error.message === 'ONLINE_STOCK_RESERVATION_FAILED' ||
        error.message === 'COD_STOCK_DECREMENT_FAILED'
      ) {
        return NextResponse.json({ error: 'Some selected quantity is no longer available' }, { status: 409 });
      }

      if (error.message.startsWith('INSUFFICIENT_STOCK:')) {
        return NextResponse.json({ error: 'Some selected quantity is no longer available' }, { status: 409 });
      }
    }

    return NextResponse.json(
      { error: 'Failed to place buy now order. Please try again.' },
      { status: 500 }
    );
  }
}
