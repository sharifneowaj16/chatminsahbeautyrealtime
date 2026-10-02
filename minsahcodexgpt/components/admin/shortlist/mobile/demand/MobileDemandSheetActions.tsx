// components/admin/shortlist/mobile/demand/MobileDemandSheetActions.tsx
'use client';

import React from 'react';
import { ShoppingCart, Printer } from 'lucide-react';
import { formatPrice } from '@/utils/currency';

export interface MobileDemandSheetActionsProps {
  totalDemand?: number;
  totalClients?: number;
  totalWholesaleAlloc?: number;
  remainingQty?: number;
  onAcquireClick?: () => void;
  onAcquireAll?: () => void;
  onPrintThermalSlipClick?: () => void;
  onPrintThermalSlip?: () => void;
}

export const MobileDemandSheetActions: React.FC<MobileDemandSheetActionsProps> = ({
  totalDemand,
  totalClients,
  totalWholesaleAlloc,
  remainingQty,
  onAcquireClick,
  onAcquireAll,
  onPrintThermalSlipClick,
  onPrintThermalSlip,
}) => {
  const handleAcquire = onAcquireAll || onAcquireClick;
  const handlePrint = onPrintThermalSlip || onPrintThermalSlipClick;

  return (
    <div className="p-4 pt-3 pb-8 bg-[#051424] border-t border-[#1c2b3c] flex flex-col gap-2 shrink-0 select-none">
      {totalDemand !== undefined && totalWholesaleAlloc !== undefined && (
        <div className="flex items-center justify-between px-1 text-xs">
          <span className="text-slate-400 uppercase font-semibold text-[10px]">
            Total SKU Allocation
          </span>
          <span className="font-mono text-emerald-400 font-bold">
            {totalDemand} pcs • {totalClients || 1} Clients (Wholesale: {formatPrice(totalWholesaleAlloc)})
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        {handlePrint && (
          <button
            type="button"
            onClick={handlePrint}
            className="py-2.5 px-3 rounded-xl bg-[#122336] hover:bg-[#1a314c] border border-[#1f3b5c] text-indigo-300 hover:text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Slip</span>
          </button>
        )}

        {handleAcquire && (
          <button
            type="button"
            onClick={handleAcquire}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>
              {remainingQty !== undefined
                ? `Acquire All (${remainingQty} Remaining)`
                : 'Acquire All Demanded Units'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
export default MobileDemandSheetActions;
