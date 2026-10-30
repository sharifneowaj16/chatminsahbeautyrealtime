import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DELIVERY_CONFIG, PROMO_CATALOG, DEFAULT_BUNDLE_CONFIG } from '@/lib/commerce/offer-engine';
import { UNIVERSAL_OFFER_CONFIG_KEY } from '@/app/api/admin/offer-engine/route';
import { getDeliveryMessageConfig } from '@/lib/delivery-message/config';

export const dynamic = 'force-dynamic';

// GET /api/offer-engine - Public runtime configuration for Storefront
export async function GET() {
  try {
    const record = await prisma.siteConfig.findUnique({
      where: { key: UNIVERSAL_OFFER_CONFIG_KEY },
    });

    const defaultCoupons = Object.values(PROMO_CATALOG);
    const defaultDelivery = {
      nationwideThreshold: DELIVERY_CONFIG.NATIONWIDE_THRESHOLD,
      dhakaThreshold: DELIVERY_CONFIG.DHAKA_METRO_THRESHOLD,
      outsideDhakaSubsidizedThreshold: DELIVERY_CONFIG.OUTSIDE_DHAKA_SUBSIDIZED_THRESHOLD,
      outsideDhakaSubsidizedFee: DELIVERY_CONFIG.OUTSIDE_DHAKA_SUBSIDIZED_FEE,
    };

    let topBarConfig = null;
    try {
      topBarConfig = await getDeliveryMessageConfig();
    } catch {
      // Non-fatal
    }

    if (record?.value && typeof record.value === 'object') {
      const config = record.value as any;
      return NextResponse.json({
        success: true,
        freeDelivery: {
          ...defaultDelivery,
          ...(config.freeDelivery || {}),
        },
        coupons: Array.isArray(config.coupons)
          ? config.coupons.filter((c: any) => c && c.isActive !== false)
          : defaultCoupons,
        bundles: {
          ...DEFAULT_BUNDLE_CONFIG,
          ...(config.bundles || {}),
        },
        antiConflict: config.antiConflict || {
          strictAntiStacking: true,
          maxCartDiscountCap: 0,
        },
        topBar: topBarConfig,
      });
    }

    // Default fallback
    return NextResponse.json({
      success: true,
      freeDelivery: defaultDelivery,
      coupons: defaultCoupons,
      bundles: DEFAULT_BUNDLE_CONFIG,
      antiConflict: {
        strictAntiStacking: true,
        maxCartDiscountCap: 0,
      },
      topBar: topBarConfig,
    });
  } catch (error) {
    console.error('Error fetching public offer engine rules:', error);
    return NextResponse.json({
      success: true,
      freeDelivery: {
        nationwideThreshold: DELIVERY_CONFIG.NATIONWIDE_THRESHOLD,
        dhakaThreshold: DELIVERY_CONFIG.DHAKA_METRO_THRESHOLD,
        outsideDhakaSubsidizedThreshold: DELIVERY_CONFIG.OUTSIDE_DHAKA_SUBSIDIZED_THRESHOLD,
        outsideDhakaSubsidizedFee: DELIVERY_CONFIG.OUTSIDE_DHAKA_SUBSIDIZED_FEE,
      },
      coupons: Object.values(PROMO_CATALOG),
      bundles: DEFAULT_BUNDLE_CONFIG,
      antiConflict: {
        strictAntiStacking: true,
      },
    });
  }
}
