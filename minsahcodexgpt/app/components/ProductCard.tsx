'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Package, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPrice } from '@/utils/currency';
import { productPath } from '@/lib/product-url';
import CartStepper from '@/components/cart/CartStepper';
import dynamic from 'next/dynamic';
import CatalogProductImage from '@/components/catalog/CatalogProductImage';

const BuyNowModal = dynamic(() => import('@/components/cart/BuyNowModal'), {
  ssr: false,
  loading: () => null,
});

interface ProductCardProps {
  id: string;
  name: string;
  slug?: string;
  price: number;
  originalPrice?: number;
  image: string;
  category?: string;
  stock?: number;
}

export default function ProductCard({
  id,
  name,
  slug,
  price,
  originalPrice,
  image,
  category,
  stock,
}: ProductCardProps) {
  const [isBuyNowOpen, setIsBuyNowOpen] = useState(false);
  const discount = originalPrice && originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;
  const productHref = productPath({ id, slug });
  const isOutOfStock = stock === 0;

  return (
    <>
      <article className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
        <div className="relative">
          <Link
            href={productHref}
            className="relative block aspect-square overflow-hidden bg-minsah-accent/30 outline-none focus-visible:ring-2 focus-visible:ring-minsah-primary focus-visible:ring-offset-2"
            aria-label={`Open product details for ${name}`}
          >
            <CatalogProductImage
              src={image}
              alt={name}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="group-hover:scale-105"
              fallback={<Package className="h-14 w-14" />}
            />
            {isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-stone-900/50">
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-stone-800 shadow-sm">
                  Out of Stock
                </span>
              </div>
            )}
            {discount > 0 && !isOutOfStock && (
              <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
                {discount}% off
              </span>
            )}
          </Link>

          {!isOutOfStock && (
            <div className="absolute bottom-2.5 right-2.5 z-10" role="group" aria-label={`Add ${name} to cart`}>
              <CartStepper
                productId={id}
                productName={name}
                productImage={image}
                price={price}
                maxStock={stock}
                circleAdd
              />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-3 md:p-4">
          {category && (
            <p className="mb-1 truncate text-xs font-semibold uppercase tracking-wide text-minsah-secondary">
              {category}
            </p>
          )}
          <Link
            href={productHref}
            className="outline-none focus-visible:ring-2 focus-visible:ring-minsah-primary focus-visible:ring-offset-2"
          >
            <h3 className="mb-2 min-h-[2.45rem] line-clamp-2 text-sm font-semibold leading-snug text-minsah-dark transition-colors hover:text-minsah-primary md:text-base">
              {name}
            </h3>
          </Link>

          <div className="mb-3 flex flex-wrap items-baseline gap-2">
            <span className="text-lg font-bold text-minsah-primary">{formatPrice(price)}</span>
            {originalPrice && originalPrice > price && (
              <span className="text-sm text-minsah-secondary line-through">{formatPrice(originalPrice)}</span>
            )}
          </div>

          <Button
            type="button"
            variant="primary"
            fullWidth
            onClick={() => setIsBuyNowOpen(true)}
            disabled={isOutOfStock}
            className="mt-auto rounded-2xl bg-minsah-dark px-4 py-2.5 text-sm text-minsah-accent hover:bg-minsah-primary disabled:bg-stone-300 disabled:text-stone-500"
          >
            <ShoppingBag size={15} aria-hidden="true" />
            {isOutOfStock ? 'Out of Stock' : 'Buy Now'}
          </Button>
        </div>
      </article>

      <BuyNowModal
        isOpen={isBuyNowOpen}
        productId={id}
        productName={name}
        productImage={image}
        basePrice={price}
        baseStock={stock}
        onClose={() => setIsBuyNowOpen(false)}
      />
    </>
  );
}
