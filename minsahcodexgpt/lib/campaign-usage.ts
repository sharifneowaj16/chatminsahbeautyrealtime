import 'server-only';

import prisma from '@/lib/prisma';
import { normalizeBangladeshPhoneNumber } from '@/lib/phone';
import { normalizeFlashDealsConfig } from '@/lib/homepageConfig';
import { OrderValidationError } from '@/lib/order-validation';

export type PrismaTransaction = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export type CampaignReservationItem = {
  productId: string;
  variantId?: string | null;
  quantity: number;
  pricingSource?: string;
  campaignRef?: string | null;
};

export type ReserveCampaignUsageParams = {
  items: CampaignReservationItem[];
  userId: string;
  phone: string | null | undefined;
  orderId: string;
  isOnlinePayment: boolean;
  reservedUntil?: Date | null;
};

/**
 * Atomically reserve or confirm campaign usage for limited Flash Deals inside a database transaction.
 * Follows Minsah Master Architecture Spec Section 6.
 */
export async function reserveCampaignUsageInTransaction(
  tx: PrismaTransaction,
  params: ReserveCampaignUsageParams,
) {
  const flashItems = params.items.filter(
    (item) => item.pricingSource === 'FLASH_DEAL' && item.campaignRef,
  );

  if (flashItems.length === 0) {
    return { reservedCount: 0 };
  }

  const normalizedPhone = normalizeBangladeshPhoneNumber(params.phone);
  if (!normalizedPhone) {
    throw new OrderValidationError(
      'Flash Deal অফারটি অর্ডারের জন্য একটি সঠিক ১১-ডিজিটের বাংলাদেশি মোবাইল নম্বর প্রয়োজন।',
      'PHONE_REQUIRED_FOR_CAMPAIGN',
      400,
    );
  }

  // Aggregate quantity per campaignRef to enforce shared variant limits (Spec Section 3.2)
  const qtyByCampaign = new Map<string, number>();
  for (const item of flashItems) {
    const ref = item.campaignRef!;
    const qty = Math.max(1, Math.trunc(Number(item.quantity) || 1));
    qtyByCampaign.set(ref, (qtyByCampaign.get(ref) ?? 0) + qty);
  }

  // Load active flash deals config from SiteConfig
  const siteConfig = await tx.siteConfig.findUnique({
    where: { key: 'flashDeals' },
  });
  const flashDealsConfig = normalizeFlashDealsConfig(siteConfig?.value);
  const dealsByRef = new Map(
    flashDealsConfig.items.map((deal) => [deal.campaignRef, deal]),
  );

  for (const [campaignRef, reqQty] of qtyByCampaign.entries()) {
    const deal = dealsByRef.get(campaignRef);
    const limitType = deal?.limitType ?? 'LEGACY_UNCONFIGURED';
    const isLimited = limitType === 'LIMITED' || limitType === 'LEGACY_UNCONFIGURED';
    const maxLimit = limitType === 'LIMITED'
      ? (deal?.maxUnitsPerCustomer ?? 1)
      : (limitType === 'LEGACY_UNCONFIGURED' ? 1 : null);

    // 1. Ensure counter row exists with zero counts (idempotent upsert)
    await tx.campaignCustomerUsage.upsert({
      where: {
        campaignRef_phone: {
          campaignRef,
          phone: normalizedPhone,
        },
      },
      create: {
        campaignRef,
        phone: normalizedPhone,
        userId: params.userId,
        confirmedQty: 0,
        reservedQty: 0,
      },
      update: {},
    });

    // 2. Perform atomic conditional update with row-level lock (Spec Section 6.2)
    if (isLimited && maxLimit !== null) {
      let affected = 0;
      if (params.isOnlinePayment) {
        affected = await tx.$executeRaw`
          UPDATE "CampaignCustomerUsage"
          SET "reservedQty" = "reservedQty" + ${reqQty},
              "updatedAt" = NOW()
          WHERE "campaignRef" = ${campaignRef}
            AND "phone" = ${normalizedPhone}
            AND ("confirmedQty" + "reservedQty" + ${reqQty} <= ${maxLimit});
        `;
      } else {
        affected = await tx.$executeRaw`
          UPDATE "CampaignCustomerUsage"
          SET "confirmedQty" = "confirmedQty" + ${reqQty},
              "updatedAt" = NOW()
          WHERE "campaignRef" = ${campaignRef}
            AND "phone" = ${normalizedPhone}
            AND ("confirmedQty" + "reservedQty" + ${reqQty} <= ${maxLimit});
        `;
      }

      if (affected === 0) {
        // Quota exceeded or race condition lost
        const currentUsage = await tx.campaignCustomerUsage.findUnique({
          where: {
            campaignRef_phone: {
              campaignRef,
              phone: normalizedPhone,
            },
          },
        });
        const currentTotal =
          (currentUsage?.confirmedQty ?? 0) + (currentUsage?.reservedQty ?? 0);
        const remaining = Math.max(0, maxLimit - currentTotal);

        throw new OrderValidationError(
          `আপনি এই অফারের সর্বোচ্চ ${maxLimit} পিস কিনতে পারবেন। আপনার ইতিমধ্যে ${currentTotal} পিস নেওয়া আছে। বাকি কোটা: ${remaining} পিস।`,
          'CAMPAIGN_LIMIT_EXCEEDED',
          409,
        );
      }
    } else {
      // UNLIMITED campaign: still track usage for accurate future transitions (Spec Section 6.3)
      if (params.isOnlinePayment) {
        await tx.$executeRaw`
          UPDATE "CampaignCustomerUsage"
          SET "reservedQty" = "reservedQty" + ${reqQty},
              "updatedAt" = NOW()
          WHERE "campaignRef" = ${campaignRef}
            AND "phone" = ${normalizedPhone};
        `;
      } else {
        await tx.$executeRaw`
          UPDATE "CampaignCustomerUsage"
          SET "confirmedQty" = "confirmedQty" + ${reqQty},
              "updatedAt" = NOW()
          WHERE "campaignRef" = ${campaignRef}
            AND "phone" = ${normalizedPhone};
        `;
      }
    }

    // 3. Write immutable audit ledger record
    await tx.campaignRedemptionLedger.create({
      data: {
        campaignRef,
        phone: normalizedPhone,
        userId: params.userId,
        orderId: params.orderId,
        quantity: reqQty,
        status: params.isOnlinePayment ? 'RESERVED' : 'CONFIRMED',
        reservedUntil: params.isOnlinePayment ? (params.reservedUntil ?? null) : null,
        confirmedAt: params.isOnlinePayment ? null : new Date(),
      },
    });
  }

  return { reservedCount: qtyByCampaign.size };
}

/**
 * Finalize reserved campaign usage when an online payment completes successfully.
 * Decrements reservedQty and increments confirmedQty in CampaignCustomerUsage,
 * and sets CampaignRedemptionLedger status to CONFIRMED.
 */
export async function finalizeCampaignUsageInTransaction(
  tx: PrismaTransaction,
  orderId: string,
) {
  const ledgerEntries = await tx.campaignRedemptionLedger.findMany({
    where: {
      orderId,
      status: 'RESERVED',
    },
  });

  if (ledgerEntries.length === 0) {
    return { finalizedCount: 0 };
  }

  for (const entry of ledgerEntries) {
    await tx.campaignRedemptionLedger.update({
      where: { id: entry.id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });

    await tx.$executeRaw`
      UPDATE "CampaignCustomerUsage"
      SET "reservedQty" = GREATEST(0, "reservedQty" - ${entry.quantity}),
          "confirmedQty" = "confirmedQty" + ${entry.quantity},
          "updatedAt" = NOW()
      WHERE "campaignRef" = ${entry.campaignRef}
        AND "phone" = ${entry.phone};
    `;
  }

  return { finalizedCount: ledgerEntries.length };
}

/**
 * Release reserved campaign usage when an online payment order expires or fails.
 * Decrements reservedQty and sets CampaignRedemptionLedger status to RELEASED.
 */
export async function releaseCampaignUsageInTransaction(
  tx: PrismaTransaction,
  orderId: string,
) {
  const ledgerEntries = await tx.campaignRedemptionLedger.findMany({
    where: {
      orderId,
      status: 'RESERVED',
    },
  });

  if (ledgerEntries.length === 0) {
    return { releasedCount: 0 };
  }

  for (const entry of ledgerEntries) {
    await tx.campaignRedemptionLedger.update({
      where: { id: entry.id },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
      },
    });

    await tx.$executeRaw`
      UPDATE "CampaignCustomerUsage"
      SET "reservedQty" = GREATEST(0, "reservedQty" - ${entry.quantity}),
          "updatedAt" = NOW()
      WHERE "campaignRef" = ${entry.campaignRef}
        AND "phone" = ${entry.phone};
    `;
  }

  return { releasedCount: ledgerEntries.length };
}

/**
 * Release confirmed campaign usage when an order is cancelled or goods are returned to warehouse.
 * Decrements confirmedQty and sets CampaignRedemptionLedger status to RELEASED.
 */
export async function releaseConfirmedCampaignUsageInTransaction(
  tx: PrismaTransaction,
  orderId: string,
) {
  const ledgerEntries = await tx.campaignRedemptionLedger.findMany({
    where: {
      orderId,
      status: 'CONFIRMED',
    },
  });

  if (ledgerEntries.length === 0) {
    return { releasedCount: 0 };
  }

  for (const entry of ledgerEntries) {
    await tx.campaignRedemptionLedger.update({
      where: { id: entry.id },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
      },
    });

    await tx.$executeRaw`
      UPDATE "CampaignCustomerUsage"
      SET "confirmedQty" = GREATEST(0, "confirmedQty" - ${entry.quantity}),
          "updatedAt" = NOW()
      WHERE "campaignRef" = ${entry.campaignRef}
        AND "phone" = ${entry.phone};
    `;
  }

  return { releasedCount: ledgerEntries.length };
}

/**
 * Check remaining promotional quota for a verified customer phone and campaign.
 */
export async function getCustomerCampaignQuota(
  phone: string,
  campaignRef: string,
) {
  const normalizedPhone = normalizeBangladeshPhoneNumber(phone);
  if (!normalizedPhone) {
    return { allowed: false, remainingQuota: 0, reason: 'INVALID_PHONE' };
  }

  const siteConfig = await prisma.siteConfig.findUnique({
    where: { key: 'flashDeals' },
  });
  const flashDealsConfig = normalizeFlashDealsConfig(siteConfig?.value);
  const deal = flashDealsConfig.items.find((d) => d.campaignRef === campaignRef);

  const limitType = deal?.limitType ?? 'LEGACY_UNCONFIGURED';
  if (limitType === 'UNLIMITED') {
    return {
      allowed: true,
      remainingQuota: Infinity,
      limitType: 'UNLIMITED' as const,
      maxUnits: null,
    };
  }

  const maxLimit = limitType === 'LIMITED' ? (deal?.maxUnitsPerCustomer ?? 1) : 1;

  const usage = await prisma.campaignCustomerUsage.findUnique({
    where: {
      campaignRef_phone: {
        campaignRef,
        phone: normalizedPhone,
      },
    },
  });

  const consumed = (usage?.confirmedQty ?? 0) + (usage?.reservedQty ?? 0);
  const remaining = Math.max(0, maxLimit - consumed);

  return {
    allowed: remaining > 0,
    remainingQuota: remaining,
    consumedQuota: consumed,
    limitType,
    maxUnits: maxLimit,
  };
}
