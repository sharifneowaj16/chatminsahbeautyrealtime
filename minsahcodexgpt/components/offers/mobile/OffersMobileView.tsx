'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { OffersMobileHeader } from './OffersMobileHeader';
import { OffersSavingsMetricBanner } from './OffersSavingsMetricBanner';
import { OffersDeliveryProgressCard } from './OffersDeliveryProgressCard';
import { OffersCategoryFilterCarousel } from './OffersCategoryFilterCarousel';
import { OffersVoucherCard } from './OffersVoucherCard';
import { OffersPolicyTrustStrip } from './OffersPolicyTrustStrip';
import { OffersToastFeedback } from './OffersToastFeedback';
import { VoucherCode, OfferFilterCategory } from './types';
import { useOfferEngine } from '@/contexts/OfferEngineContext';
import { useCart } from '@/contexts/CartContext';

export function OffersMobileView() {
  const [activeCategory, setActiveCategory] = useState<OfferFilterCategory>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { couponsEnabled, coupons, freeDelivery, bundles } = useOfferEngine();
  const { subtotal, applyPromoCode } = useCart();

  const liveVouchers: VoucherCode[] = useMemo(() => {
    if (!couponsEnabled) return [];
    return coupons.map((c) => {
      const discountLabel =
        c.badgeText ||
        (c.type === 'percentage' ? `${c.value}% OFF` : `\u09F3${c.value} OFF`);
      return {
        id: c.code.toLowerCase(),
        code: c.code,
        title: c.bannerText || discountLabel,
        discount: discountLabel,
        description:
          c.description ||
          (c.minSubtotal
            ? `Valid on orders from \u09F3${c.minSubtotal.toLocaleString()}`
            : 'Active promotional voucher'),
        category: 'general',
        categoryLabel: c.allowOnBundles ? 'All Items' : 'Regular Items',
      };
    });
  }, [couponsEnabled, coupons]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopyPromo = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    applyPromoCode(code, coupons);
    showToast(`Coupon ${code} copied!`);
  };

  const showVouchers = activeCategory === 'all' || activeCategory === 'vouchers';
  const showBundles = bundles.enabled && (activeCategory === 'all' || activeCategory === 'bundles');

  const maxSavingLabel = useMemo(() => {
    const pctValues = coupons.filter((c) => c.type === 'percentage').map((c) => Number(c.value) || 0);
    const flatValues = coupons.filter((c) => c.type === 'flat').map((c) => Number(c.value) || 0);
    if (flatValues.length > 0) return `\u09F3${Math.max(...flatValues)} OFF`;
    if (pctValues.length > 0) return `Up to ${Math.max(...pctValues)}%`;
    if (bundles.enabled) return `Up to ${bundles.fourStepDiscountPercent}%`;
    return 'Free Ship';
  }, [coupons, bundles]);

  return (
    <div className="lg:hidden min-h-screen bg-[#faf9f6] text-[#181C1A] flex flex-col pb-24">
      <OffersMobileHeader />
      <OffersToastFeedback message={toastMessage} />

      <main className="flex-1 flex flex-col px-4 pt-3 pb-8 space-y-5">
        <OffersSavingsMetricBanner
          activeCouponsCount={liveVouchers.length}
          flashDealsCount={bundles.enabled ? 1 : 0}
          maxSavings={maxSavingLabel}
        />

        <OffersDeliveryProgressCard
          currentCartTotal={subtotal}
          freeShippingThreshold={freeDelivery.nationwideThreshold}
        />

        <OffersCategoryFilterCarousel
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
        />

        {showVouchers && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-bold text-[#062402] tracking-tight">
                Active Voucher Codes
              </span>
              <span className="text-xs font-bold text-[#4b6723]">
                {liveVouchers.length} Available
              </span>
            </div>

            {liveVouchers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#D5CFC6] bg-white p-5 text-center text-xs text-[#5A615D]">
                No promo codes active right now. Orders {'\u2265'} {'\u09F3'}{freeDelivery.nationwideThreshold.toLocaleString()} unlock Free Nationwide Delivery automatically.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {liveVouchers.map((voucher) => (
                  <OffersVoucherCard
                    key={voucher.id}
                    voucher={voucher}
                    onCopyPromo={handleCopyPromo}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {showBundles && (
          <div className="rounded-2xl bg-[#122A16] p-4 text-white space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Routine Bundle Engine
              </span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                Up to {bundles.fourStepDiscountPercent}% OFF
              </span>
            </div>
            <p className="text-xs text-stone-200 leading-relaxed">
              2 items: {bundles.twoStepDiscountPercent}% | 3 items: {bundles.threeStepDiscountPercent}% | 4+ items: {bundles.fourStepDiscountPercent}% automatic bundle savings on eligible products.
            </p>
            <Link
              href="/shop"
              className="inline-flex w-full items-center justify-center rounded-xl bg-white py-2.5 text-xs font-bold text-[#122A16]"
            >
              Explore Products &amp; Build Bundle
            </Link>
          </div>
        )}

        <OffersPolicyTrustStrip />
      </main>
    </div>
  );
}
