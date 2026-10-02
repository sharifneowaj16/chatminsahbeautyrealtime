'use client';

import React from 'react';

export interface ProductVariantOption {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  attributes?: Record<string, string>;
  image?: string;
}

export interface ProductVariantSelectorProps {
  variants: ProductVariantOption[];
  selectedVariantId?: string | null;
  onSelect: (variant: ProductVariantOption) => void;
  disabled?: boolean;
  className?: string;
}

export function formatVariantLabel(variant: ProductVariantOption): string {
  const attrs = variant.attributes;
  if (!attrs || Object.keys(attrs).length === 0) return variant.name || variant.sku;
  return Object.entries(attrs)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' / ');
}

export const ProductVariantSelector: React.FC<ProductVariantSelectorProps> = ({
  variants,
  selectedVariantId,
  onSelect,
  disabled = false,
  className = '',
}) => {
  if (!variants || variants.length === 0) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = variants.find((v) => v.id === e.target.value);
    if (found) {
      onSelect(found);
    }
  };

  return (
    <div className={`inline-block ${className}`}>
      <select
        value={selectedVariantId || ''}
        disabled={disabled}
        onChange={handleChange}
        className="h-8 px-2.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500 font-medium"
      >
        <option value="" disabled>
          Select Variant / Shade / Size
        </option>
        {variants.map((v) => {
          const label = formatVariantLabel(v);
          const isOOS = v.stock <= 0;
          return (
            <option key={v.id} value={v.id} disabled={isOOS}>
              {label} {isOOS ? '(Out of Stock)' : `(Stock: ${v.stock})`} • ৳{v.price}
            </option>
          );
        })}
      </select>
    </div>
  );
};

export default ProductVariantSelector;
