'use client';

import { Trash2, X } from 'lucide-react';

interface RecentlyViewedClearHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemCount: number;
}

export function RecentlyViewedClearHistoryModal({
  isOpen,
  onClose,
  onConfirm,
  itemCount,
}: RecentlyViewedClearHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#2f312f]/60 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs bg-white rounded-[28px] p-6 flex flex-col items-center text-center space-y-4 shadow-xl border border-[#E2DED8]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
          <Trash2 className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-bold text-[#181C1A]">
            Clear Browsing History?
          </h3>
          <p className="text-xs text-[#43483f] leading-relaxed">
            This will remove all {itemCount} tracked products from your recently viewed list.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 w-full pt-2">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-3 rounded-full bg-[#F2F6F0] text-[#181C1A] text-xs font-bold active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="py-2.5 px-3 rounded-full bg-rose-600 text-white text-xs font-bold active:scale-95 transition-all shadow-sm"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}
