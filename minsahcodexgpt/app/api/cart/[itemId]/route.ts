import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthenticatedUserId } from '@/app/api/auth/_utils';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await params;
    const { quantity } = (await request.json()) as { quantity?: number };

    if (quantity == null || !Number.isFinite(quantity) || quantity < 0) {
      return NextResponse.json({ error: 'Valid quantity is required' }, { status: 400 });
    }

    const cartItem = await prisma.cartItem.findFirst({
      where: { id: itemId, userId },
      include: { product: true, variant: true },
    });

    if (!cartItem) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }

    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: itemId } });
      return NextResponse.json({ success: true, deleted: true });
    }

    const availableStock = cartItem.variant
      ? cartItem.variant.quantity
      : cartItem.product.quantity;

    if (quantity > availableStock) {
      return NextResponse.json(
        { error: `Only ${availableStock} items available in stock` },
        { status: 400 }
      );
    }

    const updated = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: {
        product: {
          include: {
            images: { take: 1, orderBy: { sortOrder: 'asc' } },
            brand: true,
          },
        },
        variant: true,
      },
    });

    return NextResponse.json({
      success: true,
      item: {
        id: updated.id,
        productId: updated.productId,
        variantId: updated.variantId,
        quantity: updated.quantity,
        product: {
          id: updated.product.id,
          name: updated.product.name,
          slug: updated.product.slug,
          price: updated.product.price.toNumber(),
          image: updated.product.images[0]?.url || null,
          brand: updated.product.brand?.name || null,
          stock: updated.product.quantity,
        },
        variant: updated.variant
          ? {
              id: updated.variant.id,
              name: updated.variant.name,
              price: updated.variant.price?.toNumber() || updated.product.price.toNumber(),
              stock: updated.variant.quantity,
              attributes: updated.variant.attributes,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Error updating cart item:', error);
    return NextResponse.json({ error: 'Failed to update cart item' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await params;
    const cartItem = await prisma.cartItem.findFirst({
      where: { id: itemId, userId },
    });

    if (!cartItem) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }

    await prisma.cartItem.delete({ where: { id: itemId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing cart item:', error);
    return NextResponse.json({ error: 'Failed to remove cart item' }, { status: 500 });
  }
}
