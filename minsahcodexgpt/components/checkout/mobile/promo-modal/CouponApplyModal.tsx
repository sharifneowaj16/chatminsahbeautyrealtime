'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  Tag,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { PromoInputBar } from './PromoInputBar';
import { ActiveAppliedCouponBanner } from './ActiveAppliedCouponBanner';
import { CouponTicketCard } from './CouponTicketCard';
import { CouponSavingsSummaryFooter } from './CouponSavingsSummaryFooter';
import { PromoTermsModal } from './PromoTermsModal';
import { CouponItem, AppliedCoupon, CouponApplyModalProps } from './types';
import { useOfferEngine } from '@/contexts/OfferEngineContext';

export function CouponApplyModal({
  isOpen,
  onClose,
  subtotal = 4420,
  appliedCoupon: externalAppliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  onContinue,
}: CouponApplyModalProps) {
  const [mounted, setMounted] = useState(false);
  const [internalApplied, setInternalApplied] = useState<AppliedCoupon | null>(null);
  const [activeTermsCoupon, setActiveTermsCoupon] = useState<CouponItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { config } = useOfferEngine();

  const activeCoupons: CouponItem[] = useMemo(() => {
    if (config?.couponsEnabled === false) return [];
    if (Array.isArray(config?.coupons) && config.coupons.length > 0) {
      return config.coupons
        .filter((c) => c && c.isActive !== false)
        .map((c) => ({
          id: c.code.toLowerCase(),
          code: c.code,
          title: c.bannerText || `${c.value}${c.type === 'percentage' ? '%' : '৳'} OFF`,
          description:
            c.description ||
            (c.type === 'percentage'
              ? `${c.value}% discount on eligible items`
              : `Flat ৳${c.value} discount on eligible items`),
          discountType: (c.type === 'flat' ? 'flat' : 'percentage') as CouponItem['discountType'],
          discountValue: c.value,
          badgeText: c.badgeText || (c.type === 'percentage' ? `${c.value}% OFF` : `৳${c.value} OFF`),
          badgeVariant: 'primary' as const,
          expiryText: 'Active',
          minSpend: c.minSubtotal || 0,
          terms: [
            c.minSubtotal ? `Minimum order spend ৳${c.minSubtotal}.` : 'No minimum order required.',
            c.maxDiscount ? `Maximum savings capped at ৳${c.maxDiscount}.` : 'Full voucher savings apply.',
            c.allowOnBundles ? 'Valid on all catalog items including bundles.' : 'Valid on non-bundle products only.',
          ],
        }));
    }
    return [];
  }, [config?.coupons, config?.couponsEnabled]);

  const applied = externalAppliedCoupon !== undefined ? externalAppliedCoupon : internalApplied;

  if (!mounted || !isOpen) return null;

  const handleApplyCoupon = (coupon: CouponItem) => {
    let savings = 0;
    if (coupon.discountType === 'flat' || coupon.discountType === 'welcome') {
      savings = coupon.discountValue;
    } else if (coupon.discountType === 'percentage') {
      savings = Math.round((subtotal * coupon.discountValue) / 100);
    } else if (coupon.discountType === 'shipping') {
      savings = 120;
    }

    const appliedData: AppliedCoupon = {
      code: coupon.code,
      discountText: coupon.title,
      savingsAmount: savings,
      campaignTitle: `${coupon.badgeText} applied`,
    };

    setInternalApplied(appliedData);
    setErrorMessage(null);
    if (onApplyCoupon) {
      onApplyCoupon(coupon);
    }
  };

  const handleManualCode = (code: string) => {
    const found = activeCoupons.find((c) => c.code.toUpperCase() === code.toUpperCase());
    if (found) {
      handleApplyCoupon(found);
      return;
    }

    setErrorMessage(`Sorry, voucher code '${code}' is invalid or expired.`);
  };

  const handleRemove = () => {
    setInternalApplied(null);
    if (onRemoveCoupon) {
      onRemoveCoupon();
    }
  };

  const totalSavings = applied ? applied.savingsAmount : 0;
  const payable = Math.max(0, subtotal - totalSavings);

  return (
    <div className="fixed inset-0 z-[180] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-[4px] p-0 sm:p-4 transition-opacity animate-in fade-in">
      <section
        aria-labelledby="coupon-modal-title"
        className="relative z-20 w-full max-w-full sm:max-w-[520px] max-h-[88dvh] sm:max-h-[85dvh] bg-[#faf9f6] rounded-t-[24px] sm:rounded-[24px] border border-[#E2DED8]/60 shadow-2xl flex flex-col overflow-hidden overflow-x-hidden no-scrollbar animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
      >
        {/* Top Drag Handle (Mobile only) */}
        <div className="pt-3 pb-1 px-4 flex flex-col items-center relative">
          <div className="w-12 h-1.5 rounded-full bg-[#B5C4BB]/70 mb-2 sm:hidden" />

          {/* Modal Header */}
          <div className="w-full flex items-start justify-between mt-1">
            <div className="flex flex-col">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF7D8] text-[#1c3a13] w-fit mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#4b6723]" />
                <span className="text-[10px] tracking-wider font-bold uppercase">
                  Minsah Vouchers
                </span>
              </div>
              <h2
                id="coupon-modal-title"
                className="text-[18px] sm:text-[20px] text-[#062402] font-bold tracking-tight"
              >
                Coupons &amp; Promo Codes
              </h2>
              <p className="text-xs text-[#5A615D] font-medium mt-0.5">
                Enjoy exclusive discounts on authentic Korean skincare nationwide
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="w-9 h-9 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#5A615D] hover:text-[#062402] active:scale-95 transition-all shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Toast if invalid code */}
        {errorMessage && (
          <div className="px-4 pt-2 pb-1">
            <div className="flex items-center justify-between p-2.5 px-3.5 rounded-2xl bg-[#ffdad6] text-[#93000a] border border-[#ba1a1a]/20 text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#ba1a1a]" />
                <span className="font-medium">{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-[#ba1a1a] font-bold text-[11px] underline ml-2 shrink-0"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2 flex flex-col gap-3.5 overscroll-contain">
          {/* Promo Input Bar */}
          <PromoInputBar onApply={handleManualCode} />

          {/* Active Applied Coupon Banner */}
          {applied && (
            <ActiveAppliedCouponBanner
              coupon={applied}
              onRemove={handleRemove}
            />
          )}

          {/* Section Divider */}
          <div className="flex items-center justify-between px-1 pt-1">
            <h3 className="text-[16px] text-[#062402] font-bold flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-[#4b6723]" />
              Available Coupons &amp; Offers
            </h3>
            <span className="text-[11px] font-semibold text-[#4b6723]">
              {activeCoupons.length} Active Offers
            </span>
          </div>

          {/* Available Coupons List */}
          <div className="flex flex-col gap-3">
            {activeCoupons.map((coupon) => (
              <CouponTicketCard
                key={coupon.id}
                coupon={coupon}
                isApplied={applied?.code === coupon.code}
                onApply={handleApplyCoupon}
                onShowTerms={setActiveTermsCoupon}
              />
            ))}
          </div>

          {/* Trust strip */}
          <div className="mt-1 p-3.5 rounded-2xl bg-[#F8FAF7] border border-[#E2DED8]/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#EAF7D8] text-[#4b6723] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <p className="text-[11px] text-[#5A615D] leading-relaxed">
              Every product imported by Minsah Beauty is directly sourced from South Korea, 100% authentic and BSTI approved.
            </p>
          </div>
        </div>

        {/* Savings & Action Footer */}
        <CouponSavingsSummaryFooter
          savingsAmount={totalSavings}
          payableAmount={payable}
          hasAppliedCoupon={Boolean(applied)}
          onContinue={() => {
            if (onContinue) onContinue();
            onClose();
          }}
        />

        {/* Nested Terms Modal */}
        <PromoTermsModal
          coupon={activeTermsCoupon}
          onClose={() => setActiveTermsCoupon(null)}
        />
      </section>
    </div>
  );
}
