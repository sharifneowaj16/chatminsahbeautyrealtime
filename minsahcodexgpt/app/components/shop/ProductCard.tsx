'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Zap, Plus, Star, Sparkles } from 'lucide-react';
import { Product } from '@/types/product';
import { formatPrice } from '@/lib/shopUtils';
import { productPath } from '@/lib/product-url';
import dynamic from 'next/dynamic';
import type { BuyNowVariantOption } from '@/components/cart/BuyNowModal';
import { trackShopBuyNowClick, trackShopSelectItem, trackShopWishlistAdd } from '@/lib/tracking/shop-events';
import CatalogProductImage from '@/components/catalog/CatalogProductImage';
import SeedHeroVariantDropdown, { type ProductVariantItem } from '@/app/(storefront)/products/[id]/components/hero/SeedHeroVariantDropdown';
import ProductRatingPopover from '@/app/components/shop/ProductRatingPopover';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';
import { createStandardCartItem } from '@/utils/cartItemHelper';

const BuyNowModal = dynamic(() => import('@/components/cart/BuyNowModal'), {
  ssr: false,
  loading: () => null,
});

export interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
  index?: number;
  listName?: string;
  layout?: 'grid' | 'list';
}

export default function ProductCard({
  product,
  onQuickView,
  index,
  listName = 'Shop Product Grid',
  layout = 'grid',
}: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isBuyNowOpen, setIsBuyNowOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRatingPopoverOpen, setIsRatingPopoverOpen] = useState(false);

  const { addItem } = useCart();
  const { openDrawer: openCartDrawer } = useCartDrawer();

  const dropdownVariants: ProductVariantItem[] = useMemo(() => {
    if (!product.variants || product.variants.length === 0) return [];
    return product.variants.map((v) => {
      const optionKey = (v.option || 'shade').toLowerCase();
      const optionVal = v.value || v.name;
      const attributes = v.option && v.value
        ? { [optionKey]: optionVal }
        : { shade: v.name };

      return {
        id: v.id,
        sku: v.sku || '',
        name: v.name || v.value || 'Default',
        price: Number(v.price ?? product.price),
        stock: Number(v.stock ?? 100),
        attributes,
        image: v.image || null,
      };
    });
  }, [product.variants, product.price]);

  const hasVariants = dropdownVariants.length > 1;

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    dropdownVariants[0]?.id || null
  );
  const [currentPrice, setCurrentPrice] = useState<number>(product.price);
  const [currentImage, setCurrentImage] = useState<string>(product.image);

  const productImages: string[] = useMemo(() => {
    const list: string[] = [];
    if (currentImage) list.push(currentImage);
    if (Array.isArray(product.images) && product.images.length > 0) {
      product.images.forEach((img) => {
        const url = typeof img === 'string' ? img : (img as any)?.url;
        if (url && !list.includes(url)) list.push(url);
      });
    }
    if (list.length === 0 && product.image) list.push(product.image);
    return list.length > 0 ? list : ['/images/placeholder.png'];
  }, [currentImage, product.images, product.image]);

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const displayedImage = productImages[activeImageIdx] || currentImage || product.image;

  const handleVariantChange = (variantId: string | null, price: number) => {
    setSelectedVariantId(variantId);
    if (price) setCurrentPrice(price);
  };

  const handleImageChange = (imgUrl: string | null) => {
    if (imgUrl) {
      setCurrentImage(imgUrl);
      setActiveImageIdx(0);
    }
  };

  const handleSelectVariantAddToCart = (selectedVar: ProductVariantItem) => {
    setSelectedVariantId(selectedVar.id);
    setCurrentPrice(selectedVar.price);
    if (selectedVar.image) {
      setCurrentImage(selectedVar.image);
      setActiveImageIdx(0);
    }

    const cartItem = createStandardCartItem({
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        sku: product.sku,
        stock: product.stock,
      },
      variant: {
        id: selectedVar.id,
        name: selectedVar.name,
        price: selectedVar.price,
        image: selectedVar.image || product.image,
        sku: selectedVar.sku,
        stock: selectedVar.stock,
        attributes: selectedVar.attributes,
      },
      availableVariants: dropdownVariants,
      quantity: 1,
    });

    addItem(cartItem);
    openCartDrawer();
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted((current) => {
      const next = !current;
      if (next) trackShopWishlistAdd(product, index, listName);
      return next;
    });
  };

  const handleProductSelect = () => {
    trackShopSelectItem(product, index, listName);
  };

  const handleBuyNowClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    trackShopBuyNowClick(product, index, listName);
    setIsBuyNowOpen(true);
  };

  const handleAddButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (hasVariants) {
      const activeVar = dropdownVariants.find((v) => v.id === selectedVariantId) || dropdownVariants[0];
      if (activeVar) {
        handleSelectVariantAddToCart(activeVar);
        return;
      }
    }

    handleBuyNowClick(e);
  };

  const variantOptions: BuyNowVariantOption[] | undefined = product.variants?.map((variant) => ({
    id: variant.id,
    name: variant.name,
    price: variant.price,
    stock: variant.stock,
    image: variant.image ?? null,
    sku: variant.sku ?? null,
    attributes:
      variant.option && variant.value
        ? { [variant.option.toLowerCase()]: variant.value }
        : {},
  }));

  const isDisabled = (product.stock !== undefined && product.stock <= 0) || product.inStock === false;
  const hasDiscount = product.discount && product.discount > 0;
  const discountPercent = product.discount || 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. LIST VIEW CARD (Horizontal Arogga layout)
  // ─────────────────────────────────────────────────────────────────────────────
  if (layout === 'list') {
    return (
      <>
        <article
          className={`group relative flex flex-col sm:flex-row items-stretch rounded-[28px] border border-stone-200/80 bg-white p-3.5 sm:p-4 shadow-xs hover:border-[#1c3a13]/25 hover:shadow-lg transition-all duration-300 font-sans ${
            isDropdownOpen || isRatingPopoverOpen ? 'z-50 shadow-2xl ring-1 ring-stone-200/80' : 'z-0'
          }`}
          aria-label={product.name}
        >
          {/* Thumbnail Image Canvas with Brand Pill */}
          <div className="relative w-full sm:w-44 aspect-square shrink-0 rounded-[20px] overflow-hidden bg-[#f4f4f6]">
            <Link
              href={productPath(product)}
              onClick={handleProductSelect}
              className="block w-full h-full relative"
              aria-label={`View ${product.name}`}
            >
              <CatalogProductImage
                src={displayedImage}
                alt={product.name}
                priority={(index ?? 99) < 4}
                sizes="(max-width: 640px) 100vw, 176px"
                className="group-hover:scale-105 transition-transform duration-300 object-contain p-2"
              />
            </Link>


            {hasDiscount && !isDisabled && (
              <div className="absolute left-2.5 top-2.5 z-10 rounded-full bg-[#D4F6A2] px-2 py-0.5 text-[10px] font-bold tracking-tight text-[#1c3a13] shadow-xs">
                {discountPercent}% OFF
              </div>
            )}

            {isDisabled && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
                <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-bold text-white shadow-md">
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          {/* Middle Info Column */}
          <div className="flex-1 flex flex-col justify-between py-2 sm:py-0 sm:px-5">
            <div>
              {/* Badges Row: Best Seller / Brand on Left, in stock on Right (only text, no pill) */}
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  {(product.isBestSeller || product.rating >= 4.5) ? (
                    <span className="inline-flex items-center rounded-full bg-[#D4F6A2]/90 px-2.5 py-0.5 text-[9.5px] font-bold text-[#1c3a13] ring-1 ring-[#1c3a13]/10 shadow-[0_0_10px_rgba(212,246,162,0.6)]">
                      Best Seller
                    </span>
                  ) : product.brand ? (
                    <span className="text-[11px] font-bold text-[#1c3a13] uppercase tracking-wide truncate">
                      {product.brand}
                    </span>
                  ) : null}
                </div>

                {!isDisabled ? (
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#1c3a13] tracking-wide">
                    IN STOCK
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-[11px] font-medium text-stone-400 tracking-wide">
                    OUT OF STOCK
                  </span>
                )}
              </div>

              <Link
                href={productPath(product)}
                onClick={handleProductSelect}
                className="block mt-0.5"
              >
                <h3 className="text-sm sm:text-base font-[550] text-[#1c3a13] leading-snug hover:underline line-clamp-2">
                  {product.name}
                </h3>
              </Link>

              {/* Formulation specs & Skin Type */}
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                {product.skinType && (
                  <span className="rounded-full bg-[#D4F6A2]/40 px-2.5 py-0.5 font-bold text-[#1c3a13] text-[11px]">
                    {product.skinType}
                  </span>
                )}
                {product.rating && Number(product.rating) > 0 ? (
                  <ProductRatingPopover
                    product={product}
                    rating={Number(product.rating)}
                    reviewCount={product.reviewCount || (product as any).reviews || 1}
                    onOpenChange={setIsRatingPopoverOpen}
                  />
                ) : (
                  <span className="text-[10px] sm:text-[11px] font-semibold text-[#1c3a13] tracking-wide">
                    100% Authentic Product
                  </span>
                )}
              </div>

              {/* Delivery Row: 24-48 Hrs Fast Delivery (no icons, text #1c3a13) */}
              <div className="mt-1 flex items-center">
                <span className="text-[10px] sm:text-[11px] font-medium text-[#1c3a13]">
                  24-48 Hrs Fast Delivery
                </span>
              </div>

              {/* Compact Variant Selector in List View */}
              {hasVariants && (
                <div className="mt-2.5 max-w-xs relative">
                  <SeedHeroVariantDropdown
                    variants={dropdownVariants}
                    selectedVariantId={selectedVariantId}
                    defaultImage={product.image}
                    compact
                    layout="list"
                    onOpenChange={setIsDropdownOpen}
                    onVariantChange={handleVariantChange}
                    onImageChange={handleImageChange}
                    onSelectVariant={handleSelectVariantAddToCart}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Action & Price Column */}
          <div className="sm:border-l sm:border-stone-100 sm:pl-5 flex sm:flex-col justify-between items-end shrink-0 pt-2 sm:pt-0 min-w-[140px]">
            <div className="text-left sm:text-right">
              {product.originalPrice && product.originalPrice > currentPrice && (
                <div className="text-xs text-[#1c3a13]/60 line-through mb-0.5">
                  {formatPrice(product.originalPrice)}
                </div>
              )}
              <div className="text-base sm:text-xl font-extrabold text-[#1c3a13]">
                {formatPrice(currentPrice)}
              </div>
            </div>

            <button
              type="button"
              disabled={isDisabled}
              onClick={handleAddButtonClick}
              className="flex items-center justify-center gap-1 rounded-full bg-[#1c3a13] hover:bg-[#14290d] text-white px-4 h-7.5 sm:h-8 text-xs sm:text-sm font-bold transition-all shadow-xs active:scale-95 disabled:bg-stone-200 disabled:text-stone-400"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>{isDisabled ? 'OUT OF STOCK' : 'ADD'}</span>
            </button>
          </div>
        </article>

        <BuyNowModal
          isOpen={isBuyNowOpen}
          productId={product.id}
          productName={product.name}
          productImage={displayedImage}
          basePrice={currentPrice}
          baseStock={product.stock}
          variants={variantOptions}
          variantsFullyLoaded={product.hasVariants ? Boolean(product.variants && product.variants.length > 0) : true}
          onClose={() => setIsBuyNowOpen(false)}
        />
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. GRID VIEW CARD (Ultra-Premium D2C Nike Style)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <article
        className={`group relative flex flex-col justify-between rounded-[28px] border border-stone-200/80 bg-white p-3 sm:p-3.5 shadow-xs hover:border-[#1c3a13]/25 hover:shadow-lg transition-all duration-300 font-sans ${
          isDropdownOpen || isRatingPopoverOpen ? 'z-50 shadow-2xl ring-1 ring-stone-200/80' : 'z-0'
        }`}
        aria-label={product.name}
      >
        {/* Card Top: Image Canvas with Floating Brand Pill & Carousel Dots */}
        <div>
          <div className="relative aspect-square w-full rounded-[22px] overflow-hidden bg-[#f4f4f6] mb-2 sm:mb-2.5">
            <Link
              href={productPath(product)}
              onClick={handleProductSelect}
              className="block w-full h-full relative"
              aria-label={`View ${product.name}`}
            >
              <CatalogProductImage
                src={displayedImage}
                alt={product.name}
                priority={(index ?? 99) < 4}
                sizes="(max-width: 480px) 50vw, (max-width: 1024px) 33vw, 20vw"
                className="group-hover:scale-105 transition-transform duration-300 object-contain p-2"
              />
            </Link>


            {/* Discount Ribbon (Top-Left) */}
            {hasDiscount && !isDisabled && (
              <div className="absolute left-2.5 top-2.5 z-10 rounded-full bg-[#D4F6A2] px-2 py-0.5 text-[10px] sm:text-[11px] font-bold tracking-tight text-[#1c3a13] shadow-xs">
                {discountPercent}% OFF
              </div>
            )}

            {isDisabled && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
                <span className="rounded-full bg-stone-900 px-3 py-1 text-[10px] sm:text-xs font-bold text-white shadow-md">
                  Out of Stock
                </span>
              </div>
            )}

            {/* iPhone-Style Smooth Carousel Pagination Dots */}
            {productImages.length > 1 && (
              <div className="absolute bottom-2 inset-x-0 z-10 flex items-center justify-center gap-1.5 pointer-events-auto">
                {productImages.slice(0, 5).map((_, idx) => (
                  <button
                    key={`dot-${idx}`}
                    type="button"
                    aria-label={`View product image ${idx + 1}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveImageIdx(idx);
                    }}
                    className={`h-1.5 transition-all duration-300 rounded-full ${
                      activeImageIdx === idx
                        ? 'w-4 bg-[#1c3a13] shadow-xs'
                        : 'w-1.5 bg-stone-400/60 hover:bg-stone-600'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Badges Row: Best Seller (halo) / Brand on Left, in stock on Right (only text, no pill) */}
          <div className="flex items-center justify-between gap-1.5 mb-1 mt-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              {(product.isBestSeller || product.rating >= 4.5) ? (
                <span className="inline-flex items-center rounded-full bg-[#D4F6A2]/90 px-2.5 py-0.5 text-[9.5px] sm:text-[10px] font-bold text-[#1c3a13] ring-1 ring-[#1c3a13]/10 shadow-[0_0_10px_rgba(212,246,162,0.6)]">
                  Best Seller
                </span>
              ) : product.brand ? (
                <span className="text-[10.5px] font-bold text-[#1c3a13] uppercase tracking-wide truncate">
                  {product.brand}
                </span>
              ) : null}
            </div>

            {!isDisabled ? (
              <span className="text-[10px] sm:text-[11px] font-bold text-[#1c3a13] tracking-wide">
                IN STOCK
              </span>
            ) : (
              <span className="text-[10px] sm:text-[11px] font-medium text-stone-400 tracking-wide">
                OUT OF STOCK
              </span>
            )}
          </div>

          {/* Product Title (Signature Brand Color #1c3a13 preserved, font-weight 550) */}
          <Link
            href={productPath(product)}
            onClick={handleProductSelect}
            className="block mt-0.5"
          >
            <h3 className="line-clamp-2 text-xs sm:text-[13.5px] font-[550] text-[#1c3a13] leading-snug hover:underline min-h-[2.1rem]">
              {product.name}
            </h3>
          </Link>

          {/* Star Rating & Amazon-Style Review Breakdown Popover OR 100% Authentic Product */}
          <div className="mt-1.5 relative z-20 min-h-[20px] flex items-center">
            {product.rating && Number(product.rating) > 0 ? (
              <ProductRatingPopover
                product={product}
                rating={Number(product.rating)}
                reviewCount={product.reviewCount || (product as any).reviews || 1}
                onOpenChange={setIsRatingPopoverOpen}
              />
            ) : (
              <span className="text-[10px] sm:text-[11px] font-semibold text-[#1c3a13] tracking-wide">
                100% Authentic Product
              </span>
            )}
          </div>

          {/* Delivery Row: 24-48 Hrs Fast Delivery (no icons, all text #1c3a13) */}
          <div className="mt-1 flex items-center">
            <span className="text-[10px] sm:text-[11px] font-medium text-[#1c3a13]">
              24-48 Hrs Fast Delivery
            </span>
          </div>
        </div>

        {/* Card Bottom Slot: Full Pill Variant Selector OR Stacked Price + Pill ADD Button */}
        <div className="mt-2.5 sm:mt-3 border-t border-stone-100 pt-2">
          {hasVariants ? (
            <div className="relative w-full">
              <SeedHeroVariantDropdown
                variants={dropdownVariants}
                selectedVariantId={selectedVariantId}
                defaultImage={product.image}
                compact
                layout="grid"
                onOpenChange={setIsDropdownOpen}
                onVariantChange={handleVariantChange}
                onImageChange={handleImageChange}
                onSelectVariant={handleSelectVariantAddToCart}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 min-h-[30px] sm:min-h-[32px]">
              {/* Stacked Price: Cut price on top, Main price below */}
              <div className="min-w-0 flex flex-col justify-center">
                {product.originalPrice && product.originalPrice > currentPrice && (
                  <span className="text-[10px] text-[#1c3a13]/60 line-through leading-none mb-0.5">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
                <span className="text-xs sm:text-sm font-extrabold text-[#1c3a13] leading-none">
                  {formatPrice(currentPrice)}
                </span>
              </div>

              {/* Full Pill Shape ADD Button (Reduced Height) in Brand Color */}
              <button
                type="button"
                disabled={isDisabled}
                onClick={handleAddButtonClick}
                className="flex-1 max-w-[105px] sm:max-w-[125px] h-7 sm:h-7.5 flex items-center justify-center gap-1 rounded-full bg-[#1c3a13] hover:bg-[#14290d] text-white px-3 text-[11px] sm:text-xs font-bold transition-all shadow-xs active:scale-95 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed"
              >
                <Plus size={12} strokeWidth={2.5} />
                <span>{isDisabled ? 'SOLD' : 'ADD'}</span>
              </button>
            </div>
          )}
        </div>
      </article>

      <BuyNowModal
        isOpen={isBuyNowOpen}
        productId={product.id}
        productName={product.name}
        productImage={displayedImage}
        basePrice={currentPrice}
        baseStock={product.stock}
        variants={variantOptions}
        variantsFullyLoaded={product.hasVariants ? Boolean(product.variants && product.variants.length > 0) : true}
        onClose={() => setIsBuyNowOpen(false)}
      />
    </>
  );
}
