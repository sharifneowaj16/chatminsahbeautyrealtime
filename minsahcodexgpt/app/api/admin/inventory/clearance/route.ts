// app/api/admin/inventory/clearance/route.ts
// Refinement 6: Dead-Stock 1-Click Clearance Flash Sale Bridge

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

// GET: Fetch all active clearance sale items
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

    const clearanceProducts = await prisma.product.findMany({
      where: {
        isClearanceSale: true,
      },
      select: {
        id: true,
        sku: true,
        name: true,
        slug: true,
        price: true,
        compareAtPrice: true,
        costPrice: true,
        lastCostPrice: true,
        quantity: true,
        isClearanceSale: true,
        clearanceDiscountPercent: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        count: clearanceProducts.length,
        products: clearanceProducts.map((p) => ({
          ...p,
          price: Number(p.price),
          compareAtPrice: p.compareAtPrice != null ? Number(p.compareAtPrice) : null,
          costPrice: p.lastCostPrice != null ? Number(p.lastCostPrice) : p.costPrice != null ? Number(p.costPrice) : null,
        })),
      },
    });
  } catch (err: any) {
    console.error('[clearance-api] GET Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch clearance products' },
      { status: 500 }
    );
  }
}

// POST: Apply or Remove 1-Click Clearance Flash Sale
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
    const { productId, discountPercent = 20, action = 'APPLY' } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (action === 'APPLY') {
      const pct = Math.max(1, Math.min(90, Number(discountPercent) || 20));
      const currentPrice = Number(product.price);
      
      // Preserve original retail price in compareAtPrice
      const originalPrice = product.compareAtPrice ? Number(product.compareAtPrice) : currentPrice;
      const clearancePrice = Math.round(originalPrice * (1 - pct / 100));

      const updated = await prisma.product.update({
        where: { id: productId },
        data: {
          price: clearancePrice,
          compareAtPrice: originalPrice,
          isClearanceSale: true,
          clearanceDiscountPercent: pct,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Clearance flash sale applied: ${pct}% off for ${product.name}`,
        data: {
          productId: updated.id,
          name: updated.name,
          sku: updated.sku,
          originalPrice,
          clearancePrice,
          discountPercent: pct,
          isClearanceSale: updated.isClearanceSale,
        },
      });
    } else if (action === 'REMOVE') {
      // Revert clearance price back to original price if compareAtPrice is stored
      const restoredPrice = product.compareAtPrice ? Number(product.compareAtPrice) : Number(product.price);

      const updated = await prisma.product.update({
        where: { id: productId },
        data: {
          price: restoredPrice,
          compareAtPrice: null,
          isClearanceSale: false,
          clearanceDiscountPercent: 0,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Clearance sale removed for ${product.name}`,
        data: {
          productId: updated.id,
          name: updated.name,
          sku: updated.sku,
          price: Number(updated.price),
          isClearanceSale: false,
        },
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be APPLY or REMOVE.' },
        { status: 400 }
      );
    }
  } catch (err: any) {
    console.error('[clearance-api] POST Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to update clearance sale' },
      { status: 500 }
    );
  }
}
