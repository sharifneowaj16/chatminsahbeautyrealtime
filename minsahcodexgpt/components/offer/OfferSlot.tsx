'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Tag, Check, Copy } from 'lucide-react';
import { useOfferEngine } from '@/contexts/OfferEngineContext';
import type { OfferPlacement, PromoRule } from '@/lib/commerce/offer-engine/types';

export interface OfferSlotProps {
  placement: OfferPlacement;
  className?: string;
  compact?: boolean;
  maxItems?: number;
  fallback?: React.ReactNode;
  onApplyCoupon?: (code: string) => void;
}

export function OfferSlot({
  placement,
  className = '',
  compact = false,
  maxItems = 2,
  fallback = null,
  onApplyCoupon,
}: OfferSlotProps) {
  const { getOffersForPlacement, isLoading } = useOfferEngine();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const offers = getOffersForPlacement(placement).slice(0, maxItems);

  if (!mounted || isLoading || offers.length === 0) {
    return <>{fallback}</>;
  }

  const handleCopy = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(null), 2000);
    }
    if (onApplyCoupon) {
      onApplyCoupon(code);
    }
  };

  if (compact) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        {offers.map((offer) => (
          <div
            key={offer.code}
            className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1.5 text-xs text-emerald-900 shadow-sm"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles size={13} className="shrink-0 text-emerald-600" />
              <span className="truncate font-semibold tracking-wide">{offer.code}</span>
              <span className="truncate text-[11px] text-emerald-700/90">
                · {offer.badgeText || (offer.type === 'percentage' ? `${offer.value}% OFF` : `৳${offer.value} OFF`)}
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => handleCopy(offer.code, e)}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 shadow-xs hover:bg-white active:scale-95 transition-all"
            >
              {copiedCode === offer.code ? (
                <>
                  <Check size={11} className="text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={11} className="text-emerald-600" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      {offers.map((offer) => (
        <div
          key={offer.code}
          className="relative overflow-hidden rounded-2xl border border-[#EADFD5] bg-[#FAF6F2] p-3.5 shadow-sm sm:p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#984B29] shadow-xs">
                <Tag size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-xs font-black tracking-wider text-[#2D1F18]">
                    {offer.code}
                  </span>
                  {offer.badgeText && (
                    <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      {offer.badgeText}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-[#7A6E65] leading-relaxed line-clamp-2">
                  {offer.description || offer.bannerText}
                </p>
                {offer.minSubtotal ? (
                  <p className="mt-1 text-[11px] font-medium text-[#984B29]">
                    Minimum order: ৳{offer.minSubtotal}
                  </p>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => handleCopy(offer.code, e)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#D5C6BA] bg-white px-3 py-1.5 text-xs font-bold text-[#2D1F18] shadow-xs hover:border-[#984B29] hover:text-[#984B29] active:scale-95 transition-all"
            >
              {copiedCode === offer.code ? (
                <>
                  <Check size={13} className="text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={13} className="text-[#7A6E65]" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default OfferSlot;
