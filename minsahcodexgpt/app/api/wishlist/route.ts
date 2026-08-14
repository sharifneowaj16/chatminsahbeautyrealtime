import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId } from '@/app/api/auth/_utils';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as { productId?: unknown } | null;
    const productId = typeof body?.productId === 'string' ? body.productId.trim() : '';

    if (!productId) {
      return NextResponse.json({ error: 'Product id is required' }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const item = await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: { userId, productId },
      select: { id: true, productId: true, createdAt: true },
    });

    return NextResponse.json({ item, message: 'Wishlist item saved' });
  } catch (error) {
    console.error('Error saving wishlist item:', error);
    return NextResponse.json({ error: 'Failed to save wishlist item' }, { status: 500 });
  }
}
