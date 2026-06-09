// app/api/admin/products/unlisted/route.ts — GET & DELETE unlisted products

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

// GET /api/admin/products/unlisted — List all unlisted (custom) products
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
    const sort = searchParams.get('sort') || 'recent'; // recent | usage | name

    let orderBy: any = { lastUsedAt: 'desc' };
    if (sort === 'usage') orderBy = { usageCount: 'desc' };
    else if (sort === 'name') orderBy = { name: 'asc' };

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const unlistedProducts = await prisma.unlistedProduct.findMany({
      where,
      orderBy,
    });

    return NextResponse.json({
      success: true,
      data: unlistedProducts.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: parseFloat(product.price.toString()),
        costPrice: product.costPrice ? parseFloat(product.costPrice.toString()) : null,
        quantity: product.quantity,
        image: product.image,
        usageCount: product.usageCount,
        lastUsedAt: product.lastUsedAt.toISOString(),
        createdAt: product.createdAt.toISOString(),
        description: product.description,
      })),
    });
  } catch (error) {
    console.error('Unlisted products GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/products/unlisted?id=xyz — Delete unlisted product from list
export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    // ✅ Verify product exists
    const product = await prisma.unlistedProduct.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // ✅ Delete it
    await prisma.unlistedProduct.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Deleted "${product.name}" from unlisted products`,
    });
  } catch (error) {
    console.error('Unlisted product DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
