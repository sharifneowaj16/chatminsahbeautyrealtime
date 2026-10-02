// components/admin/shortlist/mobile/inspection/MobileInspectionItemsTable.tsx
'use client';

import React from 'react';
import { Package, Check } from 'lucide-react';
import { formatPrice } from '@/utils/currency';
import { WholesaleSkuRow } from '@/app/admin/shortlist/types';

export interface InspectionItem {
  id: string;
  name: string;
  sku?: string;
  shade?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isAcquired?: boolean;
}

export interface MobileInspectionItemsTableProps {
  items?: InspectionItem[];
  sku?: WholesaleSkuRow | null;
  onToggleItemAcquired?: (itemId: string) => void;
}

export const MobileInspectionItemsTable: React.FC<MobileInspectionItemsTableProps> = ({
  items,
  sku,
  onToggleItemAcquired,
}) => {
  const displayItems: InspectionItem[] = items && items.length > 0
    ? items
    : sku
    ? [
        {
          id: sku.id,
          name: sku.title,
          sku: sku.sku,
          shade: sku.variantOrShade,
          quantity: sku.requiredQuantity,
          unitPrice: sku.financials.unitCost,
          totalPrice: sku.financials.totalCost,
          isAcquired: sku.isAcquired,
        },
      ]
    : [
        {
          id: '1',
          name: 'Velvet Matte Liquid Lipstick',
          sku: 'MSB-LIP-01',
          shade: 'Ruby Rose (3.2ml)',
          quantity: 2,
          unitPrice: 320,
          totalPrice: 640,
          isAcquired: true,
        },
        {
          id: '2',
          name: 'Hydrating Glow Serum 30ml',
          sku: 'MSB-SERUM-01',
          shade: 'Vitamin C & Niacinamide',
          quantity: 1,
          unitPrice: 550,
          totalPrice: 550,
          isAcquired: false,
        },
      ];

  return (
    <div className="rounded-xl bg-[#0d1c2d] border border-[#1f2f45] p-3.5 flex flex-col gap-2.5 shadow-md font-mono text-xs select-none">
      <div className="flex items-center justify-between pb-1 border-b border-[#1c2b3c]">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-indigo-400" />
          <span className="text-sm text-white font-bold font-sans">
            Package Items ({displayItems.length})
          </span>
        </div>
        <span className="text-[10px] text-slate-400">
          Inspection Checklist
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {displayItems.map((item) => (
          <div
            key={item.id}
            className="p-2.5 rounded-lg bg-[#122131] border border-[#1c2b3c] flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => onToggleItemAcquired && onToggleItemAcquired(item.id)}
                className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition ${
                  item.isAcquired
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-[#051424] border border-[#1c2b3c] text-transparent hover:border-slate-500'
                }`}
                aria-label={`Toggle ${item.name}`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </button>
              <div className="flex flex-col min-w-0">
                <span className="text-white font-semibold truncate leading-tight font-sans">
                  {item.name}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {item.sku} {item.shade ? `• ${item.shade}` : ''}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end shrink-0">
              <span className="text-emerald-400 font-bold">{formatPrice(item.totalPrice)}</span>
              <span className="text-[10px] text-slate-400">
                {item.quantity} × {formatPrice(item.unitPrice)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default MobileInspectionItemsTable;
