'use client';

import { useState } from 'react';
import { AlertCircle, ShieldCheck, Trash2, BookmarkCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { OutOfStockProductCard } from './OutOfStockProductCard';
import { IncheonFlightRestockPill } from './IncheonFlightRestockPill';
import { AlternativeSwapCard } from './AlternativeSwapCard';
import { OutOfStockDeleteModalProps, StockProductSummary, AlternativeProduct } from './types';

const DEFAULT_PRODUCT: StockProductSummary = {
  id: 'laneige-lip-mask-berry',
  brand: 'Laneige Korea',
  title: 'Laneige Lip Sleeping Mask (Berry 20g)',
  subtitle: 'Berry Fruit Complex & Vitamin C',
  price: 1720,
  regularPrice: 2100,
  discountPercent: 18,
  image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=300&q=80',
  expectedDate: '৩ দিনের মধ্যে',
  batchInfo: 'May Batch',
};

const DEFAULT_ALTERNATIVE: AlternativeProduct = {
  id: 'arisol-soothing-sun',
  title: 'Arisol Soothing Sun Relief (50ml)',
  subtitle: 'Centella & Rice Extract SPF50+',
  price: 1650,
  image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&q=80',
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

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
      onClose();
    }, 1500);
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      badge={
        <>
          <AlertCircle className="h-3.5 w-3.5 text-[#ba1a1a]" />
          <span>স্টক শেষ (Out of Stock)</span>
        </>
      }
      title="পণ্যটি ব্যাগ থেকে মুছে ফেলতে চান?"
      description="Remove Out-of-Stock Item or Save for Restock Notification"
      footer={
        <div className="flex flex-col gap-2 w-full">
          <button
            type="button"
            onClick={() => {
              onDelete?.();
              showToast('আইটেমটি শপিং ব্যাগ থেকে সরানো হয়েছে');
            }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#ba1a1a] px-4 font-bold text-white shadow-sm transition hover:bg-[#93000a] active:scale-[0.98]"
          >
            <Trash2 className="h-4 w-4" />
            <span>ব্যাগ থেকে মুছে ফেলুন (Remove)</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onSaveToWishlist?.();
                showToast('উইশলিস্টে যোগ করা হয়েছে!');
              }}
              className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-[#B5C4BB] bg-[#EAF7D8] px-3 font-bold text-[#1c3a13] transition hover:bg-[#ccee9b]"
            >
              <BookmarkCheck className="h-4 w-4 text-[#4b6723]" />
              <span>Save &amp; Notify</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 items-center justify-center rounded-full border border-[#E2DED8] bg-[#F4F3EF] px-3 font-semibold text-[#5A615D] hover:text-[#181C1A]"
            >
              ব্যাগে ফিরে যান
            </button>
          </div>
        </div>
      }
    >
      {toastMsg ? (
        <div className="flex items-center gap-2 rounded-xl bg-[#062402] px-4 py-2.5 text-white font-semibold">
          <ShieldCheck className="h-4 w-4 text-[#D4F6A2] shrink-0" />
          <span>{toastMsg}</span>
        </div>
      ) : null}

      <p className="text-[#5A615D]">
        এই আইটেমটি সাময়িকভাবে স্টক শেষ। আপনি এটি ব্যাগ থেকে সরাতে পারেন অথবা উইশলিস্টে সেভ করে রাখতে পারেন।
      </p>

      <OutOfStockProductCard product={product} />
      <IncheonFlightRestockPill
        arrivalText={`Fresh Batch Restock: ${product.expectedDate || '৩ দিনের মধ্যে'}`}
        batchTag={product.batchInfo || 'May Batch'}
      />
      <AlternativeSwapCard
        alternative={alternative}
        onSwap={(alt) => {
          onSwap?.(alt);
          showToast('বিকল্প আইটেমটি ব্যাগে যুক্ত করা হয়েছে');
        }}
      />
    </Modal>
  );
}
