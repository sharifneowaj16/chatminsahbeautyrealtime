import 'server-only';

import type prismaClient from '@/lib/prisma';

export const ONLINE_PAYMENT_RESERVATION_MINUTES = 15;
export const ONLINE_PAYMENT_EXPIRY_LIMIT = 100;

export type OnlinePaymentStockErrorCode =
  | 'ONLINE_STOCK_RESERVATION_FAILED'
  | 'COD_STOCK_DECREMENT_FAILED'
  | 'ORDER_NOT_FOUND_FOR_STOCK_FINALIZATION'
  | 'ONLINE_STOCK_FINALIZATION_FAILED'
  | 'ONLINE_STOCK_RESERVATION_ALREADY_RELEASED'
  | 'ORDER_NOT_FOUND_FOR_STOCK_RELEASE'
  | 'ONLINE_STOCK_RELEASE_FAILED';

export class OnlinePaymentStockError extends Error {
  code: OnlinePaymentStockErrorCode;

  constructor(code: OnlinePaymentStockErrorCode) {
    super(code);
    this.name = 'OnlinePaymentStockError';
    this.code = code;
  }
}

type PrismaTransaction = Omit<
  typeof prismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

type OrderStockItem = {
  productId: string | null;
  variantId: string | null;
  quantity: number;
};

type ProductStockSnapshot = {
  id: string;
  trackInventory: boolean;
  allowBackorder: boolean;
  quantity: number;
  reservedQuantity?: number | null;
};

type VariantStockSnapshot = {
  id: string;
  productId: string;
  quantity: number;
  reservedQuantity?: number | null;
};

export function getOnlinePaymentExpiresAt(now = new Date()) {
  return new Date(now.getTime() + ONLINE_PAYMENT_RESERVATION_MINUTES * 60 * 1000);
}

export function availableProductStock(product: ProductStockSnapshot) {
  return product.quantity - (product.reservedQuantity ?? 0);
}

export function availableVariantStock(variant: VariantStockSnapshot) {
  return variant.quantity - (variant.reservedQuantity ?? 0);
}

function normalizedQuantity(quantity: number) {
  return Math.max(1, Math.trunc(Number(quantity) || 1));
}

export async function reserveOnlineOrderStockInTransaction(
  tx: PrismaTransaction,
  items: OrderStockItem[],
  productsById: Map<string, ProductStockSnapshot>,
  variantsById: Map<string, VariantStockSnapshot>,
) {
  for (const item of items) {
    if (!item.productId) continue;
    const product = productsById.get(item.productId);
    if (!product || !product.trackInventory || product.allowBackorder) continue;

    const quantity = normalizedQuantity(item.quantity);

    if (item.variantId) {
      const variant = variantsById.get(item.variantId);
      if (!variant || variant.productId !== item.productId) {
        throw new OnlinePaymentStockError('ONLINE_STOCK_RESERVATION_FAILED');
      }

      const updated = await tx.productVariant.updateMany({
        where: {
          id: item.variantId,
          productId: item.productId,
          quantity: { gte: quantity },
          reservedQuantity: { lte: variant.quantity - quantity },
        },
        data: { reservedQuantity: { increment: quantity } },
      });
      if (updated.count !== 1) {
        throw new OnlinePaymentStockError('ONLINE_STOCK_RESERVATION_FAILED');
      }
      continue;
    }

    const updated = await tx.product.updateMany({
      where: {
        id: item.productId,
        quantity: { gte: quantity },
        reservedQuantity: { lte: product.quantity - quantity },
      },
      data: { reservedQuantity: { increment: quantity } },
    });
    if (updated.count !== 1) {
      throw new OnlinePaymentStockError('ONLINE_STOCK_RESERVATION_FAILED');
    }
  }
}

/**
 * COD inventory is finalized immediately. For normal inventory, use a guarded
 * updateMany so two concurrent checkouts cannot both pass a stale pre-check.
 * Backorder-enabled products keep the existing unrestricted decrement behavior.
 */
export async function decrementCodOrderStockInTransaction(
  tx: PrismaTransaction,
  items: OrderStockItem[],
  productsById: Map<string, ProductStockSnapshot>,
) {
  for (const item of items) {
    if (!item.productId) continue;
    const product = productsById.get(item.productId);
    if (!product || !product.trackInventory) continue;

    const quantity = normalizedQuantity(item.quantity);

    if (item.variantId) {
      if (product.allowBackorder) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { quantity: { decrement: quantity } },
        });
        continue;
      }

      const updated = await tx.productVariant.updateMany({
        where: {
          id: item.variantId,
          productId: item.productId,
          quantity: { gte: quantity },
        },
        data: { quantity: { decrement: quantity } },
      });

      if (updated.count !== 1) {
        throw new OnlinePaymentStockError('COD_STOCK_DECREMENT_FAILED');
      }
      continue;
    }

    if (product.allowBackorder) {
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { decrement: quantity } },
      });
      continue;
    }

    const updated = await tx.product.updateMany({
      where: { id: item.productId, quantity: { gte: quantity } },
      data: { quantity: { decrement: quantity } },
    });

    if (updated.count !== 1) {
      throw new OnlinePaymentStockError('COD_STOCK_DECREMENT_FAILED');
    }
  }
}

export async function finalizeOnlineOrderStockInTransaction(
  tx: PrismaTransaction,
  orderId: string,
) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      stockReservedAt: true,
      stockFinalizedAt: true,
      stockReleasedAt: true,
      items: {
        select: {
          productId: true,
          variantId: true,
          quantity: true,
          product: {
            select: {
              id: true,
              trackInventory: true,
              allowBackorder: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new OnlinePaymentStockError('ORDER_NOT_FOUND_FOR_STOCK_FINALIZATION');
  }
  if (order.stockFinalizedAt) {
    return { finalized: false, reason: 'ALREADY_FINALIZED' as const };
  }
  if (order.stockReleasedAt) {
    throw new OnlinePaymentStockError('ONLINE_STOCK_RESERVATION_ALREADY_RELEASED');
  }

  for (const item of order.items) {
    if (!item.productId || !item.product?.trackInventory) continue;

    const quantity = normalizedQuantity(item.quantity);

    // Backorder products are intentionally not reserved. Finalize them with the
    // same unrestricted decrement behavior used by immediate COD checkout.
    if (item.product.allowBackorder) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { quantity: { decrement: quantity } },
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: quantity } },
        });
      }
      continue;
    }

    if (item.variantId) {
      const data = order.stockReservedAt
        ? {
            quantity: { decrement: quantity },
            reservedQuantity: { decrement: quantity },
          }
        : { quantity: { decrement: quantity } };

      const where = order.stockReservedAt
        ? {
            id: item.variantId,
            productId: item.productId,
            reservedQuantity: { gte: quantity },
            quantity: { gte: quantity },
          }
        : {
            id: item.variantId,
            productId: item.productId,
            quantity: { gte: quantity },
          };

      const updated = await tx.productVariant.updateMany({ where, data });
      if (updated.count !== 1) {
        throw new OnlinePaymentStockError('ONLINE_STOCK_FINALIZATION_FAILED');
      }
      continue;
    }

    const data = order.stockReservedAt
      ? {
          quantity: { decrement: quantity },
          reservedQuantity: { decrement: quantity },
        }
      : { quantity: { decrement: quantity } };

    const where = order.stockReservedAt
      ? {
          id: item.productId,
          reservedQuantity: { gte: quantity },
          quantity: { gte: quantity },
        }
      : { id: item.productId, quantity: { gte: quantity } };

    const updated = await tx.product.updateMany({ where, data });
    if (updated.count !== 1) {
      throw new OnlinePaymentStockError('ONLINE_STOCK_FINALIZATION_FAILED');
    }
  }

  return { finalized: true };
}

export async function releaseOnlineOrderReservationInTransaction(
  tx: PrismaTransaction,
  orderId: string,
) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      stockReservedAt: true,
      stockFinalizedAt: true,
      stockReleasedAt: true,
      items: {
        select: {
          productId: true,
          variantId: true,
          quantity: true,
          product: {
            select: {
              id: true,
              trackInventory: true,
              allowBackorder: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new OnlinePaymentStockError('ORDER_NOT_FOUND_FOR_STOCK_RELEASE');
  }
  if (!order.stockReservedAt || order.stockFinalizedAt || order.stockReleasedAt) {
    return { released: false, reason: 'NOT_RELEASABLE' as const };
  }

  for (const item of order.items) {
    if (
      !item.productId ||
      !item.product?.trackInventory ||
      item.product.allowBackorder
    ) {
      continue;
    }

    const quantity = normalizedQuantity(item.quantity);

    if (item.variantId) {
      const updated = await tx.productVariant.updateMany({
        where: {
          id: item.variantId,
          productId: item.productId,
          reservedQuantity: { gte: quantity },
        },
        data: { reservedQuantity: { decrement: quantity } },
      });
      if (updated.count !== 1) {
        throw new OnlinePaymentStockError('ONLINE_STOCK_RELEASE_FAILED');
      }
      continue;
    }

    const updated = await tx.product.updateMany({
      where: {
        id: item.productId,
        reservedQuantity: { gte: quantity },
      },
      data: { reservedQuantity: { decrement: quantity } },
    });
    if (updated.count !== 1) {
      throw new OnlinePaymentStockError('ONLINE_STOCK_RELEASE_FAILED');
    }
  }

  return { released: true };
}
