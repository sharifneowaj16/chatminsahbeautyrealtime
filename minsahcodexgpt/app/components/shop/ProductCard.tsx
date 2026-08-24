'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Product } from '@/types/product';
import { formatPrice } from '@/lib/shopUtils';
import { productPath } from '@/lib/product-url';
import dynamic from 'next/dynamic';
import type { BuyNowVariantOption } from '@/components/cart/BuyNowModal';
import { trackShopBuyNowClick, trackShopSelectItem, trackShopWishlistAdd } from '@/lib/tracking/shop-events';
import CatalogProductImage from '@/components/catalog/CatalogProductImage';

const BuyNowModal = dynamic(() => import('@/components/cart/BuyNowModal'), {
  ssr: false,
  loading: () => null,
});

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
  index?: number;
  listName?: string;
}

export default function ProductCard({ product, onQuickView, index, listName = 'Shop Product Grid' }: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isBuyNowOpen, setIsBuyNowOpen] = useState(false);

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

  const handleBuyNowClick = () => {
    trackShopBuyNowClick(product, index, listName);
    setIsBuyNowOpen(true);
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

  const isDisabled = product.stock === 0;

  const primaryBadges = [
    product.discount && product.discount > 0
      ? { key: 'discount', label: `${product.discount}% OFF`, className: 'bg-minsah-action-primary text-white' }
      : null,
    product.isNew
      ? { key: 'new', label: 'New', className: 'bg-emerald-700 text-white' }
      : null,
    product.isBestSeller
      ? { key: 'bestseller', label: 'Best Seller', className: 'bg-stone-800 text-minsah-accent' }
      : null,
    product.isExclusive
      ? { key: 'exclusive', label: 'Exclusive', className: 'bg-minsah-action-primary text-white' }
      : null,
  ].filter(Boolean).slice(0, 1) as { key: string; label: string; className: string }[];

  return (
    <>
      <article className="minsah-card-lift group overflow-hidden rounded-lg bg-white border border-stone-200/70 shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-xs" aria-label={product.name}>
        <div className="relative">
          <Link
            href={productPath(product)}
            className="relative block outline-none focus-visible:ring-2 focus-visible:ring-minsah-primary focus-visible:ring-offset-2"
            onClick={handleProductSelect}
            aria-label={`Open product details for ${product.name}`}
          >
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-minsah-surface-subtle">
              <CatalogProductImage
                src={product.image}
                alt={product.name}
                priority={(index ?? 99) < 4}
                sizes="(max-width: 480px) 50vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                className="group-hover:scale-105"
              />

              {isDisabled ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/55" aria-hidden="true">
                  <span className="rounded-full bg-gray-900 px-4 py-2 text-xs font-bold text-white">
                    Out of Stock
                  </span>
                </div>
              ) : primaryBadges.length > 0 ? (
                <div className="absolute left-2.5 top-2.5 z-10">
                  {primaryBadges.map((badge) => (
                    <span
                      key={badge.key}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider shadow-xs ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </Link>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleWishlist}
            className="absolute right-2 top-2 z-20 h-8 w-8 min-h-0 min-w-0 rounded-full bg-white/90 shadow-xs backdrop-blur hover:bg-white"
            aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            aria-pressed={isWishlisted}
          >
            <Heart
              size={16}
              aria-hidden="true"
              className={`${isWishlisted ? 'fill-red-500 text-red-500' : 'text-minsah-secondary'} transition-colors`}
            />
          </Button>
        </div>

        <div className="p-3 md:p-4">
          <Link href={`/shop?brand=${product.brandSlug}`} className="outline-none focus-visible:ring-2 focus-visible:ring-minsah-primary focus-visible:ring-offset-2">
            <p className="mb-1 truncate text-[11px] font-semibold uppercase tracking-wider text-minsah-secondary transition-colors hover:text-minsah-primary">
              {product.brand || 'Minsah Beauty'}
            </p>
          </Link>

          <Link href={productPath(product)} onClick={handleProductSelect} className="outline-none focus-visible:ring-2 focus-visible:ring-minsah-primary focus-visible:ring-offset-2">
            <h3 className="mb-2 min-h-[2.45rem] line-clamp-2 text-sm font-semibold leading-snug text-minsah-dark transition-colors hover:text-minsah-primary md:text-base">
              {product.name}
            </h3>
          </Link>

          <div className="mb-2 flex min-h-5 items-center gap-2">
            <div className="flex items-center">
              <span className="text-sm text-yellow-400">★</span>
              <span className="ml-1 text-xs font-medium text-minsah-dark">
                {Number(product.rating || 0).toFixed(1)}
              </span>
            </div>
            <span className="text-xs text-minsah-secondary">({product.reviewCount || 0})</span>
          </div>

          <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-lg font-bold text-minsah-primary md:text-xl">
              ৳{formatPrice(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <>
                <span className="text-sm text-minsah-secondary line-through">
                  ৳{formatPrice(product.originalPrice)}
                </span>
                <span className="text-xs font-semibold text-green-600">
                  Save ৳{formatPrice(product.originalPrice - product.price)}
                </span>
              </>
            )}
          </div>

          <Button
            type="button"
            variant="primary"
            fullWidth
            onClick={handleBuyNowClick}
            disabled={isDisabled}
            className="rounded-full bg-minsah-primary px-4 py-2.5 text-sm font-semibold tracking-wide text-white shadow-xs hover:bg-minsah-dark disabled:bg-stone-300 disabled:text-stone-500"
          >
            <ShoppingBag size={15} aria-hidden="true" />
            {isDisabled ? 'Out of Stock' : `BUY NOW • ৳${formatPrice(product.price)}`}
          </Button>

          {onQuickView && (
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => onQuickView(product)}
              className="mt-2 rounded-full border-minsah-primary px-3 py-2 text-sm text-minsah-primary hover:bg-minsah-accent"
            >
              Quick View
            </Button>
          )}
        </div>
      </article>

      <BuyNowModal
        isOpen={isBuyNowOpen}
        productId={product.id}
        productName={product.name}
        productImage={product.image}
        basePrice={product.price}
        baseStock={product.stock}
        variants={variantOptions}
        onClose={() => setIsBuyNowOpen(false)}
      />
    </>
  );
}
