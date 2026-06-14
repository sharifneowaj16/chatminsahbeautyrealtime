'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ShoppingBag } from 'lucide-react';
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
  variants?: BuyNowVariantOption[];
  disabled?: boolean;
  className?: string;
}

export default function CardBuyNowButton({
  productId,
  productName,
  productImage,
  price,
  variants,
  disabled = false,
  className = '',
}: CardBuyNowButtonProps) {
  const [isBuyNowOpen, setIsBuyNowOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsBuyNowOpen(true)}
        disabled={disabled}
        className={`flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#3D1F0E] px-4 py-2.5 text-sm font-semibold text-[#F5E6D3] transition-all duration-200 hover:bg-[#2A1509] disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 ${className}`}
      >
        <ShoppingBag size={15} />
        Buy Now
      </button>

      {isBuyNowOpen && (
        <BuyNowModal
          isOpen={isBuyNowOpen}
          productId={productId}
          productName={productName}
          productImage={productImage}
          basePrice={price}
          variants={variants}
          onClose={() => setIsBuyNowOpen(false)}
        />
      )}
    </>
  );
}
