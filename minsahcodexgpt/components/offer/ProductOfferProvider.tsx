'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ProductOfferSnapshot } from '@/lib/commerce/product-offer';
import type { ProductRatingSnapshot } from '@/lib/commerce/product-rating';
import { resolveActiveOffer, resolveInitialVariantSelection } from './offer-context-logic';

export interface ProductOfferContextValue {
  product: Record<string, any>;
  variants: any[];
  selectedVariantId: string | null;
  setSelectedVariantId: (id: string | null) => void;
  selectedVariant: any | null;
  offer: ProductOfferSnapshot;
  productOffer: ProductOfferSnapshot;
  rating?: ProductRatingSnapshot | any | null;
}

const ProductOfferContext = createContext<ProductOfferContextValue | null>(null);

export interface ProductOfferProviderProps {
  product: Record<string, any>;
  productOffer?: ProductOfferSnapshot;
  rating?: ProductRatingSnapshot | any | null;
  initialVariantId?: string | null;
  children: React.ReactNode;
}

export function ProductOfferProvider({
  product,
  productOffer,
  rating,
  initialVariantId,
  children,
}: ProductOfferProviderProps) {
  const searchParams = useSearchParams();
  const variants = useMemo(() => (Array.isArray(product?.variants) ? product.variants : []), [product?.variants]);

  // Derived fallback product offer snapshot
  const resolvedProductOffer = useMemo(() => {
    return productOffer || product.offer;
  }, [productOffer, product.offer]);

  // Determine initial variant selection from URL, props, or single-variant auto-selection
  const initialSelection = useMemo(() => {
    const urlVariantParam = searchParams?.get('variant') || initialVariantId;
    return resolveInitialVariantSelection({ variants, urlVariantParam });
  }, [variants, searchParams, initialVariantId]);

  const [selectedVariantId, setSelectedVariantIdState] = useState<string | null>(initialSelection);

  // Sync state if URL search param changes
  useEffect(() => {
    const urlParam = searchParams?.get('variant');
    if (urlParam) {
      const match = variants.find((v) => v.id === urlParam || v.sku === urlParam);
      if (match && match.id !== selectedVariantId) {
        setSelectedVariantIdState(match.id);
      }
    }
  }, [searchParams, variants, selectedVariantId]);

  const setSelectedVariantId = (id: string | null) => {
    setSelectedVariantIdState(id);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (id) {
        url.searchParams.set('variant', id);
      } else {
        url.searchParams.delete('variant');
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  const selectedVariant = useMemo(() => {
    if (!selectedVariantId) return null;
    return variants.find((v) => v.id === selectedVariantId) || null;
  }, [variants, selectedVariantId]);

  const activeOffer = useMemo(() => {
    return resolveActiveOffer({
      productOffer: resolvedProductOffer,
      variants,
      selectedVariantId,
    });
  }, [resolvedProductOffer, variants, selectedVariantId]);

  const value = useMemo<ProductOfferContextValue>(() => ({
    product,
    variants,
    selectedVariantId,
    setSelectedVariantId,
    selectedVariant,
    offer: activeOffer,
    productOffer: resolvedProductOffer,
    rating,
  }), [product, variants, selectedVariantId, selectedVariant, activeOffer, resolvedProductOffer, rating]);

  return (
    <ProductOfferContext.Provider value={value}>
      {children}
    </ProductOfferContext.Provider>
  );
}

export function useProductOfferContext(): ProductOfferContextValue {
  const context = useContext(ProductOfferContext);
  if (!context) {
    throw new Error('useProductOfferContext must be used within a ProductOfferProvider');
  }
  return context;
}
