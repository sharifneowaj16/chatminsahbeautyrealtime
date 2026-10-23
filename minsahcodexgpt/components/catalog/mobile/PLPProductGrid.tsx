'use client';

import React from 'react';
import type { PLPProduct, PLPLayoutView } from './types';
import PLPProductCard from './PLPProductCard';

interface PLPProductGridProps {
  products: PLPProduct[];
  layout: PLPLayoutView;
  onAddToCart?: (product: PLPProduct) => void;
  onToggleWishlist?: (product: PLPProduct, isLiked: boolean) => void;
}

export default function PLPProductGrid({
  products,
  layout,
  onAddToCart,
  onToggleWishlist,
}: PLPProductGridProps) {
  return (
    <section
      aria-label="Curated Product Listing"
      className={`px-4 pb-6 transition-all duration-200 ${
        layout === 'grid'
          ? 'grid grid-cols-2 gap-3'
          : 'flex flex-col gap-3'
      }`}
    >
      {products.map((product) => (
        <PLPProductCard
          key={product.id}
          product={product}
          layout={layout}
          onAddToCart={onAddToCart}
          onToggleWishlist={onToggleWishlist}
        />
      ))}
    </section>
  );
}
