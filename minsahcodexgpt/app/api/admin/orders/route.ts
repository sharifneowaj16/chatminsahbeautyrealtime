import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';
import { Prisma, $Enums } from '@/generated/prisma/client';
import { generateDailyOrderNumber } from '@/lib/order-number';

type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

export const dynamic = 'force-dynamic';

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

// POST /api/admin/orders — Create order (admin-created on behalf of customer)
export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const body = await request.json();
    const {
      customer,
      shippingAddress,
      items,
      paymentMethod,
      paymentStatus,
      shippingCost,
      discountAmount,
      couponCode,
      adminNote,
      status = 'PENDING',
    } = body;

    // Validation
    if (!customer?.firstName || !customer?.phone) {
      return NextResponse.json(
        { error: 'Customer firstName and phone required' },
        { status: 400 }
      );
    }

    if (!shippingAddress?.street1 || !shippingAddress?.city) {
      return NextResponse.json(
        { error: 'Shipping address street1 and city required' },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'At least one item required' }, { status: 400 });
    }

    // Find or create customer
    let user = await prisma.user.findUnique({
      where: { email: customer.email || `temp-${Date.now()}@order.local` },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: customer.email || `temp-${Date.now()}@order.local`,
          firstName: customer.firstName,
          lastName: customer.lastName || '',
          phone: customer.phone,
        },
      });
    }

    // Create shipping address
    const address = await prisma.address.create({
      data: {
        userId: user.id,
        type: 'SHIPPING',
        isDefault: false,
        firstName: shippingAddress.firstName || customer.firstName,
        lastName: shippingAddress.lastName || customer.lastName || '',
        street1: shippingAddress.street1,
        street2: shippingAddress.street2 || '',
        city: shippingAddress.city,
        state: shippingAddress.state || '',
        postalCode: shippingAddress.postalCode || '',
        country: shippingAddress.country || 'Bangladesh',
        phone: shippingAddress.phone || customer.phone,
        pathaoCityId: shippingAddress.pathaoCityId,
        pathaoZoneId: shippingAddress.pathaoZoneId,
        pathaoAreaId: shippingAddress.pathaoAreaId,
      },
    });

    // Calculate totals & validate products
    let subtotal = new Decimal(0);
    const orderItems: { productId: string | null; variantId?: string; name: string; sku: string; price: Decimal; quantity: number; total: Decimal }[] = [];
    const shortlistItems: { productId: string; quantity: number; price: Decimal }[] = [];

    // ✨ NEW: Track custom products for UnlistedProduct
    const customProducts: { name: string; sku: string; price: Decimal }[] = [];

    for (const item of items) {
      const itemQuantity = item.quantity || 1;
      const itemPrice = new Decimal(item.price || 0);
      const itemTotal = itemPrice.mul(itemQuantity);
      subtotal = subtotal.add(itemTotal);

      if (item.productId) {
        // DB product — validate + stock check
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, sku: true, quantity: true, price: true },
        });

        if (!product) {
          return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 });
        }

        orderItems.push({
          productId: product.id,
          variantId: item.variantId || undefined,
          name: item.name || product.name,
          sku: item.sku || product.sku,
          price: itemPrice,
          quantity: itemQuantity,
          total: itemTotal,
        });

        if (product.quantity < itemQuantity) {
          shortlistItems.push({
            productId: product.id,
            quantity: itemQuantity,
            price: itemPrice,
          });
        }
      } else {
        // ✨ Custom product — track for unlisted
        orderItems.push({
          productId: null,
          variantId: undefined,
          name: item.name || 'Custom Product',
          sku: item.sku || `CUSTOM-${Date.now()}`,
          price: itemPrice,
          quantity: itemQuantity,
          total: itemTotal,
        });

        customProducts.push({
          name: item.name || 'Custom Product',
          sku: item.sku || `CUSTOM-${Date.now()}`,
          price: itemPrice,
        });
      }
    }

    // Calculate final total
    const shippingCostDec = new Decimal(shippingCost || 0);
    const discountDec = new Decimal(discountAmount || 0);
    const total = subtotal.add(shippingCostDec).minus(discountDec);

    // Create order
    const order = await prisma.$transaction(async (tx) => tx.order.create({
      data: {
        orderNumber: await generateDailyOrderNumber(tx),
        userId: user.id,
        status: status.toUpperCase() as $Enums.OrderStatus,
        paymentStatus: (paymentStatus || 'PENDING').toUpperCase() as $Enums.PaymentStatus,
        paymentMethod: paymentMethod || 'cash_on_delivery',
        subtotal,
        shippingCost: shippingCostDec,
        taxAmount: new Decimal(0),
        discountAmount: discountDec,
        total,
        addressId: address.id,
        couponCode,
        adminNote,
        paidAt: paymentStatus === 'COMPLETED' || paymentStatus === 'PAID' ? new Date() : null,
        items: {
          create: orderItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            name: item.name,
            sku: item.sku,
            price: item.price,
            quantity: item.quantity,
            total: item.total,
          })),
        },
      },
      include: { items: true },
    }));

    // Create purchase shortlist for out-of-stock items
    for (const shortItem of shortlistItems) {
      await prisma.purchaseShortlist.upsert({
        where: {
          orderId_productId: {
            orderId: order.id,
            productId: shortItem.productId,
          },
        },
        create: {
          orderId: order.id,
          productId: shortItem.productId,
          productName: orderItems.find((oi) => oi.productId === shortItem.productId)?.name || '',
          quantity: shortItem.quantity,
          buyPrice: new Decimal(0),
          sellPrice: shortItem.price,
          adminId: payload.id as string,
        },
        update: {
          quantity: shortItem.quantity,
          sellPrice: shortItem.price,
        },
      });
    }

    // ✨ NEW: Track custom products in UnlistedProduct
    for (const customProduct of customProducts) {
      await prisma.unlistedProduct.upsert({
        where: { sku: customProduct.sku },
        create: {
          name: customProduct.name,
          sku: customProduct.sku,
          price: customProduct.price,
          usageCount: 1,
          lastUsedAt: new Date(),
        },
        update: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          total: toNumber(order.total),
          items: order.items.length,
          shortlistedItems: shortlistItems.length,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Admin order POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/admin/orders - List all orders with filters
export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const paymentStatus = searchParams.get('paymentStatus') || '';
    const dateRange = searchParams.get('dateRange') || '';
    const sortBy = searchParams.get('sortBy') || 'created';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Build date filter
    let dateFilter: { gte?: Date } = {};
    const now = new Date();
    if (dateRange === 'today') {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      dateFilter = { gte: start };
    } else if (dateRange === 'week' || dateRange === '7d') {
      const start = new Date(now); start.setDate(now.getDate() - 7);
      dateFilter = { gte: start };
    } else if (dateRange === 'month' || dateRange === '30d') {
      const start = new Date(now); start.setMonth(now.getMonth() - 1);
      dateFilter = { gte: start };
    } else if (dateRange === '90d') {
      const start = new Date(now); start.setDate(now.getDate() - 90);
      dateFilter = { gte: start };
    } else if (dateRange === 'year') {
      const start = new Date(now); start.setFullYear(now.getFullYear() - 1);
      dateFilter = { gte: start };
    }

    // Build where clause
    const where: Prisma.OrderWhereInput = {};

    if (status) {
      const statusAliases: Record<string, $Enums.OrderStatus> = {
        completed: $Enums.OrderStatus.DELIVERED,
      };
      const upperStatus = statusAliases[status.toLowerCase()] ?? (status.toUpperCase() as $Enums.OrderStatus);
      if (Object.values($Enums.OrderStatus).includes(upperStatus)) {
        where.status = upperStatus;
      }
    }
    if (paymentStatus) {
      const paymentAliases: Record<string, $Enums.PaymentStatus> = {
        paid: $Enums.PaymentStatus.COMPLETED,
      };
      const upperPayment = paymentAliases[paymentStatus.toLowerCase()] ?? (paymentStatus.toUpperCase() as $Enums.PaymentStatus);
      if (Object.values($Enums.PaymentStatus).includes(upperPayment)) {
        where.paymentStatus = upperPayment;
      }
    }
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Build orderBy
    let orderBy: Prisma.OrderOrderByWithRelationInput = { createdAt: 'desc' };
    if (sortBy === 'updated') orderBy = { updatedAt: 'desc' };
    else if (sortBy === 'total_high') orderBy = { total: 'desc' };
    else if (sortBy === 'total_low') orderBy = { total: 'asc' };
    else if (sortBy === 'customer') orderBy = { user: { firstName: 'asc' } };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          userId: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
          shippingMethod: true,
          trackingNumber: true,
          steadfastStatus: true,
          steadfastTrackingCode: true,
          pathaoStatus: true,
          pathaoTrackingCode: true,
          pathaoConsignmentId: true,
          customerNote: true,
          createdAt: true,
          updatedAt: true,
          total: true,
          items: {
            select: {
              id: true,
              name: true,
              quantity: true,
              price: true,
              productId: true,
            },
          },
          shippingAddress: {
            select: {
              street1: true,
              city: true,
              state: true,
              postalCode: true,
              country: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    const userIds = [...new Set(orders.map((order) => order.userId).filter(Boolean))];
    const productIds = [
      ...new Set(
        orders.flatMap((order) => order.items.map((item) => item.productId).filter(Boolean))
      ),
    ];

    const [users, products] = await Promise.all([
      userIds.length
        ? prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          })
        : Promise.resolve([]),
      productIds.length
        ? prisma.product.findMany({
            where: { id: { in: productIds as string[] } },
            select: {
              id: true,
              images: {
                take: 1,
                orderBy: { sortOrder: 'asc' },
                select: { url: true },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const userMap = new Map(users.map((user) => [user.id, user]));
    const productMap = new Map(products.map((product) => [product.id, product]));

    // Format orders for admin UI
    const formatted = orders.map((order) => {
      const user = userMap.get(order.userId);

      return {
        id: order.orderNumber,
        dbId: order.id,
        customer: {
          name:
            `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
            user?.email ||
            'Unknown customer',
          email: user?.email || '',
          phone: user?.phone || '',
        },
        items: order.items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: toNumber(item.price),
          image: item.productId ? (productMap.get(item.productId)?.images?.[0]?.url || '') : '',
        })),
        total: toNumber(order.total),
        status: order.status.toLowerCase(),
        paymentMethod: order.paymentMethod || 'cash_on_delivery',
        paymentStatus: order.paymentStatus.toLowerCase(),
        shipping: order.shippingAddress
          ? {
              address: order.shippingAddress.street1,
              city: order.shippingAddress.city,
              state: order.shippingAddress.state,
              postalCode: order.shippingAddress.postalCode,
              country: order.shippingAddress.country,
            }
          : { address: '', city: '', state: '', postalCode: '', country: '' },
        tracking: order.trackingNumber || undefined,
        shippingMethod: order.shippingMethod || undefined,
        steadfastStatus: order.steadfastStatus || undefined,
        steadfastTrackingCode: order.steadfastTrackingCode || undefined,
        pathaoStatus: order.pathaoStatus || undefined,
        pathaoTrackingCode: order.pathaoTrackingCode || undefined,
        pathaoConsignmentId: order.pathaoConsignmentId || undefined,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        notes: order.customerNote || undefined,
      };
    });

    // Stats
    const [pendingCount, processingCount, shippedCount, totalRevenue] = await Promise.all([
      prisma.order.count({ where: { status: $Enums.OrderStatus.PENDING } }),
      prisma.order.count({ where: { status: $Enums.OrderStatus.PROCESSING } }),
      prisma.order.count({ where: { status: $Enums.OrderStatus.SHIPPED } }),
      prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: $Enums.PaymentStatus.COMPLETED } }),
    ]);

    return NextResponse.json({
      orders: formatted,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      stats: {
        pending: pendingCount,
        processing: processingCount,
        shipped: shippedCount,
        totalRevenue: toNumber(totalRevenue._sum.total),
      },
    });
  } catch (error) {
    console.error('Admin orders GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
