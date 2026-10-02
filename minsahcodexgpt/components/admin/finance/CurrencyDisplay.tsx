'use client';

import React from 'react';
import { formatPrice } from '@/utils/currency';

export interface CurrencyDisplayProps {
  amount: number | string | null | undefined;
  originalAmount?: number | string | null | undefined;
  showDiscountBadge?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  symbolColor?: string;
}

const SIZE_CLASSES = {
  xs: 'text-xs',
  sm: 'text-sm font-medium',
  md: 'text-base font-semibold',
  lg: 'text-lg font-bold',
  xl: 'text-2xl font-extrabold tracking-tight',
};

const ORIGINAL_SIZE_CLASSES = {
  xs: 'text-[10px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
};

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  originalAmount,
  showDiscountBadge = true,
  size = 'md',
  className = '',
  symbolColor,
}) => {
  const numericAmount = typeof amount === 'number' ? amount : Number(amount) || 0;
  const formatted = formatPrice(numericAmount);

  const numericOriginal =
    originalAmount !== undefined && originalAmount !== null
      ? typeof originalAmount === 'number'
        ? originalAmount
        : Number(originalAmount) || 0
      : null;

  const hasDiscount = numericOriginal !== null && numericOriginal > numericAmount;
  const discountPercent = hasDiscount
    ? Math.round(((numericOriginal - numericAmount) / numericOriginal) * 100)
    : 0;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`${SIZE_CLASSES[size]} text-white tabular-nums ${symbolColor || ''}`}>
        {formatted}
      </span>

      {hasDiscount && (
        <span
          className={`${ORIGINAL_SIZE_CLASSES[size]} text-slate-500 line-through tabular-nums font-normal`}
        >
          {formatPrice(numericOriginal)}
        </span>
      )}

      {hasDiscount && showDiscountBadge && discountPercent > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          -{discountPercent}%
        </span>
      )}
    </span>
  );
};

export default CurrencyDisplay;
