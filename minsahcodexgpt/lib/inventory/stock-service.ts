// lib/inventory/stock-service.ts
// Core Inventory, Actual Buy Price & Runner Cash Settlement Service

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';

export type StockMovementInput = {
  productId: string;
  delta: number;
  type:
    | 'PURCHASE'
    | 'ORDER_FULFILLMENT'
    | 'RETURN_RESTOCK'
    | 'MANUAL_ADJUSTMENT'
    | 'DAMAGED_LOSS'
    | 'EXPIRED_DISCARD'
    | 'VENDOR_DEFECT_CLAIM'
    | 'VENDOR_DEFECT_EXCHANGED';
  referenceId?: string | null;
  costPriceAtTime?: number | null;
  notes?: string | null;
  createdByAdminId?: string | null;
};

/**
 * Record an atomic stock movement entry in the ledger.
 * Can be run standalone or within an existing Prisma transaction.
 */
export async function recordStockMovement(
  input: StockMovementInput,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;
  return db.stockMovement.create({
    data: {
      productId: input.productId,
      delta: input.delta,
      type: input.type,
      referenceId: input.referenceId ?? null,
      costPriceAtTime: input.costPriceAtTime != null ? new Prisma.Decimal(input.costPriceAtTime) : null,
      notes: input.notes ?? null,
      createdByAdminId: input.createdByAdminId ?? null,
    },
  });
}

/**
 * Update product stock quantity and log the movement.
 */
export async function adjustProductStock(
  productId: string,
  delta: number,
  type: StockMovementInput['type'],
  metadata: {
    referenceId?: string | null;
    costPriceAtTime?: number | null;
    notes?: string | null;
    createdByAdminId?: string | null;
  },
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;

  const product = await db.product.findUnique({
    where: { id: productId },
    select: { id: true, quantity: true, costPrice: true, lastCostPrice: true },
  });

  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  const newQuantity = Math.max(0, product.quantity + delta);

  await db.product.update({
    where: { id: productId },
    data: {
      quantity: newQuantity,
      ...(type === 'PURCHASE' && metadata.costPriceAtTime != null
        ? {
            lastCostPrice: new Prisma.Decimal(metadata.costPriceAtTime),
            // Update costPrice if never set before
            ...(product.costPrice == null
              ? { costPrice: new Prisma.Decimal(metadata.costPriceAtTime) }
              : {}),
          }
        : {}),
    },
  });

  const movement = await recordStockMovement(
    {
      productId,
      delta,
      type,
      referenceId: metadata.referenceId,
      costPriceAtTime:
        metadata.costPriceAtTime ??
        (product.lastCostPrice ? Number(product.lastCostPrice) : product.costPrice ? Number(product.costPrice) : null),
      notes: metadata.notes,
      createdByAdminId: metadata.createdByAdminId,
    },
    tx
  );

  return { product: { ...product, quantity: newQuantity }, movement };
}

/**
 * Runner Cash Ledger Reconciler
 * Calculates exact discrepancy: cashGiven - (actualSpent + cashReturned)
 */
export function calculateRunnerDiscrepancy(
  cashGiven: number,
  actualSpent: number,
  cashReturned: number
): { discrepancy: number; status: 'SETTLED' | 'DISCREPANCY' | 'PENDING' } {
  const discrepancy = Number((cashGiven - (actualSpent + cashReturned)).toFixed(2));
  if (Math.abs(discrepancy) < 0.01) {
    return { discrepancy: 0, status: 'SETTLED' };
  }
  return { discrepancy, status: 'DISCREPANCY' };
}
