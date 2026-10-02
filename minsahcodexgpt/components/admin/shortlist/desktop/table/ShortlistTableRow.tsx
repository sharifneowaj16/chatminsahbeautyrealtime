'use client';

import React from 'react';
import { WholesaleSkuRow } from '@/app/admin/shortlist/types';
import { ShortlistProductSpecCell } from './ShortlistProductSpecCell';
import { ShortlistDemandMappingCell } from './ShortlistDemandMappingCell';
import { ShortlistVendorStandCell } from './ShortlistVendorStandCell';
import { ShortlistCostProfitCell } from './ShortlistCostProfitCell';
import { ShortlistLogisticsStatusCell } from './ShortlistLogisticsStatusCell';
import { ShortlistRowActionMenu } from './ShortlistRowActionMenu';

interface ShortlistTableRowProps {
  sku: WholesaleSkuRow;
  isSelected: boolean;
  onToggleSelectRow: (skuId: string) => void;
  onAcquireSku: (skuId: string) => void;
  onAssignRunner?: (skuId: string) => void;
  onTogglePriority?: (skuId: string) => void;
  onCopyText?: (text: string, label: string) => void;
}

export const ShortlistTableRow: React.FC<ShortlistTableRowProps> = ({
  sku,
  isSelected,
  onToggleSelectRow,
  onAcquireSku,
  onAssignRunner,
  onTogglePriority,
  onCopyText,
}) => {
  return (
    <tr
      className={`transition-colors group ${
        isSelected ? 'bg-[#0a192a]/80' : 'hover:bg-[#0a192a]/50'
      }`}
    >
      {/* 1. Product & SKU Spec */}
      <ShortlistProductSpecCell
        sku={sku}
        isSelected={isSelected}
        onToggleSelect={() => onToggleSelectRow(sku.id)}
        onTogglePriority={onTogglePriority}
      />

      {/* 2. Demand & Order Mapping */}
      <ShortlistDemandMappingCell sku={sku} />

      {/* 3. Wholesale Stand & Vendor */}
      <ShortlistVendorStandCell sku={sku} />

      {/* 4. Cost & Profit */}
      <ShortlistCostProfitCell sku={sku} />

      {/* 5. Acquisition / Logistics */}
      <ShortlistLogisticsStatusCell sku={sku} />

      {/* 6. Action Menu */}
      <ShortlistRowActionMenu
        sku={sku}
        onAcquireSku={onAcquireSku}
        onAssignRunner={onAssignRunner}
        onTogglePriority={onTogglePriority}
        onCopyText={onCopyText}
      />
    </tr>
  );
};
