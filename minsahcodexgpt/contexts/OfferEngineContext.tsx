'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type {
  PromoRule,
  BundleConfig,
  UniversalOfferConfig,
  OfferPlacement,
  CartOfferCalculationParams,
  CartOfferCalculationResult,
} from '@/lib/commerce/offer-engine/types';
import {
  DELIVERY_CONFIG,
  DEFAULT_BUNDLE_CONFIG,
} from '@/lib/commerce/offer-engine/config';
import { calculateCartOffers } from '@/lib/commerce/offer-engine/calculator';

interface OfferEngineContextValue {
  config: UniversalOfferConfig | null;
  isLoading: boolean;
  couponsEnabled: boolean;
  coupons: PromoRule[];
  bundles: BundleConfig;
  freeDelivery: UniversalOfferConfig['freeDelivery'];
  refreshOffers: () => Promise<void>;
  getOffersForPlacement: (placement: OfferPlacement) => PromoRule[];
  findCoupon: (code: string) => PromoRule | null;
  calculateOffers: (
    params: Omit<CartOfferCalculationParams, 'availableCoupons' | 'freeDeliveryConfig'>
  ) => CartOfferCalculationResult;
}

const initialContextValue: OfferEngineContextValue = {
  config: null,
  isLoading: false,
  couponsEnabled: true,
  coupons: [],
  bundles: DEFAULT_BUNDLE_CONFIG,
  freeDelivery: {
    nationwideThreshold: DELIVERY_CONFIG.NATIONWIDE_THRESHOLD,
    dhakaThreshold: DELIVERY_CONFIG.DHAKA_METRO_THRESHOLD,
    outsideDhakaSubsidizedThreshold: DELIVERY_CONFIG.OUTSIDE_DHAKA_SUBSIDIZED_THRESHOLD,
    outsideDhakaSubsidizedFee: DELIVERY_CONFIG.OUTSIDE_DHAKA_SUBSIDIZED_FEE,
  },
  refreshOffers: async () => {},
  getOffersForPlacement: () => [],
  findCoupon: () => null,
  calculateOffers: (params) =>
    calculateCartOffers({
      ...params,
      couponsEnabled: true,
      availableCoupons: [],
      freeDeliveryConfig: {
        nationwideThreshold: DELIVERY_CONFIG.NATIONWIDE_THRESHOLD,
        dhakaThreshold: DELIVERY_CONFIG.DHAKA_METRO_THRESHOLD,
      },
    }),
};

const OfferEngineContext = createContext<OfferEngineContextValue>(initialContextValue);

export function OfferEngineProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<UniversalOfferConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchOffers = useCallback(async () => {
    try {
      const res = await fetch('/api/offer-engine', {
        headers: { credentials: 'omit' },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to fetch offer engine configuration');
      const data = await res.json();
      if (data && data.success) {
        setConfig({
          couponsEnabled: data.couponsEnabled !== false,
          freeDelivery: data.freeDelivery || {
            nationwideThreshold: DELIVERY_CONFIG.NATIONWIDE_THRESHOLD,
            dhakaThreshold: DELIVERY_CONFIG.DHAKA_METRO_THRESHOLD,
            outsideDhakaSubsidizedThreshold: DELIVERY_CONFIG.OUTSIDE_DHAKA_SUBSIDIZED_THRESHOLD,
            outsideDhakaSubsidizedFee: DELIVERY_CONFIG.OUTSIDE_DHAKA_SUBSIDIZED_FEE,
          },
          coupons: Array.isArray(data.coupons) ? data.coupons : [],
          bundles: data.bundles || DEFAULT_BUNDLE_CONFIG,
          antiConflict: data.antiConflict || { strictAntiStacking: true },
          topBar: data.topBar,
        });
      }
    } catch {
      // Non-fatal, fallback to default config
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOffers();
  }, [fetchOffers]);

  const couponsEnabled = config?.couponsEnabled !== false;

  const coupons = useMemo(() => {
    if (config?.couponsEnabled === false) return [];
    if (config?.coupons && Array.isArray(config.coupons)) {
      return config.coupons.filter((c) => c && c.isActive !== false);
    }
    return [];
  }, [config?.coupons, config?.couponsEnabled]);

  const bundles = useMemo(() => {
    return config?.bundles || DEFAULT_BUNDLE_CONFIG;
  }, [config?.bundles]);

  const freeDelivery = useMemo(() => {
    return (
      config?.freeDelivery || {
        nationwideThreshold: DELIVERY_CONFIG.NATIONWIDE_THRESHOLD,
        dhakaThreshold: DELIVERY_CONFIG.DHAKA_METRO_THRESHOLD,
        outsideDhakaSubsidizedThreshold: DELIVERY_CONFIG.OUTSIDE_DHAKA_SUBSIDIZED_THRESHOLD,
        outsideDhakaSubsidizedFee: DELIVERY_CONFIG.OUTSIDE_DHAKA_SUBSIDIZED_FEE,
      }
    );
  }, [config?.freeDelivery]);

  const getOffersForPlacement = useCallback(
    (placement: OfferPlacement): PromoRule[] => {
      return coupons.filter((coupon) => {
        if (!coupon.placements || coupon.placements.length === 0) {
          // If no explicit placements are defined, default to cart_drawer and checkout_page
          return placement === 'cart_drawer' || placement === 'checkout_page';
        }
        return coupon.placements.includes(placement);
      });
    },
    [coupons]
  );

  const findCoupon = useCallback(
    (code: string): PromoRule | null => {
      if (!code || !code.trim()) return null;
      const normalized = code.trim().toUpperCase();
      return coupons.find((c) => c.code.trim().toUpperCase() === normalized) || null;
    },
    [coupons]
  );

  const calculateOffers = useCallback(
    (
      params: Omit<CartOfferCalculationParams, 'availableCoupons' | 'freeDeliveryConfig'>
    ): CartOfferCalculationResult => {
      return calculateCartOffers({
        ...params,
        couponsEnabled,
        availableCoupons: coupons,
        freeDeliveryConfig: {
          nationwideThreshold: freeDelivery.nationwideThreshold,
          dhakaThreshold: freeDelivery.dhakaThreshold,
        },
      });
    },
    [coupons, couponsEnabled, freeDelivery]
  );

  const value = useMemo<OfferEngineContextValue>(
    () => ({
      config,
      isLoading,
      couponsEnabled,
      coupons,
      bundles,
      freeDelivery,
      refreshOffers: fetchOffers,
      getOffersForPlacement,
      findCoupon,
      calculateOffers,
    }),
    [
      config,
      isLoading,
      couponsEnabled,
      coupons,
      bundles,
      freeDelivery,
      fetchOffers,
      getOffersForPlacement,
      findCoupon,
      calculateOffers,
    ]
  );

  return (
    <OfferEngineContext.Provider value={value}>
      {children}
    </OfferEngineContext.Provider>
  );
}

export function useOfferEngine(): OfferEngineContextValue {
  const context = useContext(OfferEngineContext);
  if (!context) {
    throw new Error('useOfferEngine must be used within an OfferEngineProvider');
  }
  return context;
}
