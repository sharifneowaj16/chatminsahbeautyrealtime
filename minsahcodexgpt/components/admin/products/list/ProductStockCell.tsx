'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface ProductStockCellProps {
  stock: number;
  variantCount?: number;
}

export function ProductStockCell({ stock, variantCount = 0 }: ProductStockCellProps) {
  const getStockColor = (s: number) => {
    if (s === 0) return 'text-white/40 font-normal';
    if (s < 20) return 'text-amber-400/90 font-medium';
    return 'text-white font-medium';
  };

  return (
    <div>
      <div className={clsx('text-xs', getStockColor(stock))}>
        {stock} units
      </div>
      {variantCount > 0 && (
        <div className="text-[10px] text-white/40 mt-0.5">
          {variantCount} variant{variantCount === 1 ? '' : 's'}
        </div>
      )}
    </div>
  );
}
