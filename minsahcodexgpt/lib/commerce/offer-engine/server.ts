import prisma from '@/lib/prisma';
import { DELIVERY_CONFIG } from './config';
import { UNIVERSAL_OFFER_CONFIG_KEY } from '@/app/api/admin/offer-engine/route';

export interface FreeDeliveryThresholdConfig {
  nationwideThreshold: number;
  dhakaThreshold: number;
  outsideDhakaSubsidizedThreshold?: number;
  outsideDhakaSubsidizedFee?: number;
}

/**
 * Server-side helper to fetch the current free delivery threshold configuration
 * from SiteConfig (key: universalOfferEngineConfig), falling back to DELIVERY_CONFIG.
 */
export async function getFreeDeliveryThresholdConfig(): Promise<FreeDeliveryThresholdConfig> {
  try {
    const record = await prisma.siteConfig.findUnique({
      where: { key: UNIVERSAL_OFFER_CONFIG_KEY },
    });

    if (record?.value && typeof record.value === 'object') {
      const config = record.value as any;
      if (config.freeDelivery) {
        return {
          nationwideThreshold: Number(config.freeDelivery.nationwideThreshold) || DELIVERY_CONFIG.NATIONWIDE_THRESHOLD,
          dhakaThreshold: Number(config.freeDelivery.dhakaThreshold) || DELIVERY_CONFIG.DHAKA_METRO_THRESHOLD,
          outsideDhakaSubsidizedThreshold: config.freeDelivery.outsideDhakaSubsidizedThreshold != null
            ? Number(config.freeDelivery.outsideDhakaSubsidizedThreshold)
            : DELIVERY_CONFIG.OUTSIDE_DHAKA_SUBSIDIZED_THRESHOLD,
          outsideDhakaSubsidizedFee: config.freeDelivery.outsideDhakaSubsidizedFee != null
            ? Number(config.freeDelivery.outsideDhakaSubsidizedFee)
            : DELIVERY_CONFIG.OUTSIDE_DHAKA_SUBSIDIZED_FEE,
        };
      }
    }
  } catch (error) {
    console.error('[getFreeDeliveryThresholdConfig] Failed to fetch config, using fallback:', error);
  }

  return {
    nationwideThreshold: DELIVERY_CONFIG.NATIONWIDE_THRESHOLD,
    dhakaThreshold: DELIVERY_CONFIG.DHAKA_METRO_THRESHOLD,
    outsideDhakaSubsidizedThreshold: DELIVERY_CONFIG.OUTSIDE_DHAKA_SUBSIDIZED_THRESHOLD,
    outsideDhakaSubsidizedFee: DELIVERY_CONFIG.OUTSIDE_DHAKA_SUBSIDIZED_FEE,
  };
}
