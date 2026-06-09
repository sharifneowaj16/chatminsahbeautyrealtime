// app/api/admin/shortlist/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';

interface ShortlistItem {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  purchased: boolean;
  purchasedAt: Date | null;
  priority: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface OrderCustomer { name: string; phone: string | null; }

interface OrderBase {
  id: string;
  orderNumber: string;
  userId: string;
  createdAt: Date;
  customer: OrderCustomer;
}

interface OrderWithShortlist extends OrderBase {
  items: ShortlistItem[];
  totalProducts: number;
  purchasedProducts: number;
  unpurchasedProducts: number;
  progress: number;
  isCompleted: boolean;
  totalProfit: number;
  completedAt: Date | null;
}

interface ShortlistStats {
  pendingOrders: number;
  completedOrders: number;
  productsRemaining: number;
  productsPurchased: number;
  totalPotentialRevenue: number;
  expectedProfit: number;
  completionRate: number;
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload)
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status      = searchParams.get('status')    || 'pending';
    const priority    = searchParams.get('priority')  || 'ALL';
    const dateRange   = searchParams.get('dateRange') || 'all';
    const searchQuery = searchParams.get('search')    || '';
    const sortBy      = searchParams.get('sort')      || 'recent';

    const now     = new Date();
    const today   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const dateFilter: { gte?: Date } = {};
    if (dateRange === 'today') dateFilter.gte = today;
    else if (dateRange === 'week') dateFilter.gte = weekAgo;

    const orders = await prisma.order.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      include: {
        user:  { select: { firstName: true, lastName: true, phone: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, costPrice: true, price: true } },
          },
        },
      },
      orderBy: sortBy === 'recent' ? { createdAt: 'desc' } : { updatedAt: 'desc' },
    });

    if (orders.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          orders: [],
          stats: {
            pendingOrders: 0, completedOrders: 0,
            productsRemaining: 0, productsPurchased: 0,
            totalPotentialRevenue: 0, expectedProfit: 0, completionRate: 0,
          },
        },
      });
    }

    const orderIds = orders.map(o => o.id);

    let shortlistRecords = await prisma.purchaseShortlist.findMany({
      where: { orderId: { in: orderIds } },
    });

    // Build existing keys using orderItemId stored in productName fallback
    // KEY: "orderId::productId" for real products, "orderId::orderItemId" for custom
    const existingKeys = new Set(
      shortlistRecords.map(r => `${r.orderId}::${r.productId ?? r.id}`)
    );
    // ^^^ For custom records already in DB, we key by their own shortlist id
    // This won't work for new ones — see toCreate below for how we track them

    // Better approach: build a map by orderId → list of records
    const recordsByOrder = new Map<string, typeof shortlistRecords>();
    for (const r of shortlistRecords) {
      const list = recordsByOrder.get(r.orderId) ?? [];
      list.push(r);
      recordsByOrder.set(r.orderId, list);
    }

    const toCreate: {
      orderId: string;
      productId: string | null;
      productName: string;
      quantity: number;
      buyPrice: number;
      sellPrice: number;
      purchased: boolean;
      priority: string;
    }[] = [];

    for (const order of orders) {
      const existingForOrder = recordsByOrder.get(order.id) ?? [];

      for (const item of order.items) {
        if (item.productId) {
          // Real product: check by productId
          const alreadyExists = existingForOrder.some(r => r.productId === item.productId);
          if (!alreadyExists) {
            toCreate.push({
              orderId:     order.id,
              productId:   item.productId,
              productName: item.product?.name ?? item.name,
              quantity:    item.quantity,
              buyPrice:    item.product?.costPrice
                             ? parseFloat(item.product.costPrice.toString())
                             : 0,
              sellPrice:   parseFloat(item.price.toString()),
              purchased:   false,
              priority:    'NORMAL',
            });
          }
        } else {
          // Custom product: check by productName + quantity match (best we can do without schema change)
          const alreadyExists = existingForOrder.some(
            r => r.productId === null && r.productName === (item.product?.name ?? item.name)
          );
          if (!alreadyExists) {
            toCreate.push({
              orderId:     order.id,
              productId:   null,
              productName: item.product?.name ?? item.name,
              quantity:    item.quantity,
              buyPrice:    0,
              sellPrice:   parseFloat(item.price.toString()),
              purchased:   false,
              priority:    'NORMAL',
            });
          }
        }
      }
    }

    if (toCreate.length > 0) {
      await prisma.purchaseShortlist.createMany({
        data: toCreate,
        skipDuplicates: true,
      });

      shortlistRecords = await prisma.purchaseShortlist.findMany({
        where: { orderId: { in: orderIds } },
      });

      // Rebuild recordsByOrder
      recordsByOrder.clear();
      for (const r of shortlistRecords) {
        const list = recordsByOrder.get(r.orderId) ?? [];
        list.push(r);
        recordsByOrder.set(r.orderId, list);
      }
    }

    const allShortlistItems: ShortlistItem[] = [];
    const orderMap = new Map<string, OrderBase>();

    for (const order of orders) {
      const existingForOrder = recordsByOrder.get(order.id) ?? [];

      // Track which custom records we've already matched (to avoid double-matching)
      const usedCustomIds = new Set<string>();

      const mergedItems: ShortlistItem[] = order.items.map(item => {
        let dbItem: (typeof shortlistRecords)[number] | undefined;

        if (item.productId) {
          // Real product: match by productId
          dbItem = existingForOrder.find(r => r.productId === item.productId);
        } else {
          // Custom product: match by productName, skip already used
          dbItem = existingForOrder.find(
            r => r.productId === null
              && r.productName === (item.product?.name ?? item.name)
              && !usedCustomIds.has(r.id)
          );
          if (dbItem) usedCustomIds.add(dbItem.id);
        }

        return {
          id:          dbItem?.id          ?? `fallback-${order.id}-${item.id}`,
          orderId:     order.id,
          productId:   item.productId ?? null,
          productName: item.product?.name ?? item.name,
          quantity:    item.quantity,
          buyPrice:    item.product?.costPrice
                         ? parseFloat(item.product.costPrice.toString())
                         : 0,
          sellPrice:   parseFloat(item.price.toString()),
          purchased:   dbItem?.purchased   ?? false,
          purchasedAt: dbItem?.purchasedAt ?? null,
          priority:    dbItem?.priority    ?? 'NORMAL',
          notes:       dbItem?.notes       ?? null,
          createdAt:   order.createdAt,
          updatedAt:   order.updatedAt,
        };
      });

      allShortlistItems.push(...mergedItems);

      orderMap.set(order.id, {
        id:          order.id,
        orderNumber: order.orderNumber,
        userId:      order.userId,
        createdAt:   order.createdAt,
        customer: {
          name:  `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim(),
          phone: order.user.phone,
        },
      });
    }

    const ordersWithShortlist: OrderWithShortlist[] = Array.from(orderMap.values()).map(
      (orderData): OrderWithShortlist => {
        const items = allShortlistItems.filter(i => i.orderId === orderData.id);

        const filteredItems = priority !== 'ALL'
          ? items.filter(i => i.priority === priority)
          : items;

        const totalProducts       = items.length;
        const purchasedProducts   = items.filter(i => i.purchased).length;
        const unpurchasedProducts = totalProducts - purchasedProducts;
        const progress    = totalProducts > 0 ? (purchasedProducts / totalProducts) * 100 : 0;
        const isCompleted = purchasedProducts === totalProducts && totalProducts > 0;

        const totalProfit = items.reduce(
          (sum, i) => sum + (i.sellPrice - i.buyPrice) * i.quantity,
          0
        );

        return {
          ...orderData,
          items: filteredItems,
          totalProducts,
          purchasedProducts,
          unpurchasedProducts,
          progress:    Math.round(progress),
          isCompleted,
          totalProfit: Math.round(totalProfit),
          completedAt: isCompleted ? now : null,
        };
      }
    );

    let filteredOrders = ordersWithShortlist;

    if (status === 'pending')   filteredOrders = filteredOrders.filter(o => !o.isCompleted);
    if (status === 'completed') filteredOrders = filteredOrders.filter(o => o.isCompleted);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filteredOrders = filteredOrders.filter(o =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customer.name.toLowerCase().includes(q) ||
        o.customer.phone?.includes(q)
      );
    }

    if (sortBy === 'urgent') {
      filteredOrders.sort((a, b) => {
        const aU = a.items.some(i => i.priority === 'URGENT') ? 1 : 0;
        const bU = b.items.some(i => i.priority === 'URGENT') ? 1 : 0;
        return bU - aU;
      });
    } else if (sortBy === 'progress') {
      filteredOrders.sort((a, b) => a.progress - b.progress);
    }

    const totalCount     = filteredOrders.reduce((s, o) => s + o.totalProducts, 0);
    const purchasedCount = filteredOrders.reduce((s, o) => s + o.purchasedProducts, 0);

    const stats: ShortlistStats = {
      pendingOrders:         filteredOrders.filter(o => !o.isCompleted).length,
      completedOrders:       filteredOrders.filter(o => o.isCompleted).length,
      productsRemaining:     filteredOrders.reduce((s, o) => s + o.unpurchasedProducts, 0),
      productsPurchased:     purchasedCount,
      totalPotentialRevenue: Math.round(
        filteredOrders.reduce(
          (s, o) => s + o.items.reduce((is, i) => is + i.sellPrice * i.quantity, 0),
          0
        )
      ),
      expectedProfit: Math.round(filteredOrders.reduce((s, o) => s + o.totalProfit, 0)),
      completionRate: totalCount > 0 ? Math.round((purchasedCount / totalCount) * 100) : 0,
    };

    return NextResponse.json({ success: true, data: { orders: filteredOrders, stats } });

  } catch (error) {
    console.error('Shortlist GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
