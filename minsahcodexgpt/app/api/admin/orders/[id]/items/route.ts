// app/api/admin/orders/[id]/items/route.ts
// Pillar 8: Item-Level Partial Delivery, Return & Product Exchange Reconciler

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';
import { recordStockMovement } from '@/lib/inventory/stock-service';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET: Fetch all items for an order with their granular statuses
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { id: orderId } = await Promise.resolve(context.params);

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                quantity: true,
                costPrice: true,
                lastCostPrice: true,
                price: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderStatus: order.status,
        items: order.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          sku: item.sku,
          name: item.name,
          price: Number(item.price),
          quantity: item.quantity,
          total: Number(item.total),
          itemStatus: item.itemStatus,
          returnReason: item.returnReason,
          currentProductStock: item.product?.quantity ?? null,
          productCost: item.product?.lastCostPrice != null ? Number(item.product.lastCostPrice) : item.product?.costPrice != null ? Number(item.product.costPrice) : null,
        })),
      },
    });
  } catch (err: any) {
    console.error('[order-items-api] GET Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch order items' },
      { status: 500 }
    );
  }
}

// PATCH: Update item-level status (partial delivery, good return, damaged return, exchange)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { id: orderId } = await Promise.resolve(context.params);
    const body = await request.json();
    const {
      itemId,
      itemStatus, // 'FULFILLED' | 'RETURNED_GOOD' | 'RETURNED_DAMAGED' | 'EXCHANGED'
      returnReason,
      exchangeProductId,
      exchangeQty = 1,
      adminNotes,
    } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    const validStatuses = ['FULFILLED', 'RETURNED_GOOD', 'RETURNED_DAMAGED', 'RETURNED_DEFECTIVE', 'EXCHANGED'];
    if (!itemStatus || !validStatuses.includes(itemStatus)) {
      return NextResponse.json(
        { error: `itemStatus must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find the order
      const order = await tx.order.findFirst({
        where: {
          OR: [{ id: orderId }, { orderNumber: orderId }],
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Find the specific item
      const item = await tx.orderItem.findFirst({
        where: {
          id: itemId,
          orderId: order.id,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              quantity: true,
              costPrice: true,
              lastCostPrice: true,
            },
          },
        },
      });

      if (!item) {
        throw new Error('Item not found in this order');
      }

      const prevStatus = item.itemStatus;
      const nextStatus = itemStatus;

      if (prevStatus === nextStatus) {
        return { item, changed: false, message: 'Item status already matches requested state' };
      }

      const effectiveCost =
        item.product?.lastCostPrice != null
          ? Number(item.product.lastCostPrice)
          : item.product?.costPrice != null
            ? Number(item.product.costPrice)
            : null;

      let exchangePriceDifference = 0;
      let replacementProductName: string | null = null;
      let replacementProductPrice: number | null = null;
      let newOrderTotal = Number(order.total);

      // Handle stock adjustments based on transition
      if (item.productId && item.product) {
        // Transition: FULFILLED -> RETURNED_GOOD (restock)
        if (prevStatus === 'FULFILLED' && nextStatus === 'RETURNED_GOOD') {
          const nextStock = item.product.quantity + item.quantity;
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: nextStock },
          });

          await recordStockMovement(
            {
              productId: item.productId,
              delta: item.quantity,
              type: 'RETURN_RESTOCK',
              referenceId: order.orderNumber,
              costPriceAtTime: effectiveCost,
              notes: `Item-level good return for Order #${order.orderNumber} (${item.sku}). ${adminNotes || returnReason || ''}`,
              createdByAdminId: payload.adminId ?? null,
            },
            tx
          );
        }

        // Transition: FULFILLED -> RETURNED_DAMAGED (scrap write-off, no restock)
        else if (prevStatus === 'FULFILLED' && nextStatus === 'RETURNED_DAMAGED') {
          await recordStockMovement(
            {
              productId: item.productId,
              delta: 0,
              type: 'DAMAGED_LOSS',
              referenceId: order.orderNumber,
              costPriceAtTime: effectiveCost,
              notes: `Item-level damaged scrap for Order #${order.orderNumber} (${item.sku}). ${adminNotes || returnReason || ''}`,
              createdByAdminId: payload.adminId ?? null,
            },
            tx
          );
        }

        // Transition: -> RETURNED_DEFECTIVE (vendor defect claim: held for supplier exchange, zero net scrap loss)
        else if (nextStatus === 'RETURNED_DEFECTIVE') {
          await recordStockMovement(
            {
              productId: item.productId,
              delta: 0,
              type: 'VENDOR_DEFECT_CLAIM',
              referenceId: order.orderNumber,
              costPriceAtTime: effectiveCost,
              notes: `Item-level vendor defect claim for Order #${order.orderNumber} (${item.sku}). Queued for wholesale supplier replacement. ${adminNotes || returnReason || ''}`,
              createdByAdminId: payload.adminId ?? null,
            },
            tx
          );
        }

        // Transition: RETURNED_GOOD -> FULFILLED (redelivered/reclaimed)
        else if (prevStatus === 'RETURNED_GOOD' && nextStatus === 'FULFILLED') {
          const nextStock = Math.max(0, item.product.quantity - item.quantity);
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: nextStock },
          });

          await recordStockMovement(
            {
              productId: item.productId,
              delta: -item.quantity,
              type: 'ORDER_FULFILLMENT',
              referenceId: order.orderNumber,
              costPriceAtTime: effectiveCost,
              notes: `Re-fulfillment after return for Order #${order.orderNumber} (${item.sku})`,
              createdByAdminId: payload.adminId ?? null,
            },
            tx
          );
        }

        // Transition: -> EXCHANGED (Pillar 8 & Refinement 5: Price Gap Reconciler)
        else if (nextStatus === 'EXCHANGED') {
          // 1. Restock original item if good condition
          const nextStock = item.product.quantity + item.quantity;
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: nextStock },
          });

          await recordStockMovement(
            {
              productId: item.productId,
              delta: item.quantity,
              type: 'RETURN_RESTOCK',
              referenceId: order.orderNumber,
              costPriceAtTime: effectiveCost,
              notes: `Exchanged original item returned for Order #${order.orderNumber} (${item.sku})`,
              createdByAdminId: payload.adminId ?? null,
            },
            tx
          );

          // 2. If replacement product provided, decrement replacement stock & adjust price difference
          if (exchangeProductId) {
            const replProduct = await tx.product.findUnique({
              where: { id: exchangeProductId },
            });

            if (replProduct) {
              replacementProductName = replProduct.name;
              replacementProductPrice = Number(replProduct.price);
              const originalPrice = Number(item.price);
              const count = exchangeQty > 0 ? exchangeQty : item.quantity;

              // Refinement 5: Calculate exact price difference
              exchangePriceDifference = Number(((replacementProductPrice - originalPrice) * count).toFixed(2));

              const replStock = Math.max(0, replProduct.quantity - count);
              await tx.product.update({
                where: { id: exchangeProductId },
                data: { quantity: replStock },
              });

              const replCost = replProduct.lastCostPrice != null ? Number(replProduct.lastCostPrice) : replProduct.costPrice != null ? Number(replProduct.costPrice) : null;

              await recordStockMovement(
                {
                  productId: exchangeProductId,
                  delta: -count,
                  type: 'ORDER_FULFILLMENT',
                  referenceId: order.orderNumber,
                  costPriceAtTime: replCost,
                  notes: `Exchange replacement product dispatched for Order #${order.orderNumber} (${replProduct.sku})`,
                  createdByAdminId: payload.adminId ?? null,
                },
                tx
              );

              // Refinement 5: Atomically adjust order Subtotal and Total (COD Collectible)
              if (exchangePriceDifference !== 0) {
                const currentSubtotal = Number(order.subtotal);
                const currentTotal = Number(order.total);
                const newSubtotal = Math.max(0, Number((currentSubtotal + exchangePriceDifference).toFixed(2)));
                newOrderTotal = Math.max(0, Number((currentTotal + exchangePriceDifference).toFixed(2)));

                const exchangeNote = `[Exchange Reconciler]: Item ${item.name} (৳${originalPrice}) exchanged for ${replProduct.name} (৳${replacementProductPrice}). Price diff: ${exchangePriceDifference > 0 ? '+' : ''}৳${exchangePriceDifference}. Order Total updated to ৳${newOrderTotal}.`;

                await tx.order.update({
                  where: { id: order.id },
                  data: {
                    subtotal: newSubtotal,
                    total: newOrderTotal,
                    adminNote: order.adminNote ? `${order.adminNote}\n${exchangeNote}` : exchangeNote,
                  },
                });
              }
            }
          }
        }
      }

      // Update the OrderItem record
      const updatedItem = await tx.orderItem.update({
        where: { id: item.id },
        data: {
          itemStatus: nextStatus,
          returnReason: returnReason || item.returnReason,
        },
      });

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        itemId: updatedItem.id,
        prevStatus,
        nextStatus,
        exchangePriceDifference,
        replacementProductName,
        replacementProductPrice,
        newOrderTotal,
        changed: true,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Item status updated from ${result.prevStatus} to ${result.nextStatus}`,
      data: result,
    });
  } catch (err: any) {
    console.error('[order-items-api] PATCH Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to update order item status' },
      { status: 500 }
    );
  }
}
