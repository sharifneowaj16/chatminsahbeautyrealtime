'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { ProductFormCardContainer } from '../common/ProductFormCardContainer';

export interface ProductSeoSettingsCardProps {
  children: React.ReactNode;
}

export function ProductSeoSettingsCard({ children }: ProductSeoSettingsCardProps) {
  return (
    <ProductFormCardContainer
      icon={Search}
      title="SEO & Metadata Settings"
      subtitle="Meta titles, search descriptions, SERP snippet optimization, and social graph sharing"
    >
      <div className="space-y-4">{children}</div>
    </ProductFormCardContainer>
  );
}
