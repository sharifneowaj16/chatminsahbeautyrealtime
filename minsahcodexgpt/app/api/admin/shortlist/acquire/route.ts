// app/api/admin/shortlist/acquire/route.ts
// Single Item Acquisition API for Wholesale Sourcing Terminal with Actual Buy Price & Stock Movement

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';
import { recordStockMovement } from '@/lib/inventory/stock-service';

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
      sku,
      itemId,
      acquired,
      runnerName,
      runnerId,
      actualBuyPrice,
      actualSpent,
      cashGiven,
      cashReturned,
    } = body;

    const isAcquired = typeof acquired === 'boolean' ? acquired : true;
    const now = new Date();

    const parsedActualBuyPrice = actualBuyPrice != null ? Number(actualBuyPrice) : null;
    const parsedActualSpent = actualSpent != null ? Number(actualSpent) : null;
    const parsedCashGiven = cashGiven != null ? Number(cashGiven) : null;
    const parsedCashReturned = cashReturned != null ? Number(cashReturned) : null;

    let reconciledStatus = 'PENDING';
    if (parsedCashGiven != null && (parsedActualSpent != null || parsedActualBuyPrice != null)) {
      const spent = parsedActualSpent ?? (parsedActualBuyPrice ?? 0);
      const returned = parsedCashReturned ?? 0;
      reconciledStatus = Math.abs(parsedCashGiven - (spent + returned)) < 0.01 ? 'SETTLED' : 'DISCREPANCY';
    }

    let affectedItem: any = null;

    await prisma.$transaction(async (tx) => {
      if (itemId) {
        affectedItem = await tx.purchaseShortlist.findUnique({
          where: { id: itemId },
          include: { product: true },
        });

        if (affectedItem) {
          const qty = affectedItem.quantity || 1;
          const calculatedSpent =
            parsedActualSpent ??
            (parsedActualBuyPrice != null ? parsedActualBuyPrice * qty : null);

          await tx.purchaseShortlist.update({
            where: { id: itemId },
            data: {
              purchased: isAcquired,
              purchasedAt: isAcquired ? now : null,
              actualBuyPrice: parsedActualBuyPrice != null ? new Prisma.Decimal(parsedActualBuyPrice) : undefined,
              actualSpent: calculatedSpent != null ? new Prisma.Decimal(calculatedSpent) : undefined,
              cashGiven: parsedCashGiven != null ? new Prisma.Decimal(parsedCashGiven) : undefined,
              cashReturned: parsedCashReturned != null ? new Prisma.Decimal(parsedCashReturned) : undefined,
              reconciledStatus,
              runnerId: runnerId ?? null,
              runnerName: runnerName ?? 'Shakil',
              reconciledAt: isAcquired ? now : null,
              reconciledByAdminId: payload.adminId ?? null,
              notes: isAcquired
                ? `Acquired at ৳${parsedActualBuyPrice ?? affectedItem.buyPrice} by ${runnerName || 'Shakil'}`
                : null,
            },
          });

          // If linked to product and acquired, update product inventory and lastCostPrice
          if (isAcquired && affectedItem.productId) {
            await tx.product.update({
              where: { id: affectedItem.productId },
              data: {
                quantity: { increment: qty },
                ...(parsedActualBuyPrice != null
                  ? {
                      lastCostPrice: new Prisma.Decimal(parsedActualBuyPrice),
                      costPrice: new Prisma.Decimal(parsedActualBuyPrice),
                    }
                  : {}),
              },
            });

            await recordStockMovement(
              {
                productId: affectedItem.productId,
                delta: qty,
                type: 'PURCHASE',
                referenceId: affectedItem.orderId || affectedItem.id,
                costPriceAtTime: parsedActualBuyPrice ?? Number(affectedItem.buyPrice),
                notes: `Wholesale procurement acquired by ${runnerName || 'Shakil'} (Shortlist #${affectedItem.id})`,
                createdByAdminId: payload.adminId ?? null,
              },
              tx
            );
          }
        }
      } else if (sku) {
        const product = await tx.product.findUnique({
          where: { sku },
          select: { id: true, costPrice: true },
        });

        if (product) {
          await tx.purchaseShortlist.updateMany({
            where: { productId: product.id },
            data: {
              purchased: isAcquired,
              purchasedAt: isAcquired ? now : null,
              actualBuyPrice: parsedActualBuyPrice != null ? new Prisma.Decimal(parsedActualBuyPrice) : undefined,
              runnerName: runnerName || 'Shakil',
              notes: isAcquired
                ? `Acquired at ৳${parsedActualBuyPrice ?? product.costPrice ?? 0} by ${runnerName || 'Shakil'}`
                : null,
            },
          });

          if (isAcquired && parsedActualBuyPrice != null) {
            await tx.product.update({
              where: { id: product.id },
              data: {
                lastCostPrice: new Prisma.Decimal(parsedActualBuyPrice),
                costPrice: new Prisma.Decimal(parsedActualBuyPrice),
              },
            });
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        sku,
        itemId,
        acquired: isAcquired,
        actualBuyPrice: parsedActualBuyPrice,
        reconciledStatus,
        updatedAt: now.toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[acquire] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to update item acquisition status' },
      { status: 500 }
    );
  }
}
