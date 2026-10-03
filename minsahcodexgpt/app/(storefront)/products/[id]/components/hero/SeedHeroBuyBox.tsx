'use client';

import React from 'react';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';
import { createStandardCartItem } from '@/utils/cartItemHelper';
import { useProductOffer } from '@/components/offer/useProductOffer';
import { useSelectedVariant } from '@/components/offer/useSelectedVariant';
import DesktopPriceBlock from '../desktop/DesktopPriceBlock';
import MobilePriceBlock from '../mobile/MobilePriceBlock';
import { cleanProductName } from './cleanProductName';

export interface SeedHeroBuyBoxProps {
  productId: string;
  sku?: string;
  category?: string;
  name: string;
  price?: number;
  compareAtPrice?: number | null;
  shortDescription?: string;
  keyBenefits?: string[];
  rating?: number;
  reviewCount?: number;
  variants?: any[];
  defaultImage?: string;
  galleryImages?: string[];
  onVariantChange?: (variantId: string | null, currentPrice: number, stock: number) => void;
  onImageChange?: (imageUrl: string | null) => void;
  onQuantityChange?: (quantity: number) => void;
  className?: string;
}

export default function SeedHeroBuyBox({
  productId,
  sku,
  category,
  name,
  shortDescription,
  defaultImage = '/images/categories/Skincare.png',
  className = '',
}: SeedHeroBuyBoxProps) {
  const { addItem } = useCart();
  const { openDrawer: openCartDrawer } = useCartDrawer();
  const { offer } = useProductOffer();
  const { selectedVariant, variants } = useSelectedVariant();

  const handleAddToCart = (quantity: number = 1) => {
    if (!offer.canPurchase) return;

    const cartItem = createStandardCartItem({
      product: {
        id: productId,
        name,
        price: offer.effectivePrice,
        image: defaultImage,
        sku,
        stock: offer.availableQuantity,
      },
      variant: selectedVariant
        ? {
            id: selectedVariant.id,
            name: selectedVariant.name,
            price: selectedVariant.offer?.effectivePrice ?? selectedVariant.price,
            image: selectedVariant.image || defaultImage,
            sku: selectedVariant.sku,
            stock: selectedVariant.offer?.availableQuantity ?? selectedVariant.stock ?? 0,
            attributes: selectedVariant.attributes,
          }
        : null,
      availableVariants: variants.length > 0 ? (variants as any[]) : undefined,
      quantity,
    });

    addItem(cartItem);
    openCartDrawer();
  };

  return (
    <div className={`w-full flex flex-col font-sans ${className}`}>
      {/* 1. BRAND / SKU PILL */}
      {(sku || category) && (
        <div className="mb-2">
          <span className="inline-flex items-center rounded-full border border-[#1c3a13]/25 dark:border-emerald-400/50 bg-[#1c3a13]/5 dark:bg-emerald-950/20 px-2.5 py-0.5 text-xs lg:text-[13px] font-medium tracking-wide text-[#1c3a13] dark:text-emerald-300 select-none">
            {sku ? `SKU: ${sku}` : category}
          </span>
        </div>
      )}

      {/* 2. PRODUCT TITLE H1 */}
      <h1 className="text-[26px] md:text-[28px] lg:text-[32px] font-medium leading-[1.15] tracking-tight text-[#1c3a13] dark:text-white mb-2.5">
        {cleanProductName(name)}
      </h1>

      {/* 3. VALUE PITCH */}
      {shortDescription && (
        <p className="text-sm md:text-[15px] lg:text-base leading-[1.45] text-[#1c3a13]/85 dark:text-stone-300 mb-4 lg:mb-5">
          {shortDescription}
        </p>
      )}

      {/* 4. DESKTOP COLUMN (hidden lg:block) */}
      <div className="hidden lg:block mb-4">
        <DesktopPriceBlock onAddToCart={handleAddToCart} />
      </div>

      {/* 5. MOBILE COLUMN (lg:hidden) */}
      <div className="lg:hidden mb-4">
        <MobilePriceBlock onAddToCart={handleAddToCart} />
      </div>
    </div>
  );
}
