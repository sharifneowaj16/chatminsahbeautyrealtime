// app/api/admin/shortlist/manifest-sync/route.ts
// Refinement 2: Live Wholesale Manifest Order Cancellation & Invalidation Checker

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
    const orderNumbersParam = searchParams.get('orderNumbers'); // e.g. "ORD-123,ORD-456"
    const batchNumber = searchParams.get('batchNumber');

    let orderNumbersToCheck: string[] = [];

    if (orderNumbersParam) {
      orderNumbersToCheck = orderNumbersParam
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
    } else if (batchNumber) {
      // Find orders linked via shortlist items for this batch notes
      const shortlists = await prisma.purchaseShortlist.findMany({
        where: { notes: { contains: batchNumber } },
        select: { orderId: true },
      });
      const orderIds = shortlists.map((s) => s.orderId).filter(Boolean) as string[];
      if (orderIds.length > 0) {
        const linkedOrders = await prisma.order.findMany({
          where: { id: { in: orderIds } },
          select: { orderNumber: true },
        });
        orderNumbersToCheck = linkedOrders.map((o) => o.orderNumber);
      }
    }

    if (orderNumbersToCheck.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          cancelledOrders: [],
          cancelledSkus: [],
          totalCancelledCount: 0,
        },
      });
    }

    // Query orders that are cancelled or refunded
    const cancelledOrders = await prisma.order.findMany({
      where: {
        orderNumber: { in: orderNumbersToCheck },
        status: { in: ['CANCELLED', 'REFUNDED'] },
      },
      include: {
        items: {
          select: {
            sku: true,
            name: true,
            quantity: true,
          },
        },
      },
    });

    const cancelledOrderNumbers = cancelledOrders.map((o) => o.orderNumber);
    const cancelledSkusSet = new Set<string>();

    for (const order of cancelledOrders) {
      for (const it of order.items) {
        if (it.sku) {
          cancelledSkusSet.add(it.sku.toUpperCase());
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        cancelledOrders: cancelledOrderNumbers,
        cancelledSkus: Array.from(cancelledSkusSet),
        totalCancelledCount: cancelledOrders.length,
        message:
          cancelledOrders.length > 0
            ? `⚠️ ${cancelledOrders.length} linked order(s) cancelled: ${cancelledOrderNumbers.join(', ')}`
            : 'All linked orders remain active.',
      },
    });
  } catch (err: any) {
    console.error('[manifest-sync-api] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to sync manifest cancellations' },
      { status: 500 }
    );
  }
}
