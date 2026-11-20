import prisma from '@/lib/prisma';
import { DELIVERY_CONFIG, DEFAULT_BUNDLE_CONFIG } from './config';
import type { BundleConfig, PromoRule } from './types';
import { UNIVERSAL_OFFER_CONFIG_KEY } from '@/app/api/admin/offer-engine/route';

export interface FreeDeliveryThresholdConfig {
  nationwideThreshold: number;
  dhakaThreshold: number;
  outsideDhakaSubsidizedThreshold?: number;
  outsideDhakaSubsidizedFee?: number;
}

export interface UniversalOfferServerConfig {
  couponsEnabled: boolean;
  freeDelivery: Required<FreeDeliveryThresholdConfig>;
  coupons: PromoRule[];
  bundles: BundleConfig;
  antiConflict: {
    strictAntiStacking: boolean;
    maxCartDiscountCap: number;
  };
}

function positiveOrFallback(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

function nonNegativeOrFallback(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
}

export function getDefaultUniversalOfferServerConfig(): UniversalOfferServerConfig {
  return {
    couponsEnabled: true,
    freeDelivery: {
      nationwideThreshold: DELIVERY_CONFIG.NATIONWIDE_THRESHOLD,
      dhakaThreshold: DELIVERY_CONFIG.DHAKA_METRO_THRESHOLD,
      outsideDhakaSubsidizedThreshold: DELIVERY_CONFIG.OUTSIDE_DHAKA_SUBSIDIZED_THRESHOLD,
      outsideDhakaSubsidizedFee: DELIVERY_CONFIG.OUTSIDE_DHAKA_SUBSIDIZED_FEE,
    },
    coupons: [],
    bundles: { ...DEFAULT_BUNDLE_CONFIG },
    antiConflict: {
      strictAntiStacking: true,
      maxCartDiscountCap: 0,
    },
  };
}

export async function getUniversalOfferEngineServerConfig(): Promise<UniversalOfferServerConfig> {
  const defaults = getDefaultUniversalOfferServerConfig();
  try {
    const record = await prisma.siteConfig.findUnique({
      where: { key: UNIVERSAL_OFFER_CONFIG_KEY },
    });

    if (record?.value && typeof record.value === 'object') {
      const cfg = record.value as Record<string, any>;
      const fd = cfg.freeDelivery && typeof cfg.freeDelivery === 'object' ? cfg.freeDelivery : {};
      const b = cfg.bundles && typeof cfg.bundles === 'object' ? cfg.bundles : {};
      const ac = cfg.antiConflict && typeof cfg.antiConflict === 'object' ? cfg.antiConflict : {};

      return {
        couponsEnabled: cfg.couponsEnabled !== false,
        freeDelivery: {
          nationwideThreshold: positiveOrFallback(fd.nationwideThreshold, defaults.freeDelivery.nationwideThreshold),
          dhakaThreshold: positiveOrFallback(fd.dhakaThreshold, defaults.freeDelivery.dhakaThreshold),
          outsideDhakaSubsidizedThreshold: nonNegativeOrFallback(
            fd.outsideDhakaSubsidizedThreshold,
            defaults.freeDelivery.outsideDhakaSubsidizedThreshold
          ),
          outsideDhakaSubsidizedFee: nonNegativeOrFallback(
            fd.outsideDhakaSubsidizedFee,
            defaults.freeDelivery.outsideDhakaSubsidizedFee
          ),
        },
        coupons: Array.isArray(cfg.coupons) ? cfg.coupons : [],
        bundles: {
          enabled: b.enabled !== false,
          twoStepDiscountPercent: nonNegativeOrFallback(b.twoStepDiscountPercent, defaults.bundles.twoStepDiscountPercent),
          threeStepDiscountPercent: nonNegativeOrFallback(b.threeStepDiscountPercent, defaults.bundles.threeStepDiscountPercent),
          fourStepDiscountPercent: nonNegativeOrFallback(b.fourStepDiscountPercent, defaults.bundles.fourStepDiscountPercent),
          estimatedCostRatio: positiveOrFallback(b.estimatedCostRatio, defaults.bundles.estimatedCostRatio),
          inheritFreeDelivery: b.inheritFreeDelivery !== false,
        },
        antiConflict: {
          strictAntiStacking: ac.strictAntiStacking !== false,
          maxCartDiscountCap: nonNegativeOrFallback(ac.maxCartDiscountCap, 0),
        },
      };
    }
  } catch (error) {
    console.error('[getUniversalOfferEngineServerConfig] Failed to fetch config, using fallback:', error);
  }

  return defaults;
}

export async function getFreeDeliveryThresholdConfig(): Promise<FreeDeliveryThresholdConfig> {
  const cfg = await getUniversalOfferEngineServerConfig();
  return cfg.freeDelivery;
}
