'use client';

import React from 'react';
import { Package, Tag } from 'lucide-react';
import { formatPrice } from '@/utils/currency';

export interface ProductImportPreviewCardProps {
  name: string;
  category: string;
  brand: string;
  price: number;
  variantCount: number;
  image?: string;
  onRemove?: () => void;
}

export function ProductImportPreviewCard({
  name,
  category,
  brand,
  price,
  variantCount,
  image,
  onRemove,
}: ProductImportPreviewCardProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-[#232636] bg-[#10121b] hover:bg-[#131522] transition-colors">
      <div className="flex items-center space-x-3 min-w-0">
        <div className="w-10 h-10 rounded-md bg-[#161824] border border-[#232636] flex items-center justify-center overflow-hidden shrink-0">
          {image ? (
            <img src={image} alt={name} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-4 h-4 text-white/30" />
          )}
        </div>

        <div className="min-w-0">
          <h4 className="text-xs font-semibold text-[#F7F8F8] truncate max-w-sm sm:max-w-md">
            {name || 'Untitled Product'}
          </h4>
          <div className="flex items-center gap-2 text-[10px] text-white/40 mt-0.5">
            <span>{brand || 'No Brand'}</span>
            <span>•</span>
            <span>{category || 'Uncategorized'}</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-white/60">
              <Tag className="w-3 h-3" />
              {variantCount} variant{variantCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3 shrink-0 ml-3">
        <span className="text-xs font-bold text-[#F7F8F8]">{formatPrice(price)}</span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-white/40 hover:text-rose-400 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
