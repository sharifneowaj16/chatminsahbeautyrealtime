'use client';

import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useProductOffer } from '@/components/offer/useProductOffer';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';
import { createStandardCartItem } from '@/utils/cartItemHelper';
import { useSelectedVariant } from '@/components/offer/useSelectedVariant';

export interface MobileStickyPriceBarProps {
  product: {
    id: string;
    name: string;
    image: string;
    sku?: string | null;
  };
  className?: string;
}

export function MobileStickyPriceBar({ product, className = '' }: MobileStickyPriceBarProps) {
  const { offer } = useProductOffer();
  const { selectedVariant, variants } = useSelectedVariant();
  const { addItem } = useCart();
  const { openDrawer: openCartDrawer } = useCartDrawer();

  const handleAddToCart = () => {
    if (!offer.canPurchase) return;

    const cartItem = createStandardCartItem({
      product: {
        id: product.id,
        name: product.name,
        price: offer.effectivePrice,
        image: product.image,
        sku: product.sku || undefined,
        stock: offer.availableQuantity,
      },
      variant: selectedVariant
        ? {
            id: selectedVariant.id,
            name: selectedVariant.name,
            price: selectedVariant.offer?.effectivePrice ?? selectedVariant.price,
            image: selectedVariant.image || product.image,
            sku: selectedVariant.sku,
            stock: selectedVariant.offer?.availableQuantity ?? selectedVariant.stock ?? 0,
            attributes: selectedVariant.attributes,
          }
        : null,
      availableVariants: variants.length > 0 ? (variants as any[]) : undefined,
      quantity: 1,
    });

    addItem(cartItem);
    openCartDrawer();
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-stone-200/80 dark:border-zinc-800 px-4 py-2.5 pb-[calc(10px+env(safe-area-inset-bottom,0px))] flex items-center justify-between gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] ${className}`}
    >
      <div className="flex flex-col">
        <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">Total</span>
        <div className="flex items-baseline gap-1.5">
          <span className="font-inter font-bold text-lg text-[#1c3a13] dark:text-white leading-tight">
            ৳{Math.round(offer.effectivePrice).toLocaleString()}
          </span>
          {offer.compareAtPrice && offer.compareAtPrice > offer.effectivePrice && (
            <span className="text-xs text-stone-400 line-through">
              ৳{Math.round(offer.compareAtPrice).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={!offer.canPurchase}
        className={`flex-1 max-w-[200px] h-11 rounded-full text-sm font-semibold tracking-tight transition-all flex items-center justify-center gap-1.5 shadow-md ${
          offer.canPurchase
            ? 'bg-[#1c3a13] text-white active:scale-95 dark:bg-emerald-600'
            : 'bg-stone-200 text-stone-500 cursor-not-allowed dark:bg-zinc-700 dark:text-stone-400'
        }`}
      >
        <ShoppingBag size={16} className="shrink-0" />
        <span>{offer.canPurchase ? 'Add to Bag' : 'Sold Out'}</span>
      </button>
    </div>
  );
}

export default MobileStickyPriceBar;
