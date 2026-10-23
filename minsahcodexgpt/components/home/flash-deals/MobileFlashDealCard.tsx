'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { FlashDealItem } from './types';
import MobileDealThumbnail from './MobileDealThumbnail';
import MobileDealInfo from './MobileDealInfo';
import MobileDealPricingRow from './MobileDealPricingRow';
import SeedHeroVariantDropdown, { type ProductVariantItem } from '@/app/(storefront)/products/[id]/components/hero/SeedHeroVariantDropdown';
import { useCart, type CartItem } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';

interface MobileFlashDealCardProps {
  deal: FlashDealItem;
  className?: string;
}

export default function MobileFlashDealCard({
  deal,
  className = '',
}: MobileFlashDealCardProps) {
  const productHref = deal.slug ? `/products/${deal.slug}` : `/products/${deal.productId}`;
  const { addItem } = useCart();
  const { registerAddIntent, openForSuccessfulAdd } = useCartDrawer();
  const [isAdding, setIsAdding] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const hasVariants = Boolean(Array.isArray(deal.variants) && deal.variants.length > 1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    hasVariants && deal.variants ? deal.variants[0]?.id : null
  );
  const [currentPrice, setCurrentPrice] = useState<number>(deal.salePrice);
  const [currentImage, setCurrentImage] = useState<string>(deal.imageUrl);

  const handleVariantChange = (variantId: string | null, price: number) => {
    setSelectedVariantId(variantId);
    if (price) setCurrentPrice(price);
  };

  const handleImageChange = (imgUrl: string | null) => {
    if (imgUrl) setCurrentImage(imgUrl);
  };

  const handleClaimOffer = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdding) return;

    setIsAdding(true);
    try {
      const drawerIntentId = registerAddIntent();
      const cartItem: CartItem = {
        id: deal.productId || deal.id,
        productId: deal.productId || deal.id,
        name: deal.title,
        price: currentPrice || deal.salePrice,
        quantity: 1,
        image: currentImage || deal.imageUrl || '',
      };

      const success = await addItem(cartItem);
      if (success) {
        openForSuccessfulAdd(drawerIntentId, cartItem, 1);
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Failed to claim flash deal on mobile:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleSelectVariantAddToCart = async (selectedVar: ProductVariantItem) => {
    setSelectedVariantId(selectedVar.id);
    if (selectedVar.image) setCurrentImage(selectedVar.image);
    if (selectedVar.price) setCurrentPrice(selectedVar.price);

    try {
      const drawerIntentId = registerAddIntent();
      const cartItem: CartItem = {
        id: selectedVar.id || deal.productId || deal.id,
        productId: deal.productId || deal.id,
        variantId: selectedVar.id,
        name: `${deal.title} - ${selectedVar.name}`,
        variantName: selectedVar.name,
        price: selectedVar.price || deal.salePrice,
        quantity: 1,
        image: selectedVar.image || deal.imageUrl || '',
        variantImage: selectedVar.image || deal.imageUrl || '',
        sku: selectedVar.sku,
        variantSku: selectedVar.sku,
        stock: selectedVar.stock,
        availableVariants: deal.variants,
      };

      const success = await addItem(cartItem);
      if (success) {
        openForSuccessfulAdd(drawerIntentId, cartItem, 1);
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Failed to claim flash deal variant on mobile:', err);
    }
  };

  return (
    <article
      className={`relative w-full rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 p-2.5 sm:p-3 shadow-xs flex flex-col gap-2 ${className}`}
    >
      {/* Clickable Card Body: Navigates to Product Page */}
      <Link
        href={productHref}
        className="flex gap-2.5 sm:gap-3 items-center focus:outline-none"
        title={`View ${deal.title}`}
      >
        {/* Thumbnail */}
        <MobileDealThumbnail
          imageUrl={currentImage || deal.imageUrl}
          title={deal.title}
          discountBadge={deal.discountBadge}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <MobileDealInfo
            title={deal.title}
            subtitle={deal.subtitle}
            urgencyText={deal.stockUrgencyText}
          />
        </div>
      </Link>

      {/* Action Row: SeedHeroVariantDropdown with Node Connector Modal OR Direct Claim Button */}
      {hasVariants && deal.variants ? (
        <div className="w-full pt-1" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between text-xs mb-1 px-1">
            <span className="font-extrabold text-stone-900 dark:text-white">
              ৳{(currentPrice || deal.salePrice).toLocaleString()}
            </span>
            {deal.originalPrice && deal.originalPrice > (currentPrice || deal.salePrice) && (
              <span className="text-[10px] text-stone-400 line-through">
                ৳{deal.originalPrice.toLocaleString()}
              </span>
            )}
          </div>
          <SeedHeroVariantDropdown
            variants={deal.variants}
            selectedVariantId={selectedVariantId}
            defaultImage={deal.imageUrl}
            compact
            layout="grid"
            onVariantChange={handleVariantChange}
            onImageChange={handleImageChange}
            onSelectVariant={handleSelectVariantAddToCart}
          />
        </div>
      ) : (
        <MobileDealPricingRow
          salePrice={currentPrice || deal.salePrice}
          originalPrice={deal.originalPrice}
          claimedPercentage={deal.claimedPercentage}
          onClaim={handleClaimOffer}
          isLoading={isAdding}
          isSuccess={isSuccess}
        />
      )}
    </article>
  );
}
