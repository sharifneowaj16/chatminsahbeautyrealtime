'use client';

import React from 'react';
import { WholesaleSkuRow } from '@/app/admin/shortlist/types';

interface SupplierBatchActionsProps {
  items: WholesaleSkuRow[];
  isFullyAcquired: boolean;
  onSelectVendorSkus: (vendorSkus: WholesaleSkuRow[]) => void;
  onMarkBatchAcquiredVendor: (skuIds: string[]) => void;
}

export const SupplierBatchActions: React.FC<SupplierBatchActionsProps> = ({
  items,
  isFullyAcquired,
  onSelectVendorSkus,
  onMarkBatchAcquiredVendor,
}) => {
  return (
    <div className="pt-3 mt-3 border-t border-[#112134] flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={() => onSelectVendorSkus(items)}
        className="flex-1 py-1.5 px-2.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
      >
        <span>🧾</span>
        <span>Open Pick List for this Stall</span>
      </button>

      {!isFullyAcquired && (
        <button
          type="button"
          onClick={() => onMarkBatchAcquiredVendor(items.map((i) => i.id))}
          className="py-1.5 px-2.5 rounded bg-[#0f233a] hover:bg-[#163558] border border-[#1f426e] text-emerald-400 font-mono text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
          title="Mark all items from this stall as acquired"
        >
          <span>✓✓</span>
          <span>Acquire Stall</span>
        </button>
      )}
    </div>
  );
};
