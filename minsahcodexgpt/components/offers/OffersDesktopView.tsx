'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Tag, Sparkles, ArrowRight, Truck, Check, Copy, Layers } from 'lucide-react';
import { useOfferEngine } from '@/contexts/OfferEngineContext';
import { useCart } from '@/contexts/CartContext';

export function OffersDesktopView() {
  const { couponsEnabled, coupons, freeDelivery, bundles, isLoading } = useOfferEngine();
  const { applyPromoCode, promoCode } = useCart();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleApplyOrCopy = (code: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        void navigator.clipboard.writeText(code);
      }
    } catch {}
    applyPromoCode(code, coupons);
    setCopiedCode(code);
    window.setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="hidden lg:block max-w-7xl mx-auto px-6 py-12">
      <div className="mb-10 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3 border border-emerald-200">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          Curated Savings &amp; Vouchers
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Offers &amp; Botanical Savings
        </h1>
        <p className="mt-3 text-slate-600 text-base">
          Live promotional vouchers, delivery privileges, and routine bundle savings managed directly by Minsah Beauty.
        </p>
      </div>

      {/* Live Delivery Privilege & Bundle Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase">
              <Truck className="w-3.5 h-3.5" /> Free Nationwide Delivery
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mt-4">
              Orders {'\u2265'} {'\u09F3'}{freeDelivery.nationwideThreshold.toLocaleString()}
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Enjoy 100% free doorstep delivery across all 64 districts on orders of {'\u09F3'}{freeDelivery.nationwideThreshold.toLocaleString()} or more.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Auto-applied at checkout</span>
            <span className="text-emerald-700 font-bold">Active</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold uppercase">
              <Truck className="w-3.5 h-3.5" /> Dhaka &amp; Subsidized Tiers
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mt-4">
              Dhaka Free {'\u2265'} {'\u09F3'}{freeDelivery.dhakaThreshold.toLocaleString()}
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Inside Dhaka orders from {'\u09F3'}{freeDelivery.dhakaThreshold.toLocaleString()} ship free.
              {freeDelivery.outsideDhakaSubsidizedThreshold && typeof freeDelivery.outsideDhakaSubsidizedFee === 'number'
                ? ` Outside Dhaka orders from \u09F3${freeDelivery.outsideDhakaSubsidizedThreshold.toLocaleString()} enjoy subsidized \u09F3${freeDelivery.outsideDhakaSubsidizedFee} delivery.`
                : ''}
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Auto-calculated by city</span>
            <span className="text-emerald-700 font-bold">Active</span>
          </div>
        </div>

        {bundles.enabled && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-md flex flex-col justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase">
                <Layers className="w-3.5 h-3.5" /> Routine Bundles
              </span>
              <h2 className="text-2xl font-bold text-white mt-4">
                Save up to {bundles.fourStepDiscountPercent}% Profit Share
              </h2>
              <p className="text-sm text-slate-300 mt-2">
                2 items: {bundles.twoStepDiscountPercent}% | 3 items: {bundles.threeStepDiscountPercent}% | 4+ items: {bundles.fourStepDiscountPercent}% automatic bundle savings.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-700 flex items-center justify-between">
              <span className="text-xs text-slate-300">Build on any product page</span>
              <Link
                href="/shop"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 hover:text-emerald-200"
              >
                <span>Build Bundle</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Live Admin Vouchers */}
      {couponsEnabled && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-slate-900">Active Promo Vouchers</h2>
            <span className="text-xs font-semibold text-emerald-700">
              {isLoading ? 'Loading...' : `${coupons.length} Active`}
            </span>
          </div>

          {coupons.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No active promo codes right now. Automatic free delivery &amp; bundle savings still apply at checkout.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coupons.map((coupon) => {
                const isApplied = promoCode.trim().toUpperCase() === coupon.code.trim().toUpperCase();
                const isCopied = copiedCode === coupon.code;
                const badge =
                  coupon.badgeText ||
                  (coupon.type === 'percentage'
                    ? `${coupon.value}% OFF`
                    : `\u09F3${coupon.value} OFF`);
                return (
                  <div
                    key={coupon.code}
                    className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold uppercase">
                        {badge}
                      </span>
                      <h3 className="text-xl font-bold text-slate-900 mt-4">
                        {coupon.bannerText || badge}
                      </h3>
                      <p className="text-sm text-slate-600 mt-2">
                        {coupon.description || 'Verified promotional voucher from Minsah Beauty.'}
                      </p>
                      {coupon.minSubtotal ? (
                        <p className="text-xs font-semibold text-amber-800 mt-2">
                          Minimum order: {'\u09F3'}{coupon.minSubtotal.toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg">
                        {coupon.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleApplyOrCopy(coupon.code)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        {isApplied || isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{isApplied ? 'Applied' : 'Copied'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy &amp; Apply</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link
          href="/flash-sale"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors"
        >
          <Tag className="w-4 h-4" />
          <span>Explore All Flash Deals &amp; Discounts</span>
        </Link>
      </div>
    </div>
  );
}
