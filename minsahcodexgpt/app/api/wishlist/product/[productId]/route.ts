import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId } from '@/app/api/auth/_utils';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId } = await context.params;
    if (!productId) {
      return NextResponse.json({ error: 'Product id is required' }, { status: 400 });
    }

    await prisma.wishlistItem.deleteMany({
      where: { userId, productId },
    });

    return NextResponse.json({ message: 'Wishlist item removed' });
  } catch (error) {
    console.error('Error removing wishlist product:', error);
    return NextResponse.json({ error: 'Failed to remove wishlist item' }, { status: 500 });
  }
}
