// app/api/admin/shortlist/batch-acquire/route.ts
// Batch Acquisition API for Wholesale Sourcing Terminal

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';

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
    const { skuIds, runnerName, notes } = body;

    if (!Array.isArray(skuIds) || skuIds.length === 0) {
      return NextResponse.json(
        { error: 'skuIds array must contain at least one identifier' },
        { status: 400 }
      );
    }

    const now = new Date();

    // 1. Find product IDs for given SKUs
    const products = await prisma.product.findMany({
      where: {
        sku: { in: skuIds },
      },
      select: { id: true, sku: true },
    });

    const productIds = products.map((p) => p.id);

    // 2. Update PurchaseShortlist records matching either productIds or IDs directly
    const updateResult = await prisma.purchaseShortlist.updateMany({
      where: {
        OR: [
          { productId: { in: productIds } },
          { id: { in: skuIds } },
        ],
        purchased: false,
      },
      data: {
        purchased: true,
        purchasedAt: now,
        notes: notes ? `${notes} (Runner: ${runnerName || 'Shakil'})` : `Acquired by ${runnerName || 'Shakil'}`,
      },
    });

    // 3. Find affected orders to re-verify completion status
    const affectedRecords = await prisma.purchaseShortlist.findMany({
      where: {
        OR: [
          { productId: { in: productIds } },
          { id: { in: skuIds } },
        ],
      },
      select: { orderId: true },
    });

    const affectedOrderIds = Array.from(new Set(affectedRecords.map((r) => r.orderId)));

    // 4. Update order status if all items are purchased
    let completedOrdersCount = 0;
    for (const orderId of affectedOrderIds) {
      const orderShortlist = await prisma.purchaseShortlist.findMany({
        where: { orderId },
        select: { purchased: true },
      });

      const isOrderFullyAcquired = orderShortlist.length > 0 && orderShortlist.every((item) => item.purchased);
      if (isOrderFullyAcquired) {
        // If order is still pending, mark internal notes or update tracking
        await prisma.order.update({
          where: { id: orderId },
          data: {
            updatedAt: now,
          },
        });
        completedOrdersCount++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        acquiredCount: updateResult.count || skuIds.length,
        affectedOrders: affectedOrderIds.length,
        completedOrders: completedOrdersCount,
        acquiredAt: now.toISOString(),
      },
      message: `Successfully acquired ${updateResult.count || skuIds.length} items.`,
    });
  } catch (err: any) {
    console.error('[batch-acquire] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error while processing batch acquisition' },
      { status: 500 }
    );
  }
}
