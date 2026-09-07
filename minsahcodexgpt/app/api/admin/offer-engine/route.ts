import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { toPrismaInputJson } from '@/lib/prisma-json';
import { DELIVERY_CONFIG, PROMO_CATALOG } from '@/lib/commerce/offer-engine';
import {
  DELIVERY_MESSAGE_CONFIG_KEY,
  getDeliveryMessageConfig,
  normalizeDeliveryMessageConfig,
} from '@/lib/delivery-message/config';
import { DEFAULT_DELIVERY_MESSAGE_CONFIG } from '@/lib/delivery-message/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const UNIVERSAL_OFFER_CONFIG_KEY = 'universalOfferEngineConfig';

export interface AdminOfferPayload {
  freeDelivery: {
    nationwideThreshold: number;
    dhakaThreshold: number;
    outsideDhakaSubsidizedThreshold: number;
    outsideDhakaSubsidizedFee: number;
  };
  coupons: Array<{
    code: string;
    type: 'percentage' | 'flat';
    value: number;
    description: string;
    minSubtotal?: number;
    maxDiscount?: number;
    allowOnBundles: boolean;
    isActive: boolean;
  }>;
  bundles: {
    enabled: boolean;
    twoStepDiscountPercent: number;
    threeStepDiscountPercent: number;
    fourStepDiscountPercent: number;
    estimatedCostRatio: number;
    inheritFreeDelivery: boolean;
  };
  topBar: {
    enabled: boolean;
    message1: {
      text: string;
      backgroundColor: string;
      textColor: string;
      active: boolean;
    };
    message2: {
      text: string;
      backgroundColor: string;
      textColor: string;
      active: boolean;
    };
    message3: {
      text: string;
      backgroundColor: string;
      textColor: string;
      active: boolean;
    };
  };
  antiConflict: {
    strictAntiStacking: boolean;
    maxCartDiscountCap?: number;
  };
}

export function getDefaultAdminOfferConfig(): AdminOfferPayload {
  const initialCoupons = Object.values(PROMO_CATALOG).map((rule) => ({
    code: rule.code,
    type: rule.type,
    value: rule.type === 'percentage' ? Math.round(rule.value * 100) : rule.value,
    description: rule.description,
    minSubtotal: rule.minSubtotal || 0,
    maxDiscount: rule.maxDiscount || 0,
    allowOnBundles: Boolean(rule.allowOnBundles),
    isActive: true,
  }));

  return {
    freeDelivery: {
      nationwideThreshold: DELIVERY_CONFIG.NATIONWIDE_THRESHOLD,
      dhakaThreshold: DELIVERY_CONFIG.DHAKA_METRO_THRESHOLD,
      outsideDhakaSubsidizedThreshold: DELIVERY_CONFIG.OUTSIDE_DHAKA_SUBSIDIZED_THRESHOLD,
      outsideDhakaSubsidizedFee: DELIVERY_CONFIG.OUTSIDE_DHAKA_SUBSIDIZED_FEE,
    },
    coupons: initialCoupons,
    bundles: {
      enabled: true,
      twoStepDiscountPercent: 15,
      threeStepDiscountPercent: 25,
      fourStepDiscountPercent: 30,
      estimatedCostRatio: 60,
      inheritFreeDelivery: true,
    },
    topBar: {
      enabled: DEFAULT_DELIVERY_MESSAGE_CONFIG.enabled ?? true,
      message1: {
        text: DEFAULT_DELIVERY_MESSAGE_CONFIG.message1.text,
        backgroundColor: DEFAULT_DELIVERY_MESSAGE_CONFIG.message1.backgroundColor,
        textColor: DEFAULT_DELIVERY_MESSAGE_CONFIG.message1.textColor,
        active: DEFAULT_DELIVERY_MESSAGE_CONFIG.message1.active,
      },
      message2: {
        text: DEFAULT_DELIVERY_MESSAGE_CONFIG.message2.text,
        backgroundColor: DEFAULT_DELIVERY_MESSAGE_CONFIG.message2.backgroundColor,
        textColor: DEFAULT_DELIVERY_MESSAGE_CONFIG.message2.textColor,
        active: DEFAULT_DELIVERY_MESSAGE_CONFIG.message2.active,
      },
      message3: {
        text: DEFAULT_DELIVERY_MESSAGE_CONFIG.message3.text,
        backgroundColor: DEFAULT_DELIVERY_MESSAGE_CONFIG.message3.backgroundColor,
        textColor: DEFAULT_DELIVERY_MESSAGE_CONFIG.message3.textColor,
        active: DEFAULT_DELIVERY_MESSAGE_CONFIG.message3.active,
      },
    },
    antiConflict: {
      strictAntiStacking: true,
      maxCartDiscountCap: 0,
    },
  };
}

// GET /api/admin/offer-engine
export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(
    request,
    ADMIN_PERMISSIONS.SETTINGS_VIEW
  );
  if (response) return response;

  try {
    const defaults = getDefaultAdminOfferConfig();

    // Fetch Universal Offer Engine config
    const offerRecord = await prisma.siteConfig.findUnique({
      where: { key: UNIVERSAL_OFFER_CONFIG_KEY },
    });

    // Fetch Top Bar Delivery config
    const topBarConfig = await getDeliveryMessageConfig();

    const savedOffer = (offerRecord?.value && typeof offerRecord.value === 'object'
      ? offerRecord.value
      : {}) as Partial<AdminOfferPayload>;

    const merged: AdminOfferPayload = {
      freeDelivery: {
        ...defaults.freeDelivery,
        ...(savedOffer.freeDelivery || {}),
      },
      coupons: Array.isArray(savedOffer.coupons) && savedOffer.coupons.length > 0
        ? savedOffer.coupons
        : defaults.coupons,
      bundles: {
        ...defaults.bundles,
        ...(savedOffer.bundles || {}),
      },
      topBar: {
        enabled: topBarConfig.enabled ?? true,
        message1: {
          text: topBarConfig.message1.text,
          backgroundColor: topBarConfig.message1.backgroundColor,
          textColor: topBarConfig.message1.textColor,
          active: topBarConfig.message1.active,
        },
        message2: {
          text: topBarConfig.message2.text,
          backgroundColor: topBarConfig.message2.backgroundColor,
          textColor: topBarConfig.message2.textColor,
          active: topBarConfig.message2.active,
        },
        message3: {
          text: topBarConfig.message3.text,
          backgroundColor: topBarConfig.message3.backgroundColor,
          textColor: topBarConfig.message3.textColor,
          active: topBarConfig.message3.active,
        },
      },
      antiConflict: {
        ...defaults.antiConflict,
        ...(savedOffer.antiConflict || {}),
      },
    };

    return NextResponse.json({ success: true, data: merged });
  } catch (error) {
    console.error('Error fetching Universal Offer Engine config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch offer engine configuration' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/offer-engine
export async function PUT(request: NextRequest) {
  const { response } = await requireAdminPermission(
    request,
    ADMIN_PERMISSIONS.SETTINGS_EDIT
  );
  if (response) return response;

  try {
    const payload = (await request.json().catch(() => null)) as AdminOfferPayload | null;
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        { error: 'Valid offer configuration payload is required.' },
        { status: 400 }
      );
    }

    // 1. Save Universal Offer Config
    const offerData = {
      freeDelivery: payload.freeDelivery,
      coupons: payload.coupons,
      bundles: payload.bundles,
      antiConflict: payload.antiConflict,
    };

    await prisma.siteConfig.upsert({
      where: { key: UNIVERSAL_OFFER_CONFIG_KEY },
      create: {
        key: UNIVERSAL_OFFER_CONFIG_KEY,
        value: toPrismaInputJson(offerData),
      },
      update: {
        value: toPrismaInputJson(offerData),
      },
    });

    // 2. Synchronize Top Bar Delivery Config
    if (payload.topBar) {
      const topBarPayload = {
        enabled: payload.topBar.enabled,
        message1: payload.topBar.message1,
        message2: payload.topBar.message2,
        message3: payload.topBar.message3,
      };

      await prisma.siteConfig.upsert({
        where: { key: DELIVERY_MESSAGE_CONFIG_KEY },
        create: {
          key: DELIVERY_MESSAGE_CONFIG_KEY,
          value: toPrismaInputJson(topBarPayload),
        },
        update: {
          value: toPrismaInputJson(topBarPayload),
        },
      });
    }

    // 3. Revalidate affected paths
    try {
      revalidatePath('/');
      revalidatePath('/shop');
      revalidatePath('/checkout');
    } catch {
      // Revalidation failure shouldn't block response
    }

    return NextResponse.json({
      success: true,
      message: 'Universal Offer Engine configuration updated successfully.',
    });
  } catch (error) {
    console.error('Error saving Universal Offer Engine config:', error);
    return NextResponse.json(
      { error: 'Failed to save offer engine configuration.' },
      { status: 500 }
    );
  }
}
