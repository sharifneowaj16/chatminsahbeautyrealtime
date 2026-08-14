'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { BuyNowVariantOption } from './BuyNowModal';
import CartStepper from './CartStepper';

const BuyNowModal = dynamic(() => import('./BuyNowModal'), {
  ssr: false,
  loading: () => null,
});

interface CardBuyNowActionRowProps {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  maxStock?: number;
  hasRequiredVariants?: boolean;
  variants?: BuyNowVariantOption[];
  disabled?: boolean;
  className?: string;
  stepperClassName?: string;
  buttonClassName?: string;
  circleCart?: boolean;
}

export default function CardBuyNowActionRow({
  productId,
  productName,
  productImage,
  price,
  maxStock = 99,
  hasRequiredVariants = false,
  variants,
  disabled = false,
  className = '',
  stepperClassName,
  buttonClassName = '',
  circleCart = false,
}: CardBuyNowActionRowProps) {
  const [isBuyNowOpen, setIsBuyNowOpen] = useState(false);

  const canPurchase = variants?.length ? variants.some((variant) => variant.stock > 0) : maxStock > 0;
  const isDisabled = disabled || !canPurchase;
  const resolvedStepperClassName = stepperClassName ?? (circleCart ? 'shrink-0' : 'flex-1');

  return (
    <>
      <div className={`flex gap-2 ${className}`}>
        <CartStepper
          productId={productId}
          productName={productName}
          productImage={productImage}
          price={price}
          maxStock={maxStock}
          hasRequiredVariants={hasRequiredVariants}
          variants={variants}
          className={resolvedStepperClassName}
          disabled={isDisabled}
          circleAdd={circleCart}
        />

        <Button
          type="button"
          variant="primary"
          onClick={() => setIsBuyNowOpen(true)}
          disabled={isDisabled}
          className={`min-w-[104px] rounded-2xl bg-minsah-dark px-4 py-3 text-sm text-minsah-accent hover:bg-minsah-primary disabled:bg-stone-300 disabled:text-stone-500 ${buttonClassName}`}
        >
          <ShoppingBag size={15} aria-hidden="true" />
          Buy Now
        </Button>
      </div>

      {isBuyNowOpen && (
        <BuyNowModal
          isOpen={isBuyNowOpen}
          productId={productId}
          productName={productName}
          productImage={productImage}
          basePrice={price}
          baseStock={maxStock}
          variants={variants}
          onClose={() => setIsBuyNowOpen(false)}
        />
      )}
    </>
  );
}
