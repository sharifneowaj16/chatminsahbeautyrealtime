"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, ShoppingBag, X } from "lucide-react";
import { formatPrice } from "@/utils/currency";

export interface PriceChangeItem {
  productId: string;
  variantId?: string | null;
  lineKey?: string | null;
  productName: string;
  oldPrice: number;
  newPrice: number;
  reason?: string;
}

export interface PriceRevisionQuote {
  quoteId: string;
  expiresAt: string;
  items: Array<{
    lineKey?: string | null;
    productId: string;
    variantId?: string | null;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    pricingSource?: string;
  }>;
  subtotal: number;
  couponDiscount: number;
  shippingCost: number;
  grandTotal: number;
}

export interface PriceRevisionConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (token: string) => void;
  priceQuoteToken: string;
  changes: PriceChangeItem[];
  quote: PriceRevisionQuote | null;
  isSubmitting?: boolean;
}

export function PriceRevisionConsentModal({
  isOpen,
  onClose,
  onAccept,
  priceQuoteToken,
  changes,
  quote,
  isSubmitting = false,
}: PriceRevisionConsentModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen || !quote) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[180] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog / Bottom Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-revision-title"
        className="relative w-full max-h-[88dvh] sm:max-h-[85dvh] sm:max-w-[520px] bg-white rounded-t-[24px] sm:rounded-[24px] shadow-2xl flex flex-col overflow-hidden z-[181] overflow-x-hidden border border-gray-100"
      >
        {/* Mobile Grab Handle */}
        <div className="sm:hidden w-full pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="price-revision-title"
                className="text-[18px] font-bold text-[#1B361B] leading-tight"
              >
                মূল্য হালনাগাদ নোটিশ
              </h2>
              <span className="text-[12px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                Price Revised (Revision Required)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors touch-manipulation disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <p className="text-[14px] text-gray-600 leading-relaxed">
            ফ্ল্যাশ ডিলের মেয়াদ শেষ হওয়ায় অথবা ক্যাম্পেইন সেটিং হালনাগাদ হওয়ায় আপনার ব্যাগে থাকা পণ্যের মূল্য সমন্বয় করা হয়েছে। আপনার স্পষ্ট সম্মতি ছাড়া কোনো অতিরিক্ত চার্জ নেওয়া হবে না।
          </p>

          {/* List of Changed Items */}
          <div className="space-y-2.5">
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider block">
              পরিবর্তিত আইটেমসমূহ
            </span>
            {changes.map((item, index) => (
              <div
                key={item.lineKey || `${item.productId}-${index}`}
                className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-gray-900 truncate">
                    {item.productName}
                  </p>
                  <p className="text-[12px] text-amber-700 mt-0.5">
                    {item.reason || "নিয়মিত মূল্য প্রযোজ্য"}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-[12px] text-gray-400 line-through">
                      {formatPrice(item.oldPrice)}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[14px] font-bold text-[#1B361B]">
                      {formatPrice(item.newPrice)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Revised Order Calculation Breakdown */}
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EFE7DE] space-y-2 text-[14px]">
            <div className="flex justify-between text-gray-600">
              <span>সংশোধিত সাবটোটাল (Subtotal):</span>
              <span className="font-medium text-gray-900">
                {formatPrice(quote.subtotal)}
              </span>
            </div>
            {quote.couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>কুপন ডিসকাউন্ট (Coupon):</span>
                <span>-{formatPrice(quote.couponDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>ডেলিভারি চার্জ (Delivery):</span>
              <span className="font-medium text-gray-900">
                {quote.shippingCost === 0 ? "Free" : formatPrice(quote.shippingCost)}
              </span>
            </div>
            <div className="pt-2 border-t border-[#E5DACD] flex justify-between items-baseline font-bold">
              <span className="text-[16px] text-gray-900">সর্বমোট প্রদেয় (Final Total):</span>
              <span className="text-[20px] text-[#1B361B] font-price">
                {formatPrice(quote.grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 sm:p-6 bg-white border-t border-gray-100 space-y-2.5">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onAccept(priceQuoteToken)}
            className="w-full bg-[#1B361B] hover:bg-[#142814] active:scale-[0.99] text-white py-3.5 px-4 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all touch-manipulation disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>সংশোধিত মূল্যে অর্ডার নিশ্চিত করুন</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors touch-manipulation disabled:opacity-50"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>কার্টে ফিরে গিয়ে রিভিউ করুন</span>
          </button>
        </div>
      </div>
    </div>
  );
}
