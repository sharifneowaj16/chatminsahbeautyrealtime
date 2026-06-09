// app/api/admin/shortlist/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload)
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    const body = await request.json();
    const { purchased, purchasedAt, priority, notes } = body;

    if (typeof purchased !== 'boolean')
      return NextResponse.json({ error: 'Invalid purchased status' }, { status: 400 });

    // Find the shortlist item — works for both real and custom products
    // because both now have a real DB row with a real cuid
    let shortlistItem = await prisma.purchaseShortlist.findUnique({ where: { id } });

    if (!shortlistItem)
      return NextResponse.json({ error: 'Shortlist item not found' }, { status: 404 });

    const orderId = shortlistItem.orderId;
    const now = new Date();

    shortlistItem = await prisma.purchaseShortlist.update({
      where: { id },
      data: {
        purchased,
        purchasedAt: purchased ? new Date(purchasedAt || now) : null,
        ...(priority && { priority }),
        ...(notes !== undefined && { notes }),
        updatedAt: now,
      },
    });

    // Fetch all shortlist records for this order
    const allShortlistRecords = await prisma.purchaseShortlist.findMany({
      where: { orderId },
    });

    const allPurchased = allShortlistRecords.every(r => r.purchased);

    // Fetch order with items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, costPrice: true, price: true } },
          },
        },
      },
    });

    if (!order)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const usedCustomIds = new Set<string>();

    const items = order.items.map(item => {
      let dbRecord: (typeof allShortlistRecords)[number] | undefined;

      if (item.productId) {
        // Real product: match by productId
        dbRecord = allShortlistRecords.find(r => r.productId === item.productId);
      } else {
        // Custom product: match by productName, avoid double-matching
        dbRecord = allShortlistRecords.find(
          r => r.productId === null
            && r.productName === (item.product?.name ?? item.name)
            && !usedCustomIds.has(r.id)
        );
        if (dbRecord) usedCustomIds.add(dbRecord.id);
      }

      return {
        id:          dbRecord?.id          ?? `fallback-${order.id}-${item.id}`,
        orderId:     order.id,
        productId:   item.productId ?? null,
        productName: item.product?.name ?? item.name,
        quantity:    item.quantity,
        buyPrice:    item.product?.costPrice
                       ? parseFloat(item.product.costPrice.toString())
                       : 0,
        sellPrice:   parseFloat(item.price.toString()),
        purchased:   dbRecord?.purchased   ?? false,
        purchasedAt: dbRecord?.purchasedAt ?? null,
        priority:    dbRecord?.priority    ?? 'NORMAL',
        notes:       dbRecord?.notes       ?? null,
        createdAt:   order.createdAt,
        updatedAt:   order.updatedAt,
      };
    });

    const totalProducts       = items.length;
    const purchasedProducts   = items.filter(i => i.purchased).length;
    const unpurchasedProducts = totalProducts - purchasedProducts;
    const progress    = totalProducts > 0 ? (purchasedProducts / totalProducts) * 100 : 0;
    const isCompleted = purchasedProducts === totalProducts && totalProducts > 0;
    const totalProfit = items.reduce(
      (sum, i) => sum + (i.sellPrice - i.buyPrice) * i.quantity, 0
    );

    const user = await prisma.user.findUnique({
      where: { id: order.userId },
      select: { firstName: true, lastName: true, phone: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        shortlistItem,
        order: {
          id:           order.id,
          orderNumber:  order.orderNumber,
          userId:       order.userId,
          createdAt:    order.createdAt,
          customer: {
            name:  `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
            phone: user?.phone,
          },
          items,
          totalProducts,
          purchasedProducts,
          unpurchasedProducts,
          progress:    Math.round(progress),
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
