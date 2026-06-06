// app/api/admin/shortlist/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';

interface ShortlistItem {
  id: string;
  orderId: string;
  productId: string;
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

interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  createdAt: Date;
  user: {
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  };
}

interface OrderCustomer {
  name: string;
  phone: string | null;
}

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
    // ===== AUTH CHECK =====
    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // ===== QUERY PARAMETERS =====
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending'; // pending | completed
    const priority = searchParams.get('priority') || 'ALL'; // URGENT | NORMAL | LOW_PRIORITY | ALL
    const dateRange = searchParams.get('dateRange') || 'all'; // today | week | all
    const searchQuery = searchParams.get('search') || '';
    const sortBy = searchParams.get('sort') || 'recent'; // recent | urgent | progress

    // ===== DATE RANGE FILTER =====
    let createdAtFilter: { gte?: Date; lte?: Date } = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (dateRange === 'today') {
      createdAtFilter.gte = today;
    } else if (dateRange === 'week') {
      createdAtFilter.gte = weekAgo;
    }

    // ===== FETCH ORDERS WITH ITEMS =====
    const orders = await prisma.order.findMany({
      where: {
        createdAt: createdAtFilter,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                costPrice: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy:
        sortBy === 'recent'
          ? { createdAt: 'desc' }
          : { updatedAt: 'desc' },
    });

    // ===== PROCESS INTO SHORTLIST ITEMS =====
    const allShortlistItems: ShortlistItem[] = [];
    const orderMap = new Map<string, OrderBase>();

    for (const order of orders) {
      const items: ShortlistItem[] = order.items.map((item) => ({
        id: `${order.id}-${item.productId}`, // Unique ID for each product in order
        orderId: order.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        buyPrice: item.product.costPrice
          ? parseFloat(item.product.costPrice.toString())
          : 0,
        sellPrice: parseFloat(item.price.toString()),
        purchased: false, // Will update from DB if exists
        purchasedAt: null,
        priority: 'NORMAL',
        notes: null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      }));

      // Fetch actual shortlist data from DB
      const shortlistData = await prisma.purchaseShortlist.findMany({
        where: { orderId: order.id },
      });

      // Merge with actual data
      const mergedItems = items.map((item) => {
        const dbItem = shortlistData.find(
          (s) => s.productId === item.productId
        );
        return {
          ...item,
          ...(dbItem && {
            id: dbItem.id,
            purchased: dbItem.purchased,
            purchasedAt: dbItem.purchasedAt,
            priority: dbItem.priority || 'NORMAL',
            notes: dbItem.notes,
          }),
        };
      });

      allShortlistItems.push(...mergedItems);

      // Store order info
      orderMap.set(order.id, {
        id: order.id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        createdAt: order.createdAt,
        customer: {
          name: `${order.user.firstName || ''} ${
            order.user.lastName || ''
          }`.trim(),
          phone: order.user.phone,
        },
      });
    }

    // ===== GROUP BY ORDER =====
    const ordersWithShortlist: OrderWithShortlist[] = Array.from(orderMap.values()).map(
      (orderData): OrderWithShortlist => {
        const items = allShortlistItems.filter(
          (item) => item.orderId === orderData.id
        );

        // Filter by priority
        let filteredItems = items;
        if (priority !== 'ALL') {
          filteredItems = items.filter((item) => item.priority === priority);
        }

        // Calculate metrics
        const totalProducts = items.length;
        const purchasedProducts = items.filter((i) => i.purchased).length;
        const unpurchasedProducts = totalProducts - purchasedProducts;
        const progress = totalProducts > 0 ? (purchasedProducts / totalProducts) * 100 : 0;
        const isCompleted = purchasedProducts === totalProducts && totalProducts > 0;

        // Calculate profit
        const totalProfit = items.reduce((sum, item) => {
          const profit = (item.sellPrice - item.buyPrice) * item.quantity;
          return sum + profit;
        }, 0);

        return {
          ...orderData,
          items: filteredItems,
          totalProducts,
          purchasedProducts,
          unpurchasedProducts,
          progress: Math.round(progress),
          isCompleted,
          totalProfit: Math.round(totalProfit),
          completedAt: isCompleted ? new Date() : null,
        };
      }
    );

    // ===== FILTER BY STATUS & SEARCH =====
    let filteredOrders = ordersWithShortlist;

    // Status filter
    if (status === 'pending') {
      filteredOrders = filteredOrders.filter((o) => !o.isCompleted);
    } else if (status === 'completed') {
      filteredOrders = filteredOrders.filter((o) => o.isCompleted);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredOrders = filteredOrders.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(query) ||
          order.customer.name.toLowerCase().includes(query) ||
          order.customer.phone?.includes(query)
      );
    }

    // ===== SORT =====
    if (sortBy === 'urgent') {
      filteredOrders.sort((a, b) => {
        const aUrgent = a.items.some((i) => i.priority === 'URGENT') ? 1 : 0;
        const bUrgent = b.items.some((i) => i.priority === 'URGENT') ? 1 : 0;
        return bUrgent - aUrgent;
      });
    } else if (sortBy === 'progress') {
      filteredOrders.sort((a, b) => a.progress - b.progress);
    }

    // ===== CALCULATE STATS =====
    const totalProductsCount =
      filteredOrders.reduce((sum, o) => sum + o.unpurchasedProducts, 0) +
      filteredOrders.reduce((sum, o) => sum + o.purchasedProducts, 0);

    const productsPurchasedCount = filteredOrders.reduce(
      (sum, o) => sum + o.purchasedProducts,
      0
    );

    const stats: ShortlistStats = {
      pendingOrders: filteredOrders.filter((o) => !o.isCompleted).length,
      completedOrders: filteredOrders.filter((o) => o.isCompleted).length,
      productsRemaining: filteredOrders.reduce(
        (sum, o) => sum + o.unpurchasedProducts,
        0
      ),
      productsPurchased: productsPurchasedCount,
      totalPotentialRevenue: Math.round(
        filteredOrders.reduce((sum, o) => {
          return (
            sum +
            o.items.reduce((itemSum, item) => {
              return itemSum + item.sellPrice * item.quantity;
            }, 0)
          );
        }, 0)
      ),
      expectedProfit: Math.round(
        filteredOrders.reduce((sum, o) => sum + o.totalProfit, 0)
      ),
      completionRate:
        totalProductsCount > 0
          ? Math.round((productsPurchasedCount / totalProductsCount) * 100)
          : 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        orders: filteredOrders,
        stats,
      },
    });
  } catch (error) {
    console.error('Shortlist GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
