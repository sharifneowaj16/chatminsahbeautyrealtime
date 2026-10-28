'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { FlashDealItem } from './types';
import DesktopDealMedia from './DesktopDealMedia';
import DesktopDealContent from './DesktopDealContent';
import DesktopDealPricing from './DesktopDealPricing';
import DesktopDealStockStatus from './DesktopDealStockStatus';
import DesktopDealProgressBar from './DesktopDealProgressBar';
import DesktopClaimButton from './DesktopClaimButton';
import SeedHeroVariantDropdown, { type ProductVariantItem } from '@/app/(storefront)/products/[id]/components/hero/SeedHeroVariantDropdown';
import { useCart, type CartItem } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';

interface DesktopFlashDealCardProps {
  deal: FlashDealItem;
  className?: string;
}

export default function DesktopFlashDealCard({
  deal,
  className = '',
}: DesktopFlashDealCardProps) {
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
      console.error('Failed to claim flash deal:', err);
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
      console.error('Failed to claim flash deal variant:', err);
    }
  };

  return (
    <article
      className={`relative w-full rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 p-3 sm:p-3.5 shadow-xs flex flex-col justify-between group hover:-translate-y-1 hover:shadow-md transition-all duration-300 ${className}`}
    >
      {/* Clickable Card Body: Navigates directly to Product Details Page */}
      <Link
        href={productHref}
        className="block cursor-pointer focus:outline-none"
        title={`View ${deal.title}`}
      >
        <div>
          {/* Media & Badges */}
          <DesktopDealMedia
            imageUrl={currentImage || deal.imageUrl}
            title={deal.title}
            discountBadge={deal.discountBadge}
            rating={deal.rating}
            ratingCount={deal.ratingCount}
          />

          {/* Title and Subtitle (Strict: No brand/feature tags) */}
          <DesktopDealContent
            title={deal.title}
            subtitle={deal.subtitle}
          />
        </div>

        <div className="mt-2">
          {/* Pricing */}
          <DesktopDealPricing
            salePrice={currentPrice || deal.salePrice}
            originalPrice={deal.originalPrice}
          />

          {/* Stock Status & Progress Bar */}
          <DesktopDealStockStatus
            urgencyText={deal.stockUrgencyText}
            claimedPercentage={deal.claimedPercentage}
          />
          <DesktopDealProgressBar
            percentage={deal.claimedPercentage}
          />
        </div>
      </Link>

      {/* Action Slot: SeedHeroVariantDropdown with Node Connector Modal OR Direct Claim Button */}
      <div className="mt-2.5">
        {hasVariants && deal.variants ? (
          <div
            className="relative w-full cursor-pointer touch-manipulation"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <SeedHeroVariantDropdown
              variants={deal.variants}
              selectedVariantId={selectedVariantId}
              defaultImage={deal.imageUrl}
              compact
              layout="list"
              onVariantChange={handleVariantChange}
              onImageChange={handleImageChange}
              onSelectVariant={handleSelectVariantAddToCart}
            />
          </div>
        ) : (
          <DesktopClaimButton
            onClick={handleClaimOffer}
            isLoading={isAdding}
            isSuccess={isSuccess}
          />
        )}
      </div>
    </article>
  );
}
