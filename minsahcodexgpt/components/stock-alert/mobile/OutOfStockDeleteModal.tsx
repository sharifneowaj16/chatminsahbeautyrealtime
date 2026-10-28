'use client';

import { useState } from 'react';
import { AlertCircle, X, ShieldCheck } from 'lucide-react';
import { OutOfStockProductCard } from './OutOfStockProductCard';
import { IncheonFlightRestockPill } from './IncheonFlightRestockPill';
import { AlternativeSwapCard } from './AlternativeSwapCard';
import { OutOfStockActionButtons } from './OutOfStockActionButtons';
import { OutOfStockDeleteModalProps, StockProductSummary, AlternativeProduct } from './types';

const DEFAULT_PRODUCT: StockProductSummary = {
  id: 'laneige-lip-mask-berry',
  brand: 'Laneige Korea',
  title: 'Laneige Lip Sleeping Mask (Berry 20g)',
  subtitle: 'Berry Fruit Complex & Vitamin C',
  price: 1720,
  regularPrice: 2100,
  discountPercent: 18,
  image:
    'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=300&q=80',
  expectedDate: '৩ দিনের মধ্যে',
  batchInfo: 'May Batch',
};

const DEFAULT_ALTERNATIVE: AlternativeProduct = {
  id: 'arisol-soothing-sun',
  title: 'Arisol Soothing Sun Relief (50ml)',
  subtitle: 'Centella & Rice Extract SPF50+',
  price: 1650,
  image:
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&q=80',
  tag: 'রেডি টু শিপ',
};

export function OutOfStockDeleteModal({
  isOpen,
  onClose,
  product = DEFAULT_PRODUCT,
  alternative = DEFAULT_ALTERNATIVE,
  onDelete,
  onSaveToWishlist,
  onSwap,
}: OutOfStockDeleteModalProps) {
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
      onClose();
    }, 1800);
  };

  const handleDelete = () => {
    if (onDelete) onDelete();
    showToast('আইটেমটি শপিং ব্যাগ থেকে সফলভাবে সরানো হয়েছে');
  };

  const handleSave = () => {
    if (onSaveToWishlist) onSaveToWishlist();
    showToast('উইশলিস্টে যোগ করা হয়েছে! স্টকে আসলে নোটিফিকেশন পাবেন');
  };

  const handleSwap = (alt: AlternativeProduct) => {
    if (onSwap) onSwap(alt);
    showToast('বিকল্প আইটেমটি ব্যাগে যুক্ত করা হয়েছে');
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-end lg:items-center justify-center bg-[#062402]/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in">
      <div
        className="w-full max-w-lg max-h-[92vh] bg-[#faf9f6] rounded-t-[32px] lg:rounded-[28px] shadow-2xl flex flex-col overflow-hidden border-t border-[#E2DED8]/60 animate-in slide-in-from-bottom-8 duration-300 relative"
      >
        {/* Top Tactile Drag Handle (Mobile) */}
        <div className="w-full pt-3 pb-1 flex justify-center shrink-0 lg:hidden">
          <div className="w-12 h-1.5 rounded-full bg-[#B5C4BB]/60" />
        </div>

        {/* Modal Header Controls */}
        <div className="px-5 pt-3 pb-2 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ffdad6]/60 text-[#ba1a1a] text-[11px] font-bold">
              <span>স্টক শেষ (Out of Stock Alert)</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-9 h-9 rounded-full bg-[#efeeeb] hover:bg-[#E8F0E5] text-[#5A615D] hover:text-[#062402] flex items-center justify-center transition-transform active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="px-5 pb-5 flex flex-col gap-3.5 overflow-y-auto overscroll-contain">
          {/* Headline & Context */}
          <div className="flex flex-col gap-1">
            <h2 className="text-[18px] text-[#062402] font-bold leading-tight">
              পণ্যটি ব্যাগ থেকে মুছে ফেলতে চান?
            </h2>
            <span className="text-xs text-[#5A615D] font-medium">
              Remove Out-of-Stock Item from Cart?
            </span>
            <p className="text-[12px] text-[#5A615D] mt-0.5 leading-relaxed">
              এই আইটেমটি বর্তমানে আমাদের বনানী ওয়্যারহাউসে সাময়িকভাবে স্টক শেষ হয়ে গেছে। আপনি কি এটি ব্যাগ থেকে সরাতে চান নাকি ব্যাক-ইন-স্টক নোটিফিকেশনের জন্য উইশলিস্টে রাখতে চান?
            </p>
          </div>

          {/* Out-of-Stock Product Card */}
          <OutOfStockProductCard product={product} />

          {/* Fresh Restock Pill */}
          <IncheonFlightRestockPill
            arrivalText={`Fresh Batch Restock: ${product.expectedDate || '৩ দিনের মধ্যে'} (ইন-ট্রানজিট)`}
            batchTag={product.batchInfo || 'May Batch'}
          />

          {/* Alternative Recommendation Snippet */}
          <AlternativeSwapCard
            alternative={alternative}
            onSwap={handleSwap}
          />

          {/* Action CTAs */}
          <OutOfStockActionButtons
            onDelete={handleDelete}
            onSaveToWishlist={handleSave}
            onCancel={onClose}
          />

          {/* Trust Seal */}
          <div className="flex items-center justify-center gap-1.5 py-1 text-[#5A615D]/80">
            <ShieldCheck className="w-4 h-4 text-[#4b6723]" />
            <span className="text-[11px] font-bold">
              Minsah Banani Hub • 100% Genuine Worldwide Imports
            </span>
          </div>
        </div>

        {/* Action Toast Feedback */}
        {toastMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#062402] text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-in fade-in flex items-center gap-1.5 z-30">
            <ShieldCheck className="w-4 h-4 text-[#ccee9b]" />
            <span>{toastMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
