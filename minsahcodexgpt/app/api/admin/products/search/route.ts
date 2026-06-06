import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';
import { Prisma } from '@/generated/prisma/client';
type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

export const dynamic = 'force-dynamic';

// GET /api/admin/products/search?q=query
// Quick search for products during order creation
// Returns: id, name, sku, price, quantity, isActive
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
    const q = searchParams.get('q') || '';

    if (!q.trim()) {
      return NextResponse.json({ products: [] });
    }

    const query = q.trim();
    const limit = 15;

    // Search: name, sku, barcode
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
        { barcode: { contains: query, mode: 'insensitive' } },
      ],
    };

    const products = await prisma.product.findMany({
      where,
      take: limit,
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        quantity: true,
        isActive: true,
        image: {
          where: { isDefault: true },
          take: 1,
          select: { url: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Shape response
    const result = products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: parseFloat(p.price.toString()),
      quantity: p.quantity,
      isActive: p.isActive,
      image: p.image[0]?.url ?? null,
    }));

    return NextResponse.json({ products: result });
  } catch (error) {
    console.error('Admin product search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
