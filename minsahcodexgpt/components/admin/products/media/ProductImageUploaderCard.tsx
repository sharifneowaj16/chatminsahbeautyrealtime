'use client';

import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { ProductFormCardContainer } from '../common/ProductFormCardContainer';

export interface ProductImageUploaderCardProps {
  children: React.ReactNode;
  imageCount?: number;
}

export function ProductImageUploaderCard({
  children,
  imageCount,
}: ProductImageUploaderCardProps) {
  return (
    <ProductFormCardContainer
      icon={ImageIcon}
      title="Product Images"
      subtitle="Max 10MB per image. First/main image is the primary catalog display image."
      badge={
        typeof imageCount === 'number' ? (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.08] text-white/80 border border-white/[0.12]">
            {imageCount} uploaded
          </span>
        ) : undefined
      }
    >
      <div className="space-y-4">{children}</div>
    </ProductFormCardContainer>
  );
}
