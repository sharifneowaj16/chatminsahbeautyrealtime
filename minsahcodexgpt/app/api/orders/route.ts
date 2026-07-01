import { NextRequest, NextResponse } from 'next/server';
import { recordProductOrderCreatedInTransaction } from '@/lib/analytics/product-metrics';
import prisma from '@/lib/prisma';
import { Prisma, OrderStatus } from '@/generated/prisma/client';
import { getAuthenticatedUserId } from '@/app/api/auth/_utils';
import { generateDailyOrderNumber } from '@/lib/order-number';
import { notifyNewOrder } from '@/lib/telegram-notify';
import { readOrderAttribution } from '@/lib/tracking/order-attribution';
import { isCanonicalOnlinePaymentMethod, isCodPaymentMethod } from '@/lib/payments/canonical-payment-contract';

export const dynamic = 'force-dynamic';

// ─── Types ───────────────────────────────────────────────────────────────────
interface OrderItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
}

interface AddressDataInput {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  phone?: string;
  address?: string;
  street1?: string;
  zone?: string;
  street2?: string;
  city: string;
  provinceRegion?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  pathao_city_id?: number;
  pathao_zone_id?: number;
  pathao_area_id?: number;
}

function readVariantAttribute(attributes: unknown, keys: string[]) {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
    return null;
  }

  const record = attributes as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }

  const loweredKeys = keys.map((key) => key.toLowerCase());
  for (const [key, value] of Object.entries(record)) {
    if (!loweredKeys.includes(key.toLowerCase())) continue;
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }

  return null;
}

function formatVariantForNotification(variant: { name: string; attributes?: unknown } | null | undefined) {
  if (!variant) return null;

  const sizeOrVolume = readVariantAttribute(variant.attributes, ['size', 'Size', 'volume', 'Volume']);
  const colorOrShade = readVariantAttribute(variant.attributes, ['color', 'Color', 'shade', 'Shade']);
  const details = [
    sizeOrVolume ? `Size/Volume: ${sizeOrVolume}` : null,
    colorOrShade ? `Color/Shade: ${colorOrShade}` : null,
  ].filter(Boolean);

  return details.length ? details.join(' / ') : variant.name || null;
}

// ─── POST /api/orders ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // 1. Auth — userId is required by Order schema
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Please log in to place an order.', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // 2. Parse & validate body
    const body = await request.json();
    const {
      items,
      addressId,
      addressData,
      paymentMethod,
      shippingCost = 0,
      shippingMethod,
      couponCode,
      couponDiscount,
      customerNote,
    }: {
      items: OrderItemInput[];
      addressId?: string;
      addressData?: AddressDataInput;
      paymentMethod?: string;
      shippingCost?: number;
      shippingMethod?: string;
      couponCode?: string;
      couponDiscount?: number;
      customerNote?: string;
    } = body;

    if (!items?.length) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 });
    }
    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method is required' }, { status: 400 });
    }

    if (!isCodPaymentMethod(paymentMethod) && !isCanonicalOnlinePaymentMethod(paymentMethod)) {
      return NextResponse.json(
        {
          error: 'Unsupported payment method for production checkout.',
          code: 'UNSUPPORTED_PAYMENT_METHOD',
          allowedPaymentMethods: ['cod', 'bkash', 'nagad'],
        },
        { status: 400 }
      );
    }

    // 3. Fetch products & variants from DB — never trust client prices
    const productIds = items.map((i) => i.productId);
    const variantIds = items
      .filter((i) => i.variantId)
      .map((i) => i.variantId as string);

    const [products, variants] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        select: {
          id:               true,
          name:             true,
          sku:              true,
          price:            true,
          quantity:         true,
          trackInventory:   true,
          allowBackorder:   true,
          lowStockThreshold:true,
        },
      }),
      variantIds.length
        ? prisma.productVariant.findMany({
            where: { id: { in: variantIds } },
            select: { id: true, price: true, quantity: true, sku: true, name: true, attributes: true },
          })
        : Promise.resolve([]),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    // 4. Validate stock before entering transaction
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Product not found or unavailable: ${item.productId}` },
          { status: 400 }
        );
      }

      if (product.trackInventory && !product.allowBackorder) {
        const availableStock = item.variantId
          ? (variantMap.get(item.variantId)?.quantity ?? 0)
          : product.quantity;

        if (availableStock < item.quantity) {
          return NextResponse.json(
            {
              error: `Insufficient stock for "${product.name}". Available: ${availableStock}, Requested: ${item.quantity}`,
              code:      'INSUFFICIENT_STOCK',
              productId: item.productId,
            },
            { status: 409 }
          );
        }
      }
    }

    // 5. Calculate totals server-side
    const orderItems = items.map((item) => {
      const product   = productMap.get(item.productId)!;
      const variant   = item.variantId ? variantMap.get(item.variantId) : null;
      const unitPrice = parseFloat((variant?.price ?? product.price).toString());
      const itemTotal = parseFloat((unitPrice * item.quantity).toFixed(2));
      const sku  = variant?.sku  ?? product.sku;
      const name = variant ? `${product.name} - ${variant.name}` : product.name;

      return {
        productId: item.productId,
        variantId: item.variantId || null,
        name,
        sku,
        price:    unitPrice,
        quantity: item.quantity,
        total:    itemTotal,
      };
    });

    const subtotal        = parseFloat(orderItems.reduce((s, i) => s + i.total, 0).toFixed(2));
    const shippingCostNum = parseFloat(String(shippingCost)) || 0;
    const taxAmount       = 0;
    const discountAmount  = parseFloat(String(couponDiscount ?? 0));
    const total           = parseFloat(
      (subtotal + shippingCostNum - discountAmount).toFixed(2)
    );
    const notifyItems = items.map((item) => {
      const product   = productMap.get(item.productId)!;
      const variant   = item.variantId ? variantMap.get(item.variantId) : null;
      const unitPrice = parseFloat((variant?.price ?? product.price).toString());

      return {
        name: product.name,
        variant: formatVariantForNotification(variant),
        quantity: item.quantity,
        unitPrice,
        total: parseFloat((unitPrice * item.quantity).toFixed(2)),
      };
    });
    const orderAttribution = readOrderAttribution(request, { userId });

    // 6. Single transaction: resolve address → create order → decrement stock → clear cart
    const order = await prisma.$transaction(async (tx) => {

      // 6a. Resolve shipping address
      let resolvedAddressId: string | null = null;

      if (addressId) {
        const dbAddr = await tx.address.findFirst({
          where: { id: addressId, userId },
        });
        if (dbAddr) {
          resolvedAddressId = dbAddr.id;
        } else {
          // Temp/local id — fall back to default or latest
          const fallback = await tx.address.findFirst({
            where:   { userId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
          });
          resolvedAddressId = fallback?.id ?? null;
        }
      }

      if (!resolvedAddressId && addressData) {
        const created = await tx.address.create({
          data: {
            userId,
            firstName:  addressData.fullName || addressData.firstName || '',
            lastName:   addressData.lastName  || '',
            phone:      addressData.phoneNumber || addressData.phone  || '',
            street1:    addressData.address   || addressData.street1 || '',
            street2:    addressData.zone      || addressData.street2  || null,
            city:       addressData.city,
            state:      addressData.provinceRegion || addressData.state || '',
            postalCode: addressData.postalCode || '',
            country:    addressData.country || 'Bangladesh',
            pathaoCityId: addressData.pathao_city_id ?? null,
            pathaoZoneId: addressData.pathao_zone_id ?? null,
            pathaoAreaId: addressData.pathao_area_id ?? null,
            isDefault:  false,
            type:       'SHIPPING',
          },
        });
        resolvedAddressId = created.id;
      }

      if (!resolvedAddressId) {
        throw new Error('SHIPPING_ADDRESS_REQUIRED');
      }

      // 6b. Unique daily order number
      const orderNumber = await generateDailyOrderNumber(tx);

      // 6c. Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId:      resolvedAddressId,
          status:         'CONFIRMED',
          paymentStatus:  'PENDING',
          paymentMethod,
          subtotal,
          shippingCost:   shippingCostNum,
          shippingMethod: shippingMethod || null,
          taxAmount,
          discountAmount,
          total,
          couponCode:     couponCode     || null,
          couponDiscount: discountAmount > 0 ? discountAmount : null,
          customerNote:   customerNote   || null,
          ...orderAttribution,
          items: {
            create: orderItems,
          },
        },
      });

      // 6d. Decrement stock
      for (const item of orderItems) {
        if (item.variantId) {
          const variant = variantMap.get(item.variantId);
          if (variant) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data:  { quantity: { decrement: item.quantity } },
            });
          }
        } else {
          const product = productMap.get(item.productId)!;
          if (product.trackInventory) {
            await tx.product.update({
              where: { id: item.productId },
              data:  { quantity: { decrement: item.quantity } },
            });
          }
        }
      }

      // 6e. Product analytics: order counters are updated in the same DB transaction
      // so backend product analytics never shows an order without matching product metrics.
      await recordProductOrderCreatedInTransaction(tx, orderItems);

      // 6f. Clear user cart
      await tx.cartItem.deleteMany({ where: { userId } });

      return newOrder;
    });

    // Pathao delivery এখন এখানে create হবে না - Telegram থেকে Confirm করার পর হবে
    const resolvedAddress = order.addressId
      ? await prisma.address.findUnique({
          where: { id: order.addressId },
          select: {
            firstName: true,
            lastName:  true,
            phone:     true,
            city:      true,
            street2:   true,
            street1:   true,
          },
        })
      : null;

    notifyNewOrder({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: resolvedAddress
        ? `${resolvedAddress.firstName} ${resolvedAddress.lastName}`.trim()
        : 'N/A',
      customerPhone: resolvedAddress?.phone || 'N/A',
      address: {
        city: resolvedAddress?.city || 'N/A',
        zone: resolvedAddress?.street2 || null,
        area: resolvedAddress?.street1 || null,
      },
      items: notifyItems,
      subtotal,
      shippingCost: shippingCostNum,
      total,
      paymentMethod,
    }).catch(() => {});

    const normalizedPaymentMethod = paymentMethod.trim().toLowerCase();
    const redirectURL = ['bkash', 'nagad'].includes(normalizedPaymentMethod)
      ? `/checkout/payment/${normalizedPaymentMethod}?orderId=${order.id}&orderNumber=${order.orderNumber}`
      : `/checkout/order-confirmed?orderNumber=${order.orderNumber}`;

    return NextResponse.json({
      success:     true,
      orderId:     order.id,
      orderNumber: order.orderNumber,
      total:       order.total,
      redirectURL,
    });

  } catch (error) {
    console.error('POST /api/orders error:', error);

    if (error instanceof Error) {
      if (error.message === 'SHIPPING_ADDRESS_REQUIRED') {
        return NextResponse.json(
          { error: 'Shipping address not found. Please add an address first.' },
          { status: 400 }
        );
      }
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'Duplicate order. Please refresh and try again.' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to place order. Please try again.' },
      { status: 500 }
    );
  }
}

// ─── GET /api/orders ──────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page   = Math.max(1, parseInt(searchParams.get('page')  || '1'));
    const limit  = Math.min(50, parseInt(searchParams.get('limit') || '10'));
    const skip   = (page - 1) * limit;
    const status = searchParams.get('status')?.toUpperCase();

    // Validate status against enum
    const validStatuses = Object.values(OrderStatus);
    const orderStatus =
      status && validStatuses.includes(status as OrderStatus)
        ? (status as OrderStatus)
        : undefined;

    const where: Prisma.OrderWhereInput = {
      userId,
      ...(orderStatus ? { status: orderStatus } : {}),
    };

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id:     true,
                  name:   true,
                  images: { take: 1, orderBy: { sortOrder: 'asc' } },
                },
              },
            },
          },
          shippingAddress: true,
          payments:        true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
