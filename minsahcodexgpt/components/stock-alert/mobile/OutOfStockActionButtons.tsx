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
        className="w-full py-3.5 px-4 rounded-full bg-[#ba1a1a] hover:bg-[#93000a] text-white font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md"
      >
        <Trash2 className="w-4 h-4" />
        <span>ব্যাগ থেকে মুছে ফেলুন (Remove from Cart)</span>
      </button>

      {/* Secondary Wishlist */}
      <button
        type="button"
        onClick={onSaveToWishlist}
        className="w-full py-3.5 px-4 rounded-full bg-[#EAF7D8] hover:bg-[#ccee9b] text-[#1c3a13] font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-[#4b6723]/20"
      >
        <BookmarkCheck className="w-4 h-4 text-[#4b6723]" />
        <span>উইশলিস্টে সেভ করে রাখুন (Save &amp; Notify)</span>
      </button>

      {/* Keep & Return */}
      <button
        type="button"
        onClick={onCancel}
        className="w-full py-2.5 text-center text-[#5A615D] hover:text-[#062402] font-semibold text-xs transition-colors"
      >
        ব্যাগে ফিরে যান (Keep &amp; Return to Bag)
      </button>
    </div>
  );
}
