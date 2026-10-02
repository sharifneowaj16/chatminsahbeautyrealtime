'use client';

import React from 'react';
import { Tag, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProductFormCardContainer } from '../common/ProductFormCardContainer';

export interface ProductVariantMatrixCardProps {
  onAddVariant: () => void;
  aiApplied?: boolean;
  variantCount?: number;
  children: React.ReactNode;
}

export function ProductVariantMatrixCard({
  onAddVariant,
  aiApplied = false,
  variantCount = 0,
  children,
}: ProductVariantMatrixCardProps) {
  return (
    <ProductFormCardContainer
      icon={Tag}
      title="Product Variants"
      subtitle="Size, color, price, and stock inventory per variant"
      badge={
        variantCount > 0 ? (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.08] text-white/80 border border-white/[0.12]">
            {variantCount} variant{variantCount === 1 ? '' : 's'}
          </span>
        ) : undefined
      }
      actions={
        <Button
          type="button"
          onClick={onAddVariant}
          className="inline-flex items-center px-3.5 py-1.5 bg-[#5e6ad2] hover:bg-[#525ec2] text-white text-xs font-medium rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] active:scale-[0.97] transition-all"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Variant
        </Button>
      }
    >
      {aiApplied && (
        <div className="mb-4 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Price fields are intentionally blank — enter your selling prices below.
        </div>
      )}

      <div className="space-y-3">{children}</div>
    </ProductFormCardContainer>
  );
}
