// components/admin/shortlist/mobile/demand/MobileOrderPreviewFooter.tsx
'use client';

import React from 'react';
import { Printer, ChevronRight } from 'lucide-react';

export interface MobileOrderPreviewFooterProps {
  onOpenFullOrder?: () => void;
  onViewFullOrder?: () => void;
  onPrintOrderSlip?: () => void;
}

export const MobileOrderPreviewFooter: React.FC<MobileOrderPreviewFooterProps> = ({
  onOpenFullOrder,
  onViewFullOrder,
  onPrintOrderSlip,
}) => {
  const handleOpenFull = onOpenFullOrder || onViewFullOrder;

  return (
    <div className="p-3.5 bg-[#0a1727] border-t border-[#1c2b3c] flex items-center justify-between gap-3 shrink-0 select-none">
      {onPrintOrderSlip && (
        <button
          type="button"
          onClick={onPrintOrderSlip}
          className="py-2.5 px-3 rounded-xl bg-[#122336] hover:bg-[#1a314c] border border-[#1f3b5c] text-indigo-300 hover:text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print Slip</span>
        </button>
      )}

      {handleOpenFull && (
        <button
          type="button"
          onClick={handleOpenFull}
          className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-950 transition cursor-pointer"
        >
          <span>View Full Order Details</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
export default MobileOrderPreviewFooter;
