// app/api/admin/inventory/dead-stock/route.ts
// Dead-Stock & Tied-up Capital Release Engine

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
    const thresholdDays = Math.max(15, parseInt(searchParams.get('days') || '45', 10));

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

    // 1. Fetch active products with quantity > 0
    const activeProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        quantity: { gt: 0 },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        slug: true,
        quantity: true,
        price: true,
        costPrice: true,
        lastCostPrice: true,
        createdAt: true,
        category: { select: { name: true } },
        brand: { select: { name: true } },
      },
    });

    // 2. Fetch all order items placed since cutoffDate
    const recentOrderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: cutoffDate },
          status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        },
        productId: { in: activeProducts.map((p) => p.id) },
      },
      select: { productId: true },
    });

    const activeProductIdsWithRecentSales = new Set(
      recentOrderItems.map((item) => item.productId).filter(Boolean)
    );

    // 3. Filter dead stock products (zero sales in last thresholdDays)
    let totalIdleCapital = 0;
    let totalDeadStockUnits = 0;

    const deadStockItems = activeProducts
      .filter((p) => !activeProductIdsWithRecentSales.has(p.id))
      .map((p) => {
        const unitCost =
          p.lastCostPrice != null
            ? Number(p.lastCostPrice)
            : p.costPrice != null
              ? Number(p.costPrice)
              : Number(p.price) * 0.6;

        const tiedUpCapital = Math.round(unitCost * p.quantity);
        totalIdleCapital += tiedUpCapital;
        totalDeadStockUnits += p.quantity;

        // Days since product creation if older than threshold
        const daysSinceCreation = Math.round(
          (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          slug: p.slug,
          category: p.category?.name || 'Uncategorized',
          brand: p.brand?.name || 'Generic',
          quantity: p.quantity,
          unitCost,
          unitPrice: Number(p.price),
          tiedUpCapital,
          daysInactive: Math.max(thresholdDays, daysSinceCreation),
          recommendedAction:
            tiedUpCapital > 10000
              ? '⚡ ৩০% ফ্ল্যাশ সেল দিয়ে ক্যাশ রিলিজ করুন'
              : '🎁 বাই ১ গেট ১ বা গিফট অফারে যুক্ত করুন',
        };
      })
      .sort((a, b) => b.tiedUpCapital - a.tiedUpCapital);

    return NextResponse.json({
      success: true,
      data: {
        thresholdDays,
        summary: {
          deadProductCount: deadStockItems.length,
          totalDeadStockUnits,
          totalIdleCapital,
        },
        deadStockProducts: deadStockItems,
      },
    });
  } catch (err: any) {
    console.error('[dead-stock-GET] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to calculate dead stock and idle capital' },
      { status: 500 }
    );
  }
}
