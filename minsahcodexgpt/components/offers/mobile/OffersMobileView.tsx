'use client';

import { useState } from 'react';
import { OffersMobileHeader } from './OffersMobileHeader';
import { OffersSavingsMetricBanner } from './OffersSavingsMetricBanner';
import { OffersDeliveryProgressCard } from './OffersDeliveryProgressCard';
import { OffersCategoryFilterCarousel } from './OffersCategoryFilterCarousel';
import { OffersHeroFlashBento } from './OffersHeroFlashBento';
import { OffersVoucherCard } from './OffersVoucherCard';
import { OffersCuratedBundleCard } from './OffersCuratedBundleCard';
import { OffersLoyaltyMultiplierCard } from './OffersLoyaltyMultiplierCard';
import { OffersPolicyTrustStrip } from './OffersPolicyTrustStrip';
import { OffersToastFeedback } from './OffersToastFeedback';
import { VoucherCode, CuratedBundle, OfferFilterCategory } from './types';

const INITIAL_VOUCHERS: VoucherCode[] = [
  {
    id: 'v1',
    code: 'FREESHIP',
    title: 'ফ্রি এক্সপ্রেস ডেলিভারি',
    discount: 'Free Delivery',
    description: '৳১,০০০ বা তার বেশি অর্ডারে সারা বাংলাদেশে ফ্রি ডেলিভারি',
    category: 'first-order',
    categoryLabel: 'Free Shipping',
  },
];

const INITIAL_BUNDLES: CuratedBundle[] = [
  {
    id: 'b1',
    title: 'The Dewy Glass Skin Duo',
    routineType: 'Hydration Routine',
    savingsBadge: 'SAVE ৳630 (15% OFF)',
    description: 'Calms inflammation while locking hydration deep into inner skin layers.',
    price: 3420,
    originalPrice: 4050,
    savingsAmount: 630,
    item1: {
      name: 'Heartleaf 77% Toner',
      size: '250ml',
      image: '/images/products/anua-toner.png',
    },
    item2: {
      name: 'Elixir Vital Serum',
      size: '30ml Ampoule',
      image: '/images/products/elixir-serum.png',
    },
  },
  {
    id: 'b2',
    title: 'Night Recovery & Barrier Set',
    routineType: 'Barrier & UV Shield',
    savingsBadge: 'SAVE ৳620 (17% OFF)',
    description: 'Restorative antioxidant lip renewal overnight paired with daily weightless SPF defense.',
    price: 3050,
    originalPrice: 3670,
    savingsAmount: 620,
    item1: {
      name: 'Laneige Lip Mask',
      size: 'Berry 20g',
      image: '/images/products/laneige-lip.png',
    },
    item2: {
      name: 'Arisol Sun Relief',
      size: 'SPF50+ PA++++',
      image: '/images/products/sun-relief.png',
    },
  },
];

export function OffersMobileView() {
  const [activeCategory, setActiveCategory] = useState<OfferFilterCategory>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopyPromo = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    showToast(`Coupon ${code} copied & applied!`);
  };

  const handleAddBundle = (bundle: CuratedBundle) => {
    showToast(`${bundle.title} added to bag with savings!`);
  };

  const showVouchers = activeCategory === 'all' || activeCategory === 'vouchers';
  const showFlash = activeCategory === 'all' || activeCategory === 'flash';
  const showBundles = activeCategory === 'all' || activeCategory === 'bundles';
  const showLoyalty = activeCategory === 'all' || activeCategory === 'vip';

  return (
    <div className="lg:hidden min-h-screen bg-[#faf9f6] text-[#181C1A] flex flex-col pb-24">
      <OffersMobileHeader />
      <OffersToastFeedback message={toastMessage} />

      <main className="flex-1 flex flex-col px-4 pt-3 pb-8 space-y-5">
        <OffersSavingsMetricBanner
          activeCouponsCount={INITIAL_VOUCHERS.length + 1}
          flashDealsCount={1}
          maxSavings="৳850 Max"
        />

        <OffersDeliveryProgressCard
          currentCartTotal={1950}
          freeShippingThreshold={2500}
        />

        <OffersCategoryFilterCarousel
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
        />

        {showFlash && (
          <OffersHeroFlashBento onCopyPromo={handleCopyPromo} />
        )}

        {showVouchers && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-bold text-[#062402] tracking-tight">
                Active Voucher Codes
              </span>
              <span className="text-xs font-bold text-[#4b6723]">
                {INITIAL_VOUCHERS.length} Available
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {INITIAL_VOUCHERS.map((voucher) => (
                <OffersVoucherCard
                  key={voucher.id}
                  voucher={voucher}
                  onCopyPromo={handleCopyPromo}
                />
              ))}
            </div>
          </div>
        )}

        {showBundles && (
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col px-1">
              <span className="text-sm font-bold text-[#062402] tracking-tight">
                Curated Duo Bundles
              </span>
              <p className="text-[11px] text-[#5A615D]">
                Scientifically paired sets with extra 15% synergy markdown.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {INITIAL_BUNDLES.map((bundle) => (
                <OffersCuratedBundleCard
                  key={bundle.id}
                  bundle={bundle}
                  onAddBundle={handleAddBundle}
                />
              ))}
            </div>
          </div>
        )}

        {showLoyalty && (
          <OffersLoyaltyMultiplierCard loyaltyPoints={850} />
        )}

        <OffersPolicyTrustStrip />
      </main>
    </div>
  );
}
