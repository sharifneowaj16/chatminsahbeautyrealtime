'use client';

import React from 'react';
import { ProductImportPreviewCard } from './ProductImportPreviewCard';

export interface ParsedProductSummary {
  id?: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  variantCount: number;
  image?: string;
}

export interface ProductImportPreviewListProps {
  products: ParsedProductSummary[];
  onRemoveItem?: (index: number) => void;
}

export function ProductImportPreviewList({
  products,
  onRemoveItem,
}: ProductImportPreviewListProps) {
  if (products.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-white/50 px-1">
        <span>Ready to Import ({products.length} items)</span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {products.map((prod, index) => (
          <ProductImportPreviewCard
            key={prod.id || index}
            name={prod.name}
            category={prod.category}
            brand={prod.brand}
            price={prod.price}
            variantCount={prod.variantCount}
            image={prod.image}
            onRemove={onRemoveItem ? () => onRemoveItem(index) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
