'use client';

import React from 'react';
import { PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ProductTableEmptyStateProps {
  message?: string;
  onResetFilters?: () => void;
}

export function ProductTableEmptyState({
  message = 'No products found matching your criteria.',
  onResetFilters,
}: ProductTableEmptyStateProps) {
  return (
    <div className="text-center py-14 px-4 flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-[#232636] flex items-center justify-center mb-3">
        <PackageOpen className="w-6 h-6 text-white/40" />
      </div>
      <p className="text-xs text-white/50 max-w-sm mb-3">{message}</p>
      {onResetFilters && (
        <Button
          type="button"
          onClick={onResetFilters}
          className="h-7 px-3 text-xs bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.15] rounded-md transition-all"
        >
          Reset Filters
        </Button>
      )}
    </div>
  );
}
