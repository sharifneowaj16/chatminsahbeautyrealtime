'use client';

import React from 'react';
import { Package } from 'lucide-react';
import { ProductFormCardContainer } from '../common/ProductFormCardContainer';

export interface ProductBasicInfoCardProps {
  children: React.ReactNode;
}

export function ProductBasicInfoCard({ children }: ProductBasicInfoCardProps) {
  return (
    <ProductFormCardContainer
      icon={Package}
      title="Basic Information"
      subtitle="Define product title, taxonomy category, brand, and core descriptions"
    >
      <div className="space-y-4">{children}</div>
    </ProductFormCardContainer>
  );
}
