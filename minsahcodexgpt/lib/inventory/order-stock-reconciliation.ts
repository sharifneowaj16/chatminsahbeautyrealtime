// lib/inventory/order-stock-reconciliation.ts
// Order-to-Stock Real-time Reconciliation Engine
// Automatically decrements stock on DELIVERED and restocks on CANCELLED / RETURNED

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { recordStockMovement } from './stock-service';

export interface OrderStockReconciliationResult {
  reconciled: boolean;
  action: 'DECREMENTED_ON_DELIVERY' | 'RESTOCKED_ON_CANCEL_OR_RETURN' | 'NO_OP';
  itemsAffected: number;
  movementsLogged: number;
  details?: string;
}

/**
 * Reconcile stock quantities atomically during an order status transition.
 * Executes within the caller's transaction to ensure total consistency.
 */
export async function reconcileOrderStockOnStatusTransition(
  tx: Prisma.TransactionClient,
  orderId: string,
  prevStatus: string,
  nextStatus: string,
  adminId?: string | null
): Promise<OrderStockReconciliationResult> {
  const normPrev = prevStatus.toUpperCase();
  const normNext = nextStatus.toUpperCase();

  // If status didn't actually change, no-op
  if (normPrev === normNext) {
    return { reconciled: false, action: 'NO_OP', itemsAffected: 0, movementsLogged: 0 };
  }

  // 1. DELIVERY TRANSITION: From Non-Delivered to DELIVERED
  if (normPrev !== 'DELIVERED' && normNext === 'DELIVERED') {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            name: true,
            sku: true,
            product: {
              select: {
                id: true,
                quantity: true,
                costPrice: true,
                lastCostPrice: true,
              },
            },
          },
        },
      },
    });

    if (!order || !order.items.length) {
      return { reconciled: false, action: 'NO_OP', itemsAffected: 0, movementsLogged: 0 };
    }

    // Check if we already logged fulfillment for this order to prevent double deduction
    const existingMovement = await tx.stockMovement.findFirst({
      where: {
        referenceId: order.orderNumber,
        type: 'ORDER_FULFILLMENT',
      },
    });

    if (existingMovement) {
      return {
        reconciled: false,
        action: 'NO_OP',
        itemsAffected: 0,
        movementsLogged: 0,
        details: 'Fulfillment already logged for this order',
      };
    }

    let movementsLogged = 0;
    for (const item of order.items) {
      if (!item.productId || !item.product) continue;

      const currentQty = item.product.quantity;
      const nextQty = Math.max(0, currentQty - item.quantity);

      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: nextQty },
      });

      const effectiveCost =
        item.product.costPrice != null
          ? Number(item.product.costPrice)
          : item.product.lastCostPrice != null
            ? Number(item.product.lastCostPrice)
            : null;

      await recordStockMovement(
        {
          productId: item.productId,
          delta: -item.quantity,
          type: 'ORDER_FULFILLMENT',
          referenceId: order.orderNumber,
          costPriceAtTime: effectiveCost,
          notes: `Fulfillment on delivery for Order #${order.orderNumber} (${item.quantity} units of ${item.sku})`,
          createdByAdminId: adminId ?? null,
        },
        tx
      );

      movementsLogged++;
    }

    return {
      reconciled: true,
      action: 'DECREMENTED_ON_DELIVERY',
      itemsAffected: order.items.length,
      movementsLogged,
    };
  }

  // 2. CANCELLATION / RETURN TRANSITION: Was DELIVERED, now CANCELLED / RETURNED / REFUNDED
  const isReturnOrCancel =
    normNext === 'CANCELLED' || normNext === 'RETURNED' || normNext === 'REFUNDED';
  const wasPreviouslyDelivered = normPrev === 'DELIVERED';

  if (wasPreviouslyDelivered && isReturnOrCancel) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            sku: true,
            itemStatus: true,
            product: {
              select: {
                id: true,
                quantity: true,
                costPrice: true,
                lastCostPrice: true,
              },
            },
          },
        },
      },
    });

    if (!order || !order.items.length) {
      return { reconciled: false, action: 'NO_OP', itemsAffected: 0, movementsLogged: 0 };
    }

    // Check if restock was already logged
    const existingRestock = await tx.stockMovement.findFirst({
      where: {
        referenceId: order.orderNumber,
        type: { in: ['RETURN_RESTOCK', 'DAMAGED_LOSS'] },
      },
    });

    if (existingRestock) {
      return {
        reconciled: false,
        action: 'NO_OP',
        itemsAffected: 0,
        movementsLogged: 0,
        details: 'Restock or damaged return already logged for this order',
      };
    }

    let movementsLogged = 0;
    for (const item of order.items) {
      if (!item.productId || !item.product) continue;

      const effectiveCost =
        item.product.costPrice != null
          ? Number(item.product.costPrice)
          : item.product.lastCostPrice != null
            ? Number(item.product.lastCostPrice)
            : null;

      if (item.itemStatus === 'RETURNED_DAMAGED') {
        // Pillar 4 & 7: Do not restock damaged returns to inventory; record damaged loss
        await recordStockMovement(
          {
            productId: item.productId,
            delta: 0,
            type: 'DAMAGED_LOSS',
            referenceId: order.orderNumber,
            costPriceAtTime: effectiveCost,
            notes: `Damaged return write-off for Order #${order.orderNumber} (${item.quantity} units of ${item.sku})`,
            createdByAdminId: adminId ?? null,
          },
          tx
        );
      } else {
        // Restock good condition return
        const currentQty = item.product.quantity;
        const nextQty = currentQty + item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: nextQty },
        });

        await recordStockMovement(
          {
            productId: item.productId,
            delta: item.quantity,
            type: 'RETURN_RESTOCK',
            referenceId: order.orderNumber,
            costPriceAtTime: effectiveCost,
            notes: `Restock on ${normNext} for Order #${order.orderNumber} (+${item.quantity} units of ${item.sku})`,
            createdByAdminId: adminId ?? null,
          },
          tx
        );
      }

      movementsLogged++;
    }

    return {
      reconciled: true,
      action: 'RESTOCKED_ON_CANCEL_OR_RETURN',
      itemsAffected: order.items.length,
      movementsLogged,
    };
  }

  return { reconciled: false, action: 'NO_OP', itemsAffected: 0, movementsLogged: 0 };
}
