// app/admin/shortlist/components/WholesaleTable.tsx
// High-Density 6-Column Wholesale SKU Data Matrix matching Stitch Ground Truth (Screen ID: 46092511627045dd9f65eaa0328dd890)
// Decomposed into declarative atomic components (Loop 5)

'use client';

import React from 'react';
import { WholesaleSkuRow } from '../types';
import { ShortlistTableHeader } from '@/components/admin/shortlist/desktop/table/ShortlistTableHeader';
import { ShortlistTableRow } from '@/components/admin/shortlist/desktop/table/ShortlistTableRow';
import { ShortlistTableEmptyState } from '@/components/admin/shortlist/desktop/table/ShortlistTableEmptyState';

interface WholesaleTableProps {
  skus: WholesaleSkuRow[];
  selectedSkuIds: Set<string>;
  onToggleSelectRow: (skuId: string) => void;
  onAcquireSku: (skuId: string) => void;
  onAssignRunner?: (skuId: string) => void;
  onTogglePriority?: (skuId: string) => void;
  onCopyText?: (text: string, label: string) => void;
  currentPage: number;
  totalRows: number;
  onPageChange: (page: number) => void;
}

export default function WholesaleTable({
  skus,
  selectedSkuIds,
  onToggleSelectRow,
  onAcquireSku,
  onAssignRunner,
  onTogglePriority,
  onCopyText,
  currentPage,
  totalRows,
  onPageChange,
}: WholesaleTableProps) {
  if (skus.length === 0) {
    return <ShortlistTableEmptyState />;
  }

  const displayedSkus = skus.slice((currentPage - 1) * 25, currentPage * 25);

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-[#142336] bg-[#071321] shadow-md">
      <table className="w-full table-fixed text-left border-collapse">
        <ShortlistTableHeader />

        <tbody className="divide-y divide-[#101d2c] text-xs text-slate-200">
          {displayedSkus.map((sku) => {
            const isSelected = selectedSkuIds.has(sku.id);
            return (
              <ShortlistTableRow
                key={sku.id}
                sku={sku}
                isSelected={isSelected}
                onToggleSelectRow={onToggleSelectRow}
                onAcquireSku={onAcquireSku}
                onAssignRunner={onAssignRunner}
                onTogglePriority={onTogglePriority}
                onCopyText={onCopyText}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
