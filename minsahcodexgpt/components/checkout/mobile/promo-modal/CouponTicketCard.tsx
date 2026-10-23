'use client';

import { Clock, Tag, Truck, Gift, Check, Info } from 'lucide-react';
import { CouponItem } from './types';

interface CouponTicketCardProps {
  coupon: CouponItem;
  isApplied: boolean;
  onApply: (coupon: CouponItem) => void;
  onShowTerms: (coupon: CouponItem) => void;
}

export function CouponTicketCard({
  coupon,
  isApplied,
  onApply,
  onShowTerms,
}: CouponTicketCardProps) {
  const getBadgeStyle = () => {
    switch (coupon.badgeVariant) {
      case 'primary':
        return 'bg-[#E8F0E5] text-[#1c3a13]';
      case 'tertiary':
        return 'bg-[#ffd8e8] text-[#683750]';
      case 'shipping':
        return 'bg-[#c7edb5] text-[#2f4e25]';
      default:
        return 'bg-[#EAF7D8] text-[#1c3a13]';
    }
  };

  const getIcon = () => {
    switch (coupon.discountType) {
      case 'shipping':
        return <Truck className="w-3.5 h-3.5 text-[#5A615D]" />;
      case 'welcome':
        return <Gift className="w-3.5 h-3.5 text-[#5A615D]" />;
      default:
        return <Tag className="w-3.5 h-3.5 text-[#5A615D]" />;
    }
  };

  return (
    <div
      className={`relative p-4 rounded-[26px] bg-white border transition-all shadow-sm flex flex-col gap-3 group ${
        isApplied
          ? 'border-[#4b6723] ring-1 ring-[#4b6723]/30 bg-[#F8FAF7]'
          : 'border-[#E2DED8] hover:border-[#4b6723]'
      }`}
    >
      {/* Side Notch cutouts */}
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#faf9f6] border-r border-[#E2DED8] pointer-events-none" />
      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#faf9f6] border-l border-[#E2DED8] pointer-events-none" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getBadgeStyle()}`}
            >
              {coupon.badgeText}
            </span>
            {coupon.expiryText && (
              <span
                className={`text-[11px] font-medium flex items-center gap-0.5 ${
                  coupon.isUrgent ? 'text-[#ba1a1a]' : 'text-[#5A615D]'
                }`}
              >
                {coupon.isUrgent && <Clock className="w-3 h-3 text-[#ba1a1a]" />}
                {coupon.expiryText}
              </span>
            )}
          </div>

          <h4 className="font-bold text-[16px] text-[#062402] mt-1">
            {coupon.title}
          </h4>
          <p className="text-xs text-[#5A615D] font-medium leading-relaxed">
            {coupon.description}
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => onApply(coupon)}
          disabled={isApplied}
          className={`px-4 py-2 rounded-full font-bold text-xs active:scale-95 transition-all shadow-sm shrink-0 border ${
            isApplied
              ? 'bg-[#062402] text-white border-[#062402] cursor-default'
              : 'bg-[#EAF7D8] hover:bg-[#062402] hover:text-white text-[#1c3a13] border-[#4b6723]/20'
          }`}
        >
          {isApplied ? (
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3" />
              প্রযুক্ত
            </span>
          ) : (
            'প্রয়োগ'
          )}
        </button>
      </div>

      {/* Bottom Meta & Code Tag */}
      <div className="pt-2.5 border-t border-dashed border-[#E2DED8] flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#efeeeb] border border-[#E2DED8]/60">
          {getIcon()}
          <span className="font-mono text-xs font-bold text-[#062402] tracking-wider">
            {coupon.code}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onShowTerms(coupon)}
          className="text-[11px] text-[#4b6723] font-semibold hover:underline flex items-center gap-1"
        >
          <Info className="w-3 h-3" />
          <span>শর্তাবলী দেখুন</span>
        </button>
      </div>
    </div>
  );
}
