// app/api/admin/inventory/alerts/route.ts
// Real-time Low Stock & Stockout Prevention Alert Engine

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

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
    const filter = searchParams.get('filter') || 'all_alerts'; // 'out_of_stock' | 'critical' | 'warning' | 'all_alerts'

    // Fetch all active products
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        trackInventory: true,
      },
      select: {
        id: true,
        sku: true,
        name: true,
        slug: true,
        price: true,
        costPrice: true,
        lastCostPrice: true,
        quantity: true,
        reservedQuantity: true,
        lowStockThreshold: true,
        updatedAt: true,
        category: {
          select: { name: true },
        },
        brand: {
          select: { name: true },
        },
        shortlistItems: {
          select: { id: true, priority: true },
        },
        supplierLinks: {
          take: 1,
          select: {
            supplier: {
              select: { name: true, phone: true },
            },
            lastPurchaseRate: true,
          },
        },
      },
      orderBy: { quantity: 'asc' },
    });

    // 2. Fetch 7-day sales velocity for run-out prediction
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const past7DaysOrders = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: sevenDaysAgo },
          status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        },
      },
      select: {
        productId: true,
        quantity: true,
      },
    });

    const velocityMap = new Map<string, number>();
    for (const item of past7DaysOrders) {
      if (item.productId) {
        velocityMap.set(item.productId, (velocityMap.get(item.productId) || 0) + item.quantity);
      }
    }

    const outOfStockItems: any[] = [];
    const criticalItems: any[] = [];
    const warningItems: any[] = [];

    for (const p of products) {
      const availableQty = p.quantity - p.reservedQuantity;
      const threshold = p.lowStockThreshold || 5;
      const unitsSold7Days = velocityMap.get(p.id) || 0;
      const dailyVelocity = Number((unitsSold7Days / 7).toFixed(2));
      const daysRemaining = dailyVelocity > 0 ? Math.round(availableQty / dailyVelocity) : (availableQty === 0 ? 0 : 999);

      const itemData = {
        id: p.id,
        sku: p.sku,
        name: p.name,
        slug: p.slug,
        category: p.category?.name || 'Uncategorized',
        brand: p.brand?.name || 'Generic',
        unitPrice: Number(p.price),
        costPrice: p.costPrice ? Number(p.costPrice) : p.lastCostPrice ? Number(p.lastCostPrice) : null,
        currentStock: p.quantity,
        reservedQuantity: p.reservedQuantity,
        availableStock: availableQty,
        threshold,
        isShortlisted: p.shortlistItems.length > 0,
        supplierName: p.supplierLinks[0]?.supplier?.name || null,
        supplierPhone: p.supplierLinks[0]?.supplier?.phone || null,
        dailyVelocity,
        daysRemaining,
        suggestedReorderQuantity: Math.max(
          Math.max(threshold * 3, Math.round(dailyVelocity * 14)) - p.quantity,
          10
        ),
        lastUpdated: p.updatedAt.toISOString(),
      };

      if (p.quantity === 0) {
        outOfStockItems.push({
          ...itemData,
          severity: 'OUT_OF_STOCK',
          urgencyScore: 100,
          statusLabel: 'স্টক আউট (০ পিস)',
        });
      } else if (daysRemaining <= 3 && availableQty > 0) {
        criticalItems.push({
          ...itemData,
          severity: 'URGENT_RUNOUT',
          urgencyScore: 90,
          statusLabel: `জরুরি! আর মাত্র ${daysRemaining} দিনের স্টক (${p.quantity} পিস)`,
        });
      } else if (p.quantity <= threshold) {
        criticalItems.push({
          ...itemData,
          severity: 'CRITICAL',
          urgencyScore: 80,
          statusLabel: `মারাত্মক কম (${p.quantity}/${threshold})`,
        });
      } else if (p.quantity <= threshold * 2 || daysRemaining <= 7) {
        warningItems.push({
          ...itemData,
          severity: 'WARNING',
          urgencyScore: 40,
          statusLabel: `সতর্কবার্তা (${p.quantity} পিস, ${daysRemaining < 999 ? `${daysRemaining} দিন` : 'স্বাভাবিক'})`,
        });
      }
    }

    let filteredItems: any[] = [];
    if (filter === 'out_of_stock') {
      filteredItems = outOfStockItems;
    } else if (filter === 'critical') {
      filteredItems = criticalItems;
    } else if (filter === 'warning') {
      filteredItems = warningItems;
    } else {
      filteredItems = [...outOfStockItems, ...criticalItems];
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          outOfStockCount: outOfStockItems.length,
          criticalCount: criticalItems.length,
          warningCount: warningItems.length,
          totalAlertCount: outOfStockItems.length + criticalItems.length,
        },
        alerts: filteredItems,
      },
    });
  } catch (err: any) {
    console.error('[inventory-alerts-GET] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch inventory alerts' },
      { status: 500 }
    );
  }
}

// POST /api/admin/inventory/alerts — 1-Click Batch Add to Procurement Shortlist
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
    const { productIds, priority = 1, note } = body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'productIds array is required' }, { status: 400 });
    }

    const results = await prisma.$transaction(
      productIds.map((productId: string) =>
        prisma.inventoryShortlist.upsert({
          where: { productId },
          update: {
            priority,
            note: note || 'Auto-added from Low Stock Alert Engine',
            adminId: payload.adminId || null,
          },
          create: {
            productId,
            priority,
            note: note || 'Auto-added from Low Stock Alert Engine',
            adminId: payload.adminId || null,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: `Successfully shortlisted ${results.length} low stock products for procurement`,
      shortlistedCount: results.length,
    });
  } catch (err: any) {
    console.error('[inventory-alerts-POST] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to batch shortlist low stock products' },
      { status: 500 }
    );
  }
}
