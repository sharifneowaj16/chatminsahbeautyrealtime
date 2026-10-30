'use client';

import { Trash2, BookmarkCheck } from 'lucide-react';

interface OutOfStockActionButtonsProps {
  onDelete: () => void;
  onSaveToWishlist: () => void;
  onCancel: () => void;
}

export function OutOfStockActionButtons({
  onDelete,
  onSaveToWishlist,
  onCancel,
}: OutOfStockActionButtonsProps) {
  return (
    <div className="flex flex-col gap-2 pt-1">
      {/* Primary Delete */}
      <button
        type="button"
        onClick={onDelete}
        className="w-full py-3.5 px-4 rounded-full bg-rose-700 hover:bg-rose-800 text-white font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
        <span>Remove from Bag</span>
      </button>

      {/* Secondary Wishlist */}
      <button
        type="button"
        onClick={onSaveToWishlist}
        className="w-full py-3.5 px-4 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-emerald-300 cursor-pointer"
      >
        <BookmarkCheck className="w-4 h-4 text-emerald-700" />
        <span>Save to Wishlist &amp; Notify</span>
      </button>

      {/* Keep & Return */}
      <button
        type="button"
        onClick={onCancel}
        className="w-full py-2.5 text-center text-[#7A6E65] hover:text-[#2D1F18] font-semibold text-xs transition-colors cursor-pointer"
      >
        Keep &amp; Return to Bag
      </button>
    </div>
  );
}
