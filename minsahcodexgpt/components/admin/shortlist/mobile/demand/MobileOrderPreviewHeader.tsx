'use client';

import React from 'react';
import { X, Truck } from 'lucide-react';

interface MobileOrderPreviewHeaderProps {
  orderNumber: string;
  isExpress?: boolean;
  courierService?: string;
  onClose: () => void;
}

export const MobileOrderPreviewHeader: React.FC<MobileOrderPreviewHeaderProps> = ({
  orderNumber,
  isExpress = false,
  courierService,
  onClose,
}) => {
  return (
    <div className="px-4 pt-2 pb-3 border-b border-[#1c2b3c] flex items-start justify-between gap-3 shrink-0 select-none">
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-mono text-base text-white font-bold tracking-wide">
            #{orderNumber}
          </h2>
          {isExpress ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              2x Express
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1c2b3c] text-slate-300 font-bold">
              Standard Delivery
            </span>
          )}
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#1c2b3c] text-amber-200 font-semibold">
            42m left (3:30 PM)
          </span>
        </div>
        <p className="text-xs text-slate-400 truncate mt-1 flex items-center gap-1.5">
          <Truck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>{courierService || 'Steadfast Express • Same-Day Direct Van'}</span>
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="h-9 w-9 rounded-lg bg-[#1c2b3c] hover:bg-[#273647] text-slate-300 hover:text-white flex items-center justify-center shrink-0 active:scale-90 transition cursor-pointer"
        aria-label="Close Order Preview"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};
