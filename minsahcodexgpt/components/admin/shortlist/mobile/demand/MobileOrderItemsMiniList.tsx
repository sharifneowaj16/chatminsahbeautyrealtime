// components/admin/shortlist/mobile/demand/MobileOrderItemsMiniList.tsx
'use client';

import React from 'react';
import { Package, Check, ChevronDown, Store, QrCode } from 'lucide-react';
import { formatPrice } from '@/utils/currency';
import { WholesaleSkuRow } from '@/app/admin/shortlist/types';
import { EnrichedOrderDemand } from '@/app/admin/shortlist/components/mobile/MobileOrdersDemandSheet';

export interface MiniCartItem {
  id: string;
  name: string;
  shade?: string;
  quantity: number;
  price: number;
  isAcquired?: boolean;
}

export interface MobileOrderItemsMiniListProps {
  items?: MiniCartItem[];
  sku?: WholesaleSkuRow | null;
  order?: EnrichedOrderDemand;
  orderTotal?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const MobileOrderItemsMiniList: React.FC<MobileOrderItemsMiniListProps> = ({
  items,
  sku,
  order,
  orderTotal = 1710,
  isExpanded = true,
  onToggleExpand,
}) => {
  const displayItems: MiniCartItem[] = items && items.length > 0
    ? items
    : sku
    ? [
        {
          id: sku.id,
          name: sku.title,
          shade: sku.variantOrShade,
          quantity: order?.quantity || 2,
          price: sku.financials.retailValue > 0 && sku.requiredQuantity > 0
            ? Math.round(sku.financials.retailValue / sku.requiredQuantity)
            : 550,
          isAcquired: Boolean(sku.isAcquired),
        },
      ]
    : [
        {
          id: '1',
          name: 'Velvet Matte Liquid Lipstick',
          shade: 'Ruby Rose (3.2ml)',
          quantity: 2,
          price: 550,
          isAcquired: true,
        },
      ];

  return (
    <div className="p-3 rounded-xl bg-[#122131] border border-[#1f2f45] shadow-sm font-mono text-xs select-none">
      <div
        onClick={onToggleExpand}
        className={`flex items-center justify-between pb-2 border-b border-[#1c2b3c] ${
          onToggleExpand ? 'cursor-pointer hover:opacity-90' : ''
        }`}
      >
        <div className="flex items-center gap-1.5 text-slate-300">
          <Package className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-bold">Ordered SKUs in Basket</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400">
            {displayItems.length} item{displayItems.length > 1 ? 's' : ''}
          </span>
          {onToggleExpand && (
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {displayItems.map((item) => (
            <div
              key={item.id}
              className="p-2 rounded-lg bg-[#0a1727] border border-[#172a3e] flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    item.isAcquired
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-[#152538] text-slate-500'
                  }`}
                >
                  {item.isAcquired ? <Check className="w-3 h-3 stroke-[3]" /> : '○'}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-white font-semibold font-sans truncate">{item.name}</span>
                  {item.shade && (
                    <span className="text-[10px] text-slate-400 truncate">{item.shade}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end shrink-0">
                <span className="text-white font-bold">{formatPrice(item.price * item.quantity)}</span>
                <span className="text-[10px] text-slate-400">
                  {item.quantity} × {formatPrice(item.price)}
                </span>
              </div>
            </div>
          ))}

          {sku?.vendor && (
            <div className="px-2 py-1.5 rounded-lg bg-[#071321] text-[11px] flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-amber-400" />
                <span>{sku.vendor.stallName} ({sku.vendor.standLocation || sku.vendor.zone})</span>
              </span>
              <span className="text-emerald-400 font-semibold font-mono">Cost: ৳{sku.financials.unitCost * (order?.quantity || 2)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default MobileOrderItemsMiniList;
