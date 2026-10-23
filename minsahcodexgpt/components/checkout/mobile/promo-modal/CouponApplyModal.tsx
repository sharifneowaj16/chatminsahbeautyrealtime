'use client';

import { useState } from 'react';
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

const INITIAL_COUPONS: CouponItem[] = [
  {
    id: 'vip15',
    code: 'VIP15',
    title: 'ভিআইপি মেম্বার ১৫% ছাড়',
    description: 'মিনসাহ ভিআইপি মেম্বারদের জন্য সকল অর্ডারে ফ্ল্যাট ১৫% ডিসকাউন্ট।',
    discountType: 'percentage',
    discountValue: 15,
    badgeText: 'VIP বিশেষ ছাড়',
    badgeVariant: 'primary',
    expiryText: 'Active',
    minSpend: 1500,
    terms: [
      'ন্যূনতম অর্ডার মূল্য ৳১,৫০০ হতে হবে।',
      'সকল অরিজিনাল কসমেটিক্স ও স্কিনকেয়ারে কার্যকর।',
      'অন্যান্য ভাউচারের সাথে একত্র করা যাবে না।',
    ],
  },
  {
    id: 'minsah150',
    code: 'MINSAH150',
    title: 'ফ্ল্যাট ১৫০ টাকা ক্যাশ ছাড়',
    description: '৳১,২০০ বা তার বেশি অর্ডারে সরাসরি ১৫০ টাকা ডিসকাউন্ট।',
    discountType: 'flat',
    discountValue: 150,
    badgeText: 'ইনস্ট্যান্ট ক্যাশব্যাক',
    badgeVariant: 'secondary',
    expiryText: 'Active',
    minSpend: 1200,
    terms: [
      'ন্যূনতম অর্ডার মূল্য ৳১,২০০ হতে হবে।',
      'বিকাশ ও ক্যাশ অন ডেলিভারি উভয় ক্ষেত্রে প্রযোজ্য।',
    ],
  },
  {
    id: 'freeship',
    code: 'FREESHIP',
    title: 'ফ্রি এক্সপ্রেস ডেলিভারি',
    description: 'ন্যূনতম ৳১,০০০ অর্ডারে ডেলিভারি চার্জ সম্পূর্ণ ফ্রি (পাঠাও ও স্টেডফাস্ট কুরিয়ার)।',
    discountType: 'shipping',
    discountValue: 120,
    badgeText: 'ফ্রি এক্সপ্রেস ডেলিভারি',
    badgeVariant: 'shipping',
    expiryText: 'Active',
    minSpend: 1000,
    terms: [
      'ন্যূনতম অর্ডার মূল্য ৳১,০০০ হতে হবে।',
      'সারা বাংলাদেশে পাঠাও ও স্টেডফাস্ট ডেলিভারির জন্য প্রযোজ্য।',
      'রেগুলার ডেলিভারি ফি সম্পূর্ণ মওকুফ হবে।',
    ],
  },
  {
    id: 'welcome10',
    code: 'WELCOME10',
    title: 'প্রথম অর্ডারে ১০% ছাড়',
    description: 'নতুন গ্রাহকদের প্রথম কেনাকাটায় ইনস্ট্যান্ট ১০% ছাড়।',
    discountType: 'percentage',
    discountValue: 10,
    badgeText: 'ওয়েলকাম বোনাস',
    badgeVariant: 'tertiary',
    expiryText: 'Active',
    minSpend: 800,
    terms: [
      'নতুন কাস্টমারদের প্রথম অর্ডারে প্রযোজ্য।',
      'সর্বোচ্চ ছাড় ৳৩০০ পর্যন্ত।',
    ],
  },
];

export function CouponApplyModal({
  isOpen,
  onClose,
  subtotal = 4420,
  appliedCoupon: externalAppliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  onContinue,
}: CouponApplyModalProps) {
  const [internalApplied, setInternalApplied] = useState<AppliedCoupon | null>(null);

  const [activeTermsCoupon, setActiveTermsCoupon] = useState<CouponItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const applied = externalAppliedCoupon !== undefined ? externalAppliedCoupon : internalApplied;

  if (!isOpen) return null;

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
      campaignTitle: `${coupon.badgeText} সুবিধা চালু হয়েছে`,
    };

    setInternalApplied(appliedData);
    setErrorMessage(null);
    if (onApplyCoupon) {
      onApplyCoupon(coupon);
    }
  };

  const handleManualCode = (code: string) => {
    const found = INITIAL_COUPONS.find((c) => c.code.toUpperCase() === code.toUpperCase());
    if (found) {
      handleApplyCoupon(found);
      return;
    }

    setErrorMessage(`দুঃখিত, '${code}' ভাউচার কোডটি সঠিক নয় বা এর মেয়াদ উত্তীর্ণ হয়েছে।`);
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#062402]/65 backdrop-blur-[4px] transition-opacity animate-in fade-in">
      <section
        aria-labelledby="coupon-modal-title"
        className="relative z-20 w-full max-w-lg max-h-[90vh] bg-[#faf9f6] rounded-t-[32px] border-t border-[#E2DED8]/60 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-300"
      >
        {/* Top Drag Handle */}
        <div className="pt-3 pb-1 px-4 flex flex-col items-center relative">
          <div className="w-12 h-1.5 rounded-full bg-[#B5C4BB]/70 mb-2" />

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
                className="text-[20px] text-[#062402] font-bold tracking-tight"
              >
                কুপন ও প্রোমো কোড
              </h2>
              <p className="text-xs text-[#5A615D] font-medium mt-0.5">
                ঢাকা সহ সারাদেশে অথেনটিক কোরিয়ান স্কিনকেয়ারে অতিরিক্ত ছাড় পান
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
                বন্ধ
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
              উপলব্ধ কুপন ও অফার সমূহ
            </h3>
            <span className="text-[11px] font-semibold text-[#4b6723]">
              {INITIAL_COUPONS.length}টি সক্রিয় অফার
            </span>
          </div>

          {/* Available Coupons List */}
          <div className="flex flex-col gap-3">
            {INITIAL_COUPONS.map((coupon) => (
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
              মিনসাহ বিউটি কর্তৃক আমদানিকৃত প্রতিটি প্রোডাক্ট দক্ষিণ কোরিয়া থেকে সরাসরি সংগৃহীত এবং শতভাগ খাঁটি ও বিএসটিআই অনুমোদিত।
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
