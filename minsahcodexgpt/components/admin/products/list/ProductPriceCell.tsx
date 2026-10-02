'use client';

import React from 'react';
import Link from 'next/link';
import { formatPrice } from '@/utils/currency';

export interface ProductPriceCellProps {
  price: number;
  originalPrice?: number | null;
  costPrice?: number | null;
  productSlugOrId: string;
}

export function ProductPriceCell({
  price,
  originalPrice,
  costPrice,
  productSlugOrId,
}: ProductPriceCellProps) {
  const hasNoCostPrice = costPrice == null || costPrice <= 0;

  return (
    <div>
      <div className="text-xs font-medium text-[#F7F8F8]">
        {formatPrice(price)}
      </div>

      {originalPrice != null && originalPrice > price && (
        <div className="text-[10px] text-white/40 line-through">
          {formatPrice(originalPrice)}
        </div>
      )}

      {hasNoCostPrice && (
        <Link
          href={`/admin/products/${productSlugOrId}/edit`}
          className="mt-1 inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
          title="Cost price not set. Click to edit."
        >
          ⚠️ No Cost Price
        </Link>
      )}
    </div>
  );
}
