'use client';

import React, { useState, useMemo } from 'react';
import SeedHeroGallery from './SeedHeroGallery';
import SeedHeroBuyBox from './SeedHeroBuyBox';
import SeedHeroAccordions from './SeedHeroAccordions';
import SeedHeroActionReel from './SeedHeroActionReel';
import SeedHeroBundleCard from './SeedHeroBundleCard';
import { ProductVariantItem } from './SeedVariantRail';
import { BundleProductCandidate } from './SeedBundleDrawer';

export type GalleryImageItem = string | { url: string; alt?: string };

export interface SeedProductHeroProps {
  product: {
    id: string;
    name: string;
    sku?: string | null;
    price: number;
    compareAtPrice?: number | null;
    costPrice?: number | null;
    image: string;
    images?: GalleryImageItem[] | string[] | null;
    shortDescription?: string | null;
    keyBenefits?: string[] | null;
    ingredients?: string | null;
    skinType?: string | string[] | null;
    shelfLife?: string | null;
    originCountry?: string | string[] | null;
    shippingWeight?: string | null;
    deliveryOfferEnabled?: boolean | null;
    productSpecs?: Record<string, any> | null;
    productAttributes?: Record<string, any> | null;
    descriptionSections?: Record<string, any> | any[] | null;
    relatedProducts?: string | string[] | null;
  };
  variants?: ProductVariantItem[];
  relatedProductsList?: BundleProductCandidate[];
  className?: string;
}

export default function SeedProductHero({
  product,
  variants = [],
  relatedProductsList = [],
  className = '',
}: SeedProductHeroProps) {
  // Active Main Image (Synchronized with selected variant)
  const [activeImageOverride, setActiveImageOverride] = useState<string | null>(null);

  // Gallery Images Array (Ensuring 5 high-res string URLs for Seed Asymmetric Grid)
  const normalizedGalleryImages: string[] = useMemo(() => {
    const list: string[] = [];
    if (activeImageOverride) {
      list.push(activeImageOverride);
    } else if (product.image) {
      list.push(product.image);
    }

    if (Array.isArray(product.images)) {
      product.images.forEach((img) => {
        const url = typeof img === 'string' ? img : img?.url;
        if (url && !list.includes(url)) list.push(url);
      });
    }

    // High quality fallbacks if fewer than 5 images
    const fallbackShots = [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=1200&q=80',
    ];

    fallbackShots.forEach((shot) => {
      if (list.length < 5 && !list.includes(shot)) {
        list.push(shot);
      }
    });

    return list;
  }, [product.image, product.images, activeImageOverride]);

  // Main Bundle Candidate for Phase 6
  const mainBundleItem: BundleProductCandidate = useMemo(() => ({
    id: product.id,
    name: product.name,
    price: product.price,
    costPrice: product.costPrice,
    image: product.image || '/images/categories/Skincare.png',
    stock: 100,
    hasFreeDelivery: Boolean(product.deliveryOfferEnabled),
  }), [product]);

  // Paired Product Candidate
  const pairedBundleItem: BundleProductCandidate | null = useMemo(() => {
    if (relatedProductsList.length > 0) {
      return relatedProductsList[0];
    }
    return null;
  }, [relatedProductsList]);

  // Safe helper to format fields
  const formatField = (val: unknown): string => {
    if (!val) return '';
    if (typeof val === 'string') return val.trim();
    if (Array.isArray(val)) {
      const items = val.filter((item) => typeof item === 'string' && item.trim() !== '').map((item) => item.trim());
      return items.join(', ');
    }
    return String(val);
  };

  return (
    <div
      className={`w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10 ${className}`}
      aria-label="Product Hero Section"
    >
      {/* Master 2-Column Grid (Exact Seed.com 52% / 48% Split on Desktop) */}
      <div className="flex flex-col lg:grid lg:grid-cols-[52%_48%] gap-8 lg:gap-10 items-start">
        
        {/* ===================================================================== */}
        {/* LEFT COLUMN (52%): PHASE 1 ASYMMETRIC 5-IMAGE GRID & MOBILE CAROUSEL */}
        {/* ===================================================================== */}
        <div className="w-full">
          <SeedHeroGallery
            images={normalizedGalleryImages}
            productName={product.name}
            overrideImage={activeImageOverride}
          />
        </div>

        {/* ===================================================================== */}
        {/* RIGHT COLUMN (48%): PHASES 2 TO 6 COMPLETE COMMERCE STACK (Sticky)    */}
        {/* ===================================================================== */}
        <div className="w-full max-w-[540px] lg:sticky lg:top-24 space-y-6">
          
          {/* Phase 2: Seed Sticky Buy Box */}
          <SeedHeroBuyBox
            productId={product.id}
            sku={product.sku || 'DS-01®'}
            name={product.name}
            price={product.price}
            compareAtPrice={product.compareAtPrice}
            shortDescription={product.shortDescription || undefined}
            keyBenefits={product.keyBenefits || undefined}
            variants={variants}
            defaultImage={product.image}
            onImageChange={(img) => setActiveImageOverride(img)}
          />

          {/* Phase 3 & 4: Accordions & Dedicated Drawers */}
          <SeedHeroAccordions
            productId={product.id}
            productName={product.name}
            keyBenefits={product.keyBenefits || undefined}
            specs={{
              volume: formatField(product.shippingWeight) || '30*2 ml / 80*2 ml (Double Sealed Container)',
              skinType: formatField(product.skinType) || 'Suitable for All Skin Types (Sensitive Safe)',
              shelfLife: formatField(product.shelfLife) || '24–36 Months from Manufacturing Date',
              originCountry: formatField(product.originCountry) || 'Direct Authorized Channel',
            }}
            ingredients={product.ingredients || undefined}
          />

          {/* Phase 5: "SEE IT IN ACTION" Video Reels */}
          <SeedHeroActionReel
            productId={product.id}
            productName={product.name}
            productPrice={product.price}
            productImage={product.image}
            reels={product.descriptionSections}
          />

          {/* Phase 6: Bundle Card & Real Benefit Engine */}
          <SeedHeroBundleCard
            mainProduct={mainBundleItem}
            pairedProduct={pairedBundleItem}
            catalogCandidates={relatedProductsList}
          />

        </div>

      </div>
    </div>
  );
}
