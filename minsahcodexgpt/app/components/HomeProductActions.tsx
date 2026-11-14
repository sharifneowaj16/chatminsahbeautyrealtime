'use client';

import dynamic from 'next/dynamic';
import type { VariantOption } from '@/components/cart/VariantModal';
import type { BuyNowVariantOption } from '@/components/cart/BuyNowModal';

const CartStepper = dynamic(() => import('@/components/cart/CartStepper'), {
  ssr: false,
  loading: () => (
    <span
      className="block h-8 w-8 rounded-full bg-minsah-surface-accent shadow-[var(--shadow-small)]"
      aria-hidden="true"
    />
  ),
});

const CardBuyNowButton = dynamic(() => import('@/components/cart/CardBuyNowButton'), {
  ssr: false,
  loading: () => (
    <span
      className="block h-11 w-full rounded-2xl bg-minsah-dark/15"
      aria-hidden="true"
    />
  ),
});

interface HomeProductActionProps {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  stock: number;
  sku?: string | null;
  productSku?: string | null;
  hasVariants: boolean;
  variantCount?: number;
  variantsFullyLoaded?: boolean;
  variants?: VariantOption[];
}

function toBuyNowVariants(variants?: VariantOption[]): BuyNowVariantOption[] | undefined {
  if (!variants?.length) return undefined;
  return variants.map((variant) => ({
    id: variant.id,
    name: variant.name,
    price: variant.price,
    stock: variant.stock,
    image: variant.image ?? null,
    sku: variant.sku ?? null,
    attributes: variant.attributes ?? {},
  }));
}

export function HomeOverlayCartAction({
  productId,
  productName,
  productImage,
  price,
  stock,
  sku,
  productSku,
  hasVariants,
  variantCount,
  variantsFullyLoaded,
  variants,
}: HomeProductActionProps) {
  if (stock <= 0) return null;

  return (
    <CartStepper
      productId={productId}
      productName={productName}
      productImage={productImage}
      price={price}
      sku={sku}
      productSku={productSku ?? sku}
      maxStock={stock}
      hasRequiredVariants={hasVariants}
      variantCount={variantCount}
      variantsFullyLoaded={variantsFullyLoaded}
      variants={variants}
      disabled={stock <= 0}
      circleAdd
    />
  );
}

export function HomePrimaryCartAction({
  productId,
  productName,
  productImage,
  price,
  stock,
  sku,
  productSku,
  hasVariants,
  variantCount,
  variantsFullyLoaded,
  variants,
  className,
}: HomeProductActionProps & { className?: string }) {
  return (
    <CartStepper
      productId={productId}
      productName={productName}
      productImage={productImage}
      price={price}
      sku={sku}
      productSku={productSku ?? sku}
      maxStock={stock}
      hasRequiredVariants={hasVariants}
      variantCount={variantCount}
      variantsFullyLoaded={variantsFullyLoaded}
      variants={variants}
      disabled={stock <= 0}
      className={className}
    />
  );
}

export function HomeBuyNowAction({
  productId,
  productName,
  productImage,
  price,
  stock,
  sku,
  productSku,
  variantCount,
  variantsFullyLoaded,
  variants,
  className,
}: HomeProductActionProps & { className: string }) {
  return (
    <CardBuyNowButton
      productId={productId}
      productName={productName}
      productImage={productImage}
      price={price}
      sku={sku ?? productSku}
      maxStock={stock}
      variants={toBuyNowVariants(variants)}
      variantCount={variantCount}
      variantsFullyLoaded={variantsFullyLoaded}
      disabled={stock <= 0}
      className={className}
    />
  );
}
