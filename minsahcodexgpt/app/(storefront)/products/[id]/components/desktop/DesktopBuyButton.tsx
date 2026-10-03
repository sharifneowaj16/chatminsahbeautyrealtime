'use client';

import React, { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useProductOffer } from '@/components/offer/useProductOffer';

export interface DesktopBuyButtonProps {
  onAddToCart?: (quantity: number) => void;
  className?: string;
}

export function DesktopBuyButton({ onAddToCart, className = '' }: DesktopBuyButtonProps) {
  const { offer } = useProductOffer();
  const [quantity, setQuantity] = useState(1);

  const increase = () => {
    setQuantity((prev) => (offer.availableQuantity ? Math.min(prev + 1, offer.availableQuantity) : prev + 1));
  };
  const decrease = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleAction = () => {
    if (!offer.canPurchase) return;
    onAddToCart?.(quantity);
  };

  const totalPrice = Math.round(offer.effectivePrice * quantity);

  return (
    <div className={`flex items-center gap-2.5 mb-3 ${className}`}>
      {offer.canPurchase && (
        <div className="flex items-center rounded-full border border-[#1c3a13]/20 dark:border-white/20 bg-white dark:bg-zinc-800 px-2 h-[54px] shrink-0">
          <button
            type="button"
            onClick={decrease}
            aria-label="Decrease quantity"
            className="flex h-7 w-7 items-center justify-center text-sm font-bold text-[#1c3a13] dark:text-white hover:opacity-70 active:scale-90"
          >
            −
          </button>
          <span className="w-8 text-center font-mono text-sm font-bold text-[#1c3a13] dark:text-white">
            {quantity}
          </span>
          <button
            type="button"
            onClick={increase}
            aria-label="Increase quantity"
            className="flex h-7 w-7 items-center justify-center text-sm font-bold text-[#1c3a13] dark:text-white hover:opacity-70 active:scale-90"
          >
            +
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleAction}
        disabled={!offer.canPurchase}
        className={`flex-1 h-[54px] rounded-full text-base font-semibold tracking-tight transition-all flex items-center justify-center gap-2 shadow-md ${
          offer.canPurchase
            ? 'bg-[#1c3a13] hover:bg-[#15300f] text-white active:scale-[0.99] dark:bg-emerald-600 dark:hover:bg-emerald-500'
            : 'bg-stone-200 text-stone-500 cursor-not-allowed dark:bg-zinc-700 dark:text-stone-400'
        }`}
      >
        <ShoppingBag size={18} className="shrink-0" />
        <span>
          {offer.canPurchase
            ? offer.availability === 'preorder'
              ? `Pre-order Now • ৳${totalPrice.toLocaleString()}`
              : `Add to Cart • ৳${totalPrice.toLocaleString()}`
            : 'Out of Stock'}
        </span>
      </button>
    </div>
  );
}

export default DesktopBuyButton;
