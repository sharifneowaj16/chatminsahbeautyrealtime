'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { BuyNowVariantOption } from './BuyNowModal';

const BuyNowModal = dynamic(() => import('./BuyNowModal'), {
  ssr: false,
  loading: () => null,
});

interface CardBuyNowButtonProps {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  maxStock?: number;
  variants?: BuyNowVariantOption[];
  variantCount?: number;
  variantsFullyLoaded?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function CardBuyNowButton({
  productId,
  productName,
  productImage,
  price,
  maxStock,
  variants,
  variantCount,
  variantsFullyLoaded = true,
  disabled = false,
  className = '',
}: CardBuyNowButtonProps) {
  const [isBuyNowOpen, setIsBuyNowOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="primary"
        fullWidth
        onClick={() => setIsBuyNowOpen(true)}
        disabled={disabled}
        className={`rounded-2xl bg-minsah-dark px-4 py-2.5 text-sm text-minsah-accent hover:bg-minsah-primary disabled:bg-stone-300 disabled:text-stone-500 ${className}`}
      >
        <ShoppingBag size={15} aria-hidden="true" />
        Buy Now
      </Button>

      {isBuyNowOpen && (
        <BuyNowModal
          isOpen={isBuyNowOpen}
          productId={productId}
          productName={productName}
          productImage={productImage}
          basePrice={price}
          baseStock={maxStock}
          variants={variants}
          variantCount={variantCount}
          variantsFullyLoaded={variantsFullyLoaded}
          onClose={() => setIsBuyNowOpen(false)}
        />
      )}
    </>
  );
}
