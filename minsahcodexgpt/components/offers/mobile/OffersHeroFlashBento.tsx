'use client';

import { useState } from 'react';
import { Zap, Ticket, Copy, Check } from 'lucide-react';
import { useOfferEngine } from '@/contexts/OfferEngineContext';

interface OffersHeroFlashBentoProps {
  onCopyPromo: (code: string) => void;
}

export function OffersHeroFlashBento({ onCopyPromo }: OffersHeroFlashBentoProps) {
  const { couponsEnabled, coupons } = useOfferEngine();
  const [copied, setCopied] = useState(false);

  const featuredCoupon = couponsEnabled ? coupons[0] ?? null : null;
  if (!featuredCoupon) return null;

  const badgeLabel =
    featuredCoupon.badgeText ||
    (featuredCoupon.type === 'free_shipping'
      ? 'FREE SHIPPING'
      : featuredCoupon.type === 'percentage'
        ? `${featuredCoupon.value}% OFF`
        : `\u09F3${featuredCoupon.value} OFF`);

  const handleCopy = () => {
    setCopied(true);
    onCopyPromo(featuredCoupon.code);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative bg-[#28531c] text-white rounded-[28px] p-5 overflow-hidden shadow-md flex flex-col justify-between gap-4">
      <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-[#ccee9b]/15 blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-2 relative z-10">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#ccee9b] text-[#1c3a13] text-[11px] font-bold uppercase tracking-wider shadow-sm">
          <Zap className="w-3.5 h-3.5 fill-[#1c3a13]" />
          {badgeLabel}
        </span>
      </div>

      <div className="relative z-10 flex flex-col gap-1 mt-1">
        <h3 className="text-xl leading-tight font-bold text-white">
          {featuredCoupon.bannerText || badgeLabel}
        </h3>
        <p className="text-xs text-white/85 leading-relaxed">
          {featuredCoupon.description ||
            (featuredCoupon.minSubtotal
              ? `Valid on orders from \u09F3${featuredCoupon.minSubtotal.toLocaleString()}.`
              : 'Verified live offer from Minsah Beauty.')}
        </p>
      </div>

      <div className="relative z-10 pt-2 flex items-center justify-between gap-2.5 bg-white/10 backdrop-blur-md p-2.5 rounded-2xl border border-white/10">
        <div className="flex items-center gap-2 pl-1 min-w-0">
          <Ticket className="w-5 h-5 text-[#ccee9b] shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] uppercase text-white/70 tracking-widest font-bold">
              Coupon Code
            </span>
            <span className="text-sm tracking-wider text-[#ccee9b] font-bold font-mono truncate">
              {featuredCoupon.code}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="px-4 py-2 rounded-full bg-[#ccee9b] text-[#1c3a13] text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform hover:opacity-95 shrink-0"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-800" />
              <span>Applied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>1-Tap Copy &amp; Apply</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
