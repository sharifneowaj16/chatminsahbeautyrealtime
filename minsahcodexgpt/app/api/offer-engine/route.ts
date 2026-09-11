import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DELIVERY_CONFIG, PROMO_CATALOG } from '@/lib/commerce/offer-engine';
import { UNIVERSAL_OFFER_CONFIG_KEY } from '@/app/api/admin/offer-engine/route';

export const dynamic = 'force-dynamic';

// GET /api/offer-engine - Public runtime configuration for Storefront
export async function GET() {
  try {
    const record = await prisma.siteConfig.findUnique({
      where: { key: UNIVERSAL_OFFER_CONFIG_KEY },
    });

    if (record?.value && typeof record.value === 'object') {
      const config = record.value as any;
      return NextResponse.json({
        success: true,
        freeDelivery: config.freeDelivery || {
          nationwideThreshold: DELIVERY_CONFIG.NATIONWIDE_THRESHOLD,
          dhakaThreshold: DELIVERY_CONFIG.DHAKA_METRO_THRESHOLD,
        },
        coupons: Array.isArray(config.coupons)
          ? config.coupons.filter((c: any) => c.isActive !== false)
          : Object.values(PROMO_CATALOG),
        bundles: config.bundles
          ? {
              enabled: config.bundles.enabled ?? true,
              twoStepDiscountPercent: config.bundles.twoStepDiscountPercent ?? 15,
              threeStepDiscountPercent: config.bundles.threeStepDiscountPercent ?? 25,
              fourStepDiscountPercent: config.bundles.fourStepDiscountPercent ?? 30,
              estimatedCostRatio: config.bundles.estimatedCostRatio ?? 60,
            }
          : {
              enabled: true,
              twoStepDiscountPercent: 15,
              threeStepDiscountPercent: 25,
              fourStepDiscountPercent: 30,
              estimatedCostRatio: 60,
            },
        antiConflict: config.antiConflict || {
          strictAntiStacking: true,
        },
      });
    }

    // Default fallback
    return NextResponse.json({
      success: true,
      freeDelivery: {
        nationwideThreshold: DELIVERY_CONFIG.NATIONWIDE_THRESHOLD,
        dhakaThreshold: DELIVERY_CONFIG.DHAKA_METRO_THRESHOLD,
      },
      coupons: Object.values(PROMO_CATALOG),
      bundles: {
        enabled: true,
        twoStepDiscountPercent: 15,
        threeStepDiscountPercent: 25,
        fourStepDiscountPercent: 30,
        estimatedCostRatio: 60,
      },
      antiConflict: {
        strictAntiStacking: true,
      },
    });
  } catch (error) {
    console.error('Error fetching public offer engine rules:', error);
    return NextResponse.json({
      success: true,
      freeDelivery: {
        nationwideThreshold: DELIVERY_CONFIG.NATIONWIDE_THRESHOLD,
        dhakaThreshold: DELIVERY_CONFIG.DHAKA_METRO_THRESHOLD,
      },
      coupons: Object.values(PROMO_CATALOG),
      bundles: {
        enabled: true,
        twoStepDiscountPercent: 15,
        threeStepDiscountPercent: 25,
        fourStepDiscountPercent: 30,
      },
      antiConflict: {
        strictAntiStacking: true,
      },
    });
  }
}
