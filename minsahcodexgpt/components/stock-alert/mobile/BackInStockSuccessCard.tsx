'use client';

import { BellRing, Check, X } from 'lucide-react';

interface BackInStockSuccessCardProps {
  productTitle?: string;
  onDismiss?: () => void;
}

export function BackInStockSuccessCard({
  productTitle = 'Lip Mask',
  onDismiss,
}: BackInStockSuccessCardProps) {
  return (
    <div className="p-4 rounded-2xl bg-[#FAF6F2] border border-emerald-200 text-emerald-950 flex items-center gap-3.5 relative overflow-hidden shadow-xs animate-in fade-in">
      <div className="w-11 h-11 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shrink-0 relative">
        <BellRing className="w-5 h-5 text-emerald-800" />
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-800 text-white flex items-center justify-center text-[10px] font-bold">
          <Check className="w-2.5 h-2.5" />
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-[#2D1F18] flex items-center gap-1.5">
          <span>You will be notified!</span>
          <span className="text-[9px] bg-emerald-100 px-2 py-0.5 rounded text-emerald-900 font-bold uppercase">
            Alert Active
          </span>
        </div>
        <p className="text-[11px] text-[#7A6E65] mt-0.5 leading-relaxed">
          As soon as {productTitle} is checked in at our hub, you will receive an immediate ping. Thank you!
        </p>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-[#7A6E65] hover:text-[#2D1F18] p-1 transition-colors shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
