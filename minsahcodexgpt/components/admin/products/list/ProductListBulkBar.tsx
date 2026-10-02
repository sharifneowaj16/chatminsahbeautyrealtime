'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';

export interface ProductListBulkBarProps {
  selectedCount: number;
  onClear: () => void;
  onBulkDelete: () => void;
  canDelete?: boolean;
}

export function ProductListBulkBar({
  selectedCount,
  onClear,
  onBulkDelete,
  canDelete = true,
}: ProductListBulkBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="linear-card bg-white/[0.04] border border-white/[0.12] rounded-lg p-3 mb-4 flex items-center justify-between animate-fadeIn">
      <span className="text-xs font-medium text-white/80">
        {selectedCount} product{selectedCount > 1 ? 's' : ''} selected
      </span>
      <div className="flex items-center space-x-2">
        <Button
          type="button"
          onClick={onClear}
          className="h-7 px-3.5 text-xs text-white/60 hover:text-white rounded-md bg-transparent hover:bg-white/[0.06] transition-all"
        >
          Clear
        </Button>
        {canDelete && (
          <Button
            type="button"
            onClick={onBulkDelete}
            className="h-7 px-4 text-xs font-medium bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.15] rounded-md active:scale-[0.97] transition-all"
          >
            Delete Selected
          </Button>
        )}
      </div>
    </div>
  );
}
