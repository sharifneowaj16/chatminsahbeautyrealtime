'use client';

import { useState } from 'react';
import { AlertCircle, ShieldCheck, Trash2, BookmarkCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { OutOfStockProductCard } from './OutOfStockProductCard';
import { IncheonFlightRestockPill } from './IncheonFlightRestockPill';
import { AlternativeSwapCard } from './AlternativeSwapCard';
import { OutOfStockDeleteModalProps } from './types';

export function OutOfStockDeleteModal({
  isOpen,
  onClose,
  product,
  alternative,
  onDelete,
  onSaveToWishlist,
  onSwap,
}: OutOfStockDeleteModalProps) {
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  if (!isOpen || !product) return null;

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
          <AlertCircle className="h-3.5 w-3.5 text-rose-700" />
          <span>Out of Stock</span>
        </>
      }
      title="Remove Item from Bag?"
      description="Remove Out-of-Stock Item or Save for Restock Notification"
      footer={
        <div className="flex flex-col gap-2 w-full">
          <button
            type="button"
            onClick={() => {
              onDelete?.();
              showToast('Item removed from shopping bag');
            }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-rose-700 px-4 font-bold text-white shadow-sm transition hover:bg-rose-800 active:scale-[0.98] cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>Remove from Bag</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onSaveToWishlist?.();
                showToast('Saved to wishlist!');
              }}
              className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 font-bold text-emerald-900 transition hover:bg-emerald-200 cursor-pointer"
            >
              <BookmarkCheck className="h-4 w-4 text-emerald-700" />
              <span>Save &amp; Notify</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 items-center justify-center rounded-full border border-[#EADFD5] bg-[#FAF6F2] px-3 font-semibold text-[#7A6E65] hover:text-[#2D1F18] cursor-pointer"
            >
              Back to Bag
            </button>
          </div>
        </div>
      }
    >
      {toastMsg ? (
        <div className="flex items-center gap-2 rounded-xl bg-[#1c3a13] px-4 py-2.5 text-white font-semibold">
          <ShieldCheck className="h-4 w-4 text-[#D4F6A2] shrink-0" />
          <span>{toastMsg}</span>
        </div>
      ) : null}

      <p className="text-[#7A6E65]">
        This item is temporarily out of stock. You can remove it from your bag or save it to your wishlist to get notified when new batch arrives.
      </p>

      <OutOfStockProductCard product={product} />
      <IncheonFlightRestockPill
        arrivalText={`Fresh Batch Restock: ${product.expectedDate || 'within 3 days'}`}
        batchTag={product.batchInfo || 'Air Cargo'}
      />
      {alternative ? (
        <AlternativeSwapCard
          alternative={alternative}
          onSwap={(alt) => {
            onSwap?.(alt);
            showToast('Alternative item added to your bag');
          }}
        />
      ) : null}
    </Modal>
  );
}

export default OutOfStockDeleteModal;
