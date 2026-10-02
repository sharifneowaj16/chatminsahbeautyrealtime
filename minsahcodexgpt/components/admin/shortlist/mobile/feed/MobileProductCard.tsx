'use client';

import React from 'react';
import { WholesaleSkuRow } from '@/app/admin/shortlist/types';
import { MobileProductCardThumbnail } from './MobileProductCardThumbnail';
import { MobileProductCardDetails } from './MobileProductCardDetails';
import { MobileProductCardDemandMetrics } from './MobileProductCardDemandMetrics';
import { MobileProductCardActionButtons } from './MobileProductCardActionButtons';
import { Store, Phone } from 'lucide-react';

interface MobileProductCardProps {
  sku: WholesaleSkuRow;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onAcquire: () => void;
  onOrdersDemand: () => void;
  onPrintSlip: () => void;
}

export const MobileProductCard: React.FC<MobileProductCardProps> = ({
  sku,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
  onAcquire,
  onOrdersDemand,
  onPrintSlip,
}) => {
  const isUrgent = sku.priority === 'URGENT' || sku.demandTag?.toLowerCase().includes('urgent');
  const unitCost = sku.financials.unitCost || 320;
  const totalCost = unitCost * sku.requiredQuantity;
  const orderCount = sku.linkedOrders?.length || 1;

  return (
    <article
      className={`rounded-xl bg-[#0d1c2d] border transition-all shadow-md overflow-hidden ${
        isSelected
          ? 'border-emerald-500/60 ring-1 ring-emerald-500/30'
          : isUrgent
          ? 'border-amber-500/30'
          : 'border-[#1f2f45]'
      }`}
    >
      {/* Header Summary (Always Visible) */}
      <div
        onClick={onToggleExpand}
        className="p-3 flex items-start gap-2.5 cursor-pointer active:bg-[#122336]/60 transition-colors select-none"
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className="mt-1 h-4 w-4 rounded bg-[#172a3e] border-[#1f2f45] text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-emerald-500 shrink-0"
        />

        <MobileProductCardThumbnail
          thumbnailUrl={sku.thumbnailUrl}
          title={sku.title}
          volumeSpec={sku.volumeSpec}
        />

        <div className="flex flex-col min-w-0 flex-1">
          <MobileProductCardDetails
            sku={sku.sku}
            title={sku.title}
            variantOrShade={sku.variantOrShade}
            isUrgent={isUrgent}
            isExpanded={isExpanded}
          />

          <MobileProductCardDemandMetrics
            requiredQuantity={sku.requiredQuantity}
            pickedQuantity={sku.pickedQuantity || 0}
            unitCost={unitCost}
            totalCost={totalCost}
          />
        </div>
      </div>

      {/* Expanded Details Panel */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[#172b40] bg-[#091524] space-y-2.5 font-mono text-xs select-none">
          {/* Vendor Details */}
          <div className="p-2.5 rounded-lg bg-[#050e18] border border-[#14263c] flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                <Store className="w-3.5 h-3.5 text-indigo-400" />
                <span>{sku.vendor.stallName}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                📍 {sku.vendor.standLocation}
              </p>
            </div>

            {sku.vendor.phone && (
              <a
                href={`tel:${sku.vendor.phone.replace(/[^0-9+]/g, '')}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#0e1f32] border border-[#1d3859] text-indigo-300 hover:text-white text-[11px] font-bold shrink-0"
              >
                <Phone className="w-3 h-3" />
                <span>Call</span>
              </a>
            )}
          </div>

          {/* Pricing & Profit Matrix */}
          <div className="grid grid-cols-3 gap-1.5 text-[11px] text-center">
            <div className="p-1.5 rounded bg-[#050e18] border border-[#14263c]">
              <span className="text-[9px] text-slate-400 block uppercase">Wholesale</span>
              <span className="text-white font-bold block mt-0.5">৳{unitCost}</span>
            </div>
            <div className="p-1.5 rounded bg-[#050e18] border border-[#14263c]">
              <span className="text-[9px] text-slate-400 block uppercase">Total Cost</span>
              <span className="text-amber-400 font-bold block mt-0.5">৳{totalCost}</span>
            </div>
            <div className="p-1.5 rounded bg-[#050e18] border border-[#14263c]">
              <span className="text-[9px] text-slate-400 block uppercase">Margin</span>
              <span className="text-emerald-400 font-bold block mt-0.5">
                {sku.financials?.marginPercent ? Math.round(sku.financials.marginPercent) : 42}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons Footer */}
      <div className="px-3 pb-3">
        <MobileProductCardActionButtons
          isAcquired={sku.isAcquired}
          orderCount={orderCount}
          onAcquire={onAcquire}
          onOrdersDemand={onOrdersDemand}
          onPrintSlip={onPrintSlip}
        />
      </div>
    </article>
  );
};
