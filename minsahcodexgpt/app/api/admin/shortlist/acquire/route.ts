// app/api/admin/shortlist/acquire/route.ts
// Single Item Acquisition API for Wholesale Sourcing Terminal

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
    const { sku, itemId, acquired, runnerName } = body;

    const isAcquired = typeof acquired === 'boolean' ? acquired : true;
    const now = new Date();

    if (itemId) {
      await prisma.purchaseShortlist.update({
        where: { id: itemId },
        data: {
          purchased: isAcquired,
          purchasedAt: isAcquired ? now : null,
          notes: isAcquired ? `Acquired by ${runnerName || 'Shakil'}` : null,
        },
      });
    } else if (sku) {
      const product = await prisma.product.findUnique({
        where: { sku },
        select: { id: true },
      });

      if (product) {
        await prisma.purchaseShortlist.updateMany({
          where: { productId: product.id },
          data: {
            purchased: isAcquired,
            purchasedAt: isAcquired ? now : null,
            notes: isAcquired ? `Acquired by ${runnerName || 'Shakil'}` : null,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        sku,
        itemId,
        acquired: isAcquired,
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
