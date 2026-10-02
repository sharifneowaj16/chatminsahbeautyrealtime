'use client';

import React from 'react';
import { Truck } from 'lucide-react';
import { ProductFormCardContainer } from '../common/ProductFormCardContainer';

export interface ProductShippingCardProps {
  children: React.ReactNode;
}

export function ProductShippingCard({ children }: ProductShippingCardProps) {
  return (
    <ProductFormCardContainer
      icon={Truck}
      title="Shipping & Delivery Specifications"
      subtitle="Weight, packaging dimensions, fragile goods status, and customer delivery offers"
    >
      <div className="space-y-4">{children}</div>
    </ProductFormCardContainer>
  );
}
