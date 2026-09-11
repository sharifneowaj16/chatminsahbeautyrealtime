import prisma from '@/lib/prisma';
import { LOYALTY_CONFIG } from '@/types/user';
import { Prisma } from '@/generated/prisma/client';

type PrismaTransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Calculates loyalty points earned or deductible for a given amount.
 * 1 BDT = 1 Point (based on LOYALTY_CONFIG.points_per_bdt).
 */
export function calculateLoyaltyPoints(amount: number | Prisma.Decimal | string | null | undefined): number {
  if (amount === null || amount === undefined) return 0;
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.max(0, Math.round(num * (LOYALTY_CONFIG.points_per_bdt || 1)));
}

/**
 * Awards loyalty points to a user when an order is completed/delivered.
 * Prevents double-awarding if order was already delivered.
 * Auto-fetches userId and total from DB if missing from the order parameter.
 */
export async function awardLoyaltyPointsForOrder(
  tx: PrismaTransactionClient,
  order: { id: string; userId?: string | null; total?: number | Prisma.Decimal | string | null },
  previousStatus?: string | null
): Promise<{ awarded: number; currentPoints: number }> {
  let userId = order.userId;
  let total = order.total;

  if (!userId || total === undefined || total === null) {
    const fetched = await tx.order.findUnique({
      where: { id: order.id },
      select: { userId: true, total: true },
    });
    if (!fetched) {
      return { awarded: 0, currentPoints: 0 };
    }
    userId = fetched.userId;
    total = fetched.total;
  }

  if (!userId || previousStatus === 'DELIVERED') {
    return { awarded: 0, currentPoints: 0 };
  }

  const pointsToAward = calculateLoyaltyPoints(total);
  if (pointsToAward <= 0) {
    return { awarded: 0, currentPoints: 0 };
  }

  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true, loyaltyPoints: true },
  });

  if (!user) {
    return { awarded: 0, currentPoints: 0 };
  }

  const updatedUser = await tx.user.update({
    where: { id: userId },
    data: {
      loyaltyPoints: { increment: pointsToAward },
    },
    select: { loyaltyPoints: true },
  });

  return { awarded: pointsToAward, currentPoints: updatedUser.loyaltyPoints };
}

/**
 * Claws back (deducts) loyalty points from a user when an order is cancelled, refunded,
 * or returned, ensuring the balance does not drop below zero.
 * 
 * Only executes if the order was previously in a state that earned points (e.g. DELIVERED).
 * Auto-fetches userId and total from DB if missing from the order parameter.
 */
export async function clawbackLoyaltyPointsForOrder(
  tx: PrismaTransactionClient,
  order: { id: string; userId?: string | null; total?: number | Prisma.Decimal | string | null },
  options: { previousStatus?: string | null; forceClawback?: boolean } = {}
): Promise<{ clawedBack: number; currentPoints: number }> {
  let userId = order.userId;
  let total = order.total;

  if (!userId || total === undefined || total === null) {
    const fetched = await tx.order.findUnique({
      where: { id: order.id },
      select: { userId: true, total: true },
    });
    if (!fetched) {
      return { clawedBack: 0, currentPoints: 0 };
    }
    userId = fetched.userId;
    total = fetched.total;
  }

  if (!userId) {
    return { clawedBack: 0, currentPoints: 0 };
  }

  // If previous status was not DELIVERED and forceClawback is not set, no points were earned
  if (!options.forceClawback && options.previousStatus !== 'DELIVERED') {
    return { clawedBack: 0, currentPoints: 0 };
  }

  const pointsToDeduct = calculateLoyaltyPoints(total);
  if (pointsToDeduct <= 0) {
    return { clawedBack: 0, currentPoints: 0 };
  }

  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true, loyaltyPoints: true },
  });

  if (!user) {
    return { clawedBack: 0, currentPoints: 0 };
  }

  // Safe deduction: balance cannot become negative
  const newBalance = Math.max(0, user.loyaltyPoints - pointsToDeduct);
  const actualClawedBack = user.loyaltyPoints - newBalance;

  const updatedUser = await tx.user.update({
    where: { id: userId },
    data: {
      loyaltyPoints: newBalance,
    },
    select: { loyaltyPoints: true },
  });

  return { clawedBack: actualClawedBack, currentPoints: updatedUser.loyaltyPoints };
}

/**
 * Claws back loyalty points for an approved or completed return item/request.
 * Ensures the user's loyaltyPoints balance never drops below zero.
 */
export async function clawbackLoyaltyPointsForReturn(
  tx: PrismaTransactionClient,
  returnRecord: { id: string; userId: string; refundAmount: number | Prisma.Decimal | string },
  previousStatus?: string | null
): Promise<{ clawedBack: number; currentPoints: number }> {
  if (!returnRecord.userId) {
    return { clawedBack: 0, currentPoints: 0 };
  }

  // Avoid double clawback if return was already completed or approved
  if (previousStatus === 'COMPLETED' || previousStatus === 'APPROVED') {
    return { clawedBack: 0, currentPoints: 0 };
  }

  const pointsToDeduct = calculateLoyaltyPoints(returnRecord.refundAmount);
  if (pointsToDeduct <= 0) {
    return { clawedBack: 0, currentPoints: 0 };
  }

  const user = await tx.user.findUnique({
    where: { id: returnRecord.userId },
    select: { id: true, loyaltyPoints: true },
  });

  if (!user) {
    return { clawedBack: 0, currentPoints: 0 };
  }

  const newBalance = Math.max(0, user.loyaltyPoints - pointsToDeduct);
  const actualClawedBack = user.loyaltyPoints - newBalance;

  const updatedUser = await tx.user.update({
    where: { id: returnRecord.userId },
    data: {
      loyaltyPoints: newBalance,
    },
    select: { loyaltyPoints: true },
  });

  return { clawedBack: actualClawedBack, currentPoints: updatedUser.loyaltyPoints };
}
