'use client';

import React from 'react';
import { Settings } from 'lucide-react';
import { ProductFormCardContainer } from '../common/ProductFormCardContainer';

export interface ProductSpecificationsCardProps {
  children: React.ReactNode;
}

export function ProductSpecificationsCard({ children }: ProductSpecificationsCardProps) {
  return (
    <ProductFormCardContainer
      icon={Settings}
      title="Product Specifications"
      subtitle="Weight, skin type compatibility, condition, GTIN, and formula ingredients"
    >
      <div className="space-y-4">{children}</div>
    </ProductFormCardContainer>
  );
}
