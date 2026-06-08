// app/api/admin/shortlist/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ===== GET PARAMS =====
    const { id } = await context.params;

    // ===== AUTH CHECK =====
    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const itemId = id;
    const body = await request.json();
    const { purchased, purchasedAt, priority, notes } = body;

    // ===== VALIDATE INPUT =====
    if (typeof purchased !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid purchased status' },
        { status: 400 }
      );
    }

    // ===== FIND SHORTLIST ITEM =====
    let shortlistItem = await prisma.purchaseShortlist.findUnique({
      where: { id: itemId },
    });

    if (!shortlistItem) {
      return NextResponse.json(
        { error: 'Shortlist item not found' },
        { status: 404 }
      );
    }

    const orderId = shortlistItem.orderId;

    // ===== UPDATE ITEM =====
    const now = new Date();
    shortlistItem = await prisma.purchaseShortlist.update({
      where: { id: itemId },
      data: {
        purchased,
        purchasedAt: purchased ? new Date(purchasedAt || now) : null,
        ...(priority && { priority }),
        ...(notes !== undefined && { notes }),
        updatedAt: now,
      },
    });

    // ===== CHECK IF ORDER IS COMPLETE =====
    const allItems = await prisma.purchaseShortlist.findMany({
      where: { orderId },
    });

    const allPurchased = allItems.every((item) => item.purchased);
    const completedAt = allPurchased ? now : null;

    // ===== GET UPDATED ORDER DATA =====
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                costPrice: true,
                price: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // ===== CALCULATE ORDER METRICS =====
    const items = order.items.map((item) => ({
      id: `${order.id}-${item.productId ?? item.id}`,
      orderId: order.id,
      productId: item.productId ?? '',
      productName: item.product?.name ?? item.name,
      quantity: item.quantity,
      buyPrice: item.product?.costPrice
        ? parseFloat(item.product.costPrice.toString())
        : 0,
      sellPrice: parseFloat(item.price.toString()),
      purchased: allItems.find((ai) => ai.productId === item.productId)
        ?.purchased || false,
      purchasedAt: allItems.find((ai) => ai.productId === item.productId)
        ?.purchasedAt || null,
      priority: allItems.find((ai) => ai.productId === item.productId)
        ?.priority || 'NORMAL',
      notes: allItems.find((ai) => ai.productId === item.productId)?.notes || null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));

    const totalProducts = items.length;
    const purchasedProducts = items.filter((i) => i.purchased).length;
    const unpurchasedProducts = totalProducts - purchasedProducts;
    const progress =
      totalProducts > 0 ? (purchasedProducts / totalProducts) * 100 : 0;
    const isCompleted = purchasedProducts === totalProducts && totalProducts > 0;

    const totalProfit = items.reduce((sum, item) => {
      const profit = (item.sellPrice - item.buyPrice) * item.quantity;
      return sum + profit;
    }, 0);

    const user = await prisma.user.findUnique({
      where: { id: order.userId },
      select: {
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    // ===== RESPONSE =====
    return NextResponse.json({
      success: true,
      data: {
        shortlistItem,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          userId: order.userId,
          createdAt: order.createdAt,
          customer: {
            name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
            phone: user?.phone,
          },
          items,
          totalProducts,
          purchasedProducts,
          unpurchasedProducts,
          progress: Math.round(progress),
          isCompleted,
          totalProfit: Math.round(totalProfit),
          completedAt: isCompleted ? now : null,
        },
        message: isCompleted
          ? '✅ Order completed! All products have been purchased.'
          : `Updated. ${unpurchasedProducts} products remaining.`,
      },
    });
  } catch (error) {
    console.error('Shortlist PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
