'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Plus,
  ShoppingBag,
  Sparkles,
  Truck,
  ArrowRight,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';
import SeedBundleDrawer, { BundleProductCandidate } from './SeedBundleDrawer';
import { safeImageUrl } from '@/lib/safe-image';

export interface SeedHeroBundleCardProps {
  /** Anchor / Main Product */
  mainProduct: BundleProductCandidate;
  /** Suggested Addon Product from admin / relatedProducts */
  pairedProduct?: BundleProductCandidate | null;
  /** Catalog products list for search inside drawer */
  catalogCandidates?: BundleProductCandidate[];
  /** Admin toggle */
  enabled?: boolean;
  className?: string;
}

export default function SeedHeroBundleCard({
  mainProduct,
  pairedProduct,
  catalogCandidates = [],
  enabled = true,
  className = '',
}: SeedHeroBundleCardProps) {
  const { addItem } = useCart();
  const { openDrawer: openCartDrawer } = useCartDrawer();

  // Bundle Drawer Open State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fallback default paired product if none provided by admin
  const activePairedProduct: BundleProductCandidate = useMemo(() => {
    if (pairedProduct) return pairedProduct;
    if (catalogCandidates.length > 0) return catalogCandidates[0];
    return {
      id: 'default-addon-cream',
      name: 'Barrier Moisture Repair Cream',
      price: 1200,
      costPrice: 700,
      image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80',
      stock: 20,
      hasFreeDelivery: true,
      category: 'Moisturizer',
    };
  }, [pairedProduct, catalogCandidates]);

  // =========================================================================
  // REAL BENEFIT 15% DISCOUNT CALCULATION FOR 2-STEP BASE BUNDLE
  // =========================================================================
  const calculation = useMemo(() => {
    const totalSellingPrice = mainProduct.price + activePairedProduct.price;
    const mainCost = mainProduct.costPrice != null ? mainProduct.costPrice : mainProduct.price * 0.6;
    const pairedCost = activePairedProduct.costPrice != null ? activePairedProduct.costPrice : activePairedProduct.price * 0.6;
    
    const realBenefit = Math.max(0, totalSellingPrice - (mainCost + pairedCost));
    // 2-step bundle gets 15% of Real Profit
    const customerSavings = Math.round(realBenefit * 0.15);
    const finalPayable = Math.max(0, totalSellingPrice - customerSavings);
    const hasFreeDelivery = Boolean(mainProduct.hasFreeDelivery || activePairedProduct.hasFreeDelivery);

    return {
      totalSellingPrice,
      customerSavings,
      finalPayable,
      hasFreeDelivery,
    };
  }, [mainProduct, activePairedProduct]);

  // If disabled by admin, return null
  if (!enabled) return null;

  // Direct 1-Click Add 2-Step Bundle to Bag
  const handleAddBaseBundle = () => {
    const discountRatio =
      calculation.totalSellingPrice > 0
        ? calculation.finalPayable / calculation.totalSellingPrice
        : 1;

    // Add Main Product
    addItem({
      id: `bundle-${mainProduct.id}`,
      productId: mainProduct.id,
      name: `${mainProduct.name} [Bundle Offer]`,
      price: Math.round(mainProduct.price * discountRatio),
      image: mainProduct.image,
      quantity: 1,
    });

    // Add Paired Product
    addItem({
      id: `bundle-${activePairedProduct.id}`,
      productId: activePairedProduct.id,
      name: `${activePairedProduct.name} [Bundle Offer]`,
      price: Math.round(activePairedProduct.price * discountRatio),
      image: activePairedProduct.image,
      quantity: 1,
    });

    openCartDrawer();
  };

  return (
    <section className={`w-full ${className}`} aria-label="Frequently Paired With Bundle Section">
      
      {/* ========================================================================= */}
      {/* 1. INLINE LUXURY BUNDLE CARD CONTAINER                                    */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-3xl bg-stone-50/80 dark:bg-zinc-800/40 border border-black/10 dark:border-white/10 shadow-xs space-y-4">
        
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#122A16] dark:text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#122A16] dark:text-white">
              Frequently Paired With (Complete Routine)
            </span>
          </div>

          {calculation.customerSavings > 0 && (
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono font-extrabold text-emerald-900 dark:text-emerald-300">
              SAVE ৳ {calculation.customerSavings.toLocaleString('en-US')}
            </span>
          )}
        </div>

        {/* Dual Product Visual Snapshots with '+' Separator */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 p-3 rounded-2xl bg-white dark:bg-zinc-800/90 border border-black/5 dark:border-white/10 shadow-xs">
          
          {/* Main Product Card */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative h-13 w-13 rounded-xl overflow-hidden bg-stone-100 dark:bg-zinc-700 shrink-0 border border-black/5 dark:border-white/10">
              <Image
                src={safeImageUrl(mainProduct?.image)}
                alt={mainProduct.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="truncate">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                This Item
              </p>
              <p className="text-xs font-bold text-[#122A16] dark:text-white truncate">
                {mainProduct.name}
              </p>
              <p className="text-xs font-mono font-bold text-stone-700 dark:text-stone-300">
                ৳ {mainProduct.price.toLocaleString('en-US')}
              </p>
            </div>
          </div>

          {/* Plus Separator */}
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#122A16]/5 dark:bg-white/10 text-[#122A16] dark:text-white shrink-0 font-bold text-xs">
            <Plus size={14} />
          </div>

          {/* Paired Product Card */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative h-13 w-13 rounded-xl overflow-hidden bg-stone-100 dark:bg-zinc-700 shrink-0 border border-black/5 dark:border-white/10">
              <Image
                src={safeImageUrl(activePairedProduct?.image)}
                alt={activePairedProduct.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="truncate">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Paired Step
              </p>
              <p className="text-xs font-bold text-[#122A16] dark:text-white truncate">
                {activePairedProduct.name}
              </p>
              <p className="text-xs font-mono font-bold text-stone-700 dark:text-stone-300">
                ৳ {activePairedProduct.price.toLocaleString('en-US')}
              </p>
            </div>
          </div>

        </div>

        {/* Pricing & Free Delivery Perk Row */}
        <div className="flex flex-wrap items-baseline justify-between gap-2 pt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-mono font-extrabold text-[#122A16] dark:text-white">
              ৳ {calculation.finalPayable.toLocaleString('en-US')}
            </span>
            <span className="text-xs text-stone-400 line-through font-mono">
              ৳ {calculation.totalSellingPrice.toLocaleString('en-US')}
            </span>
          </div>

          {calculation.hasFreeDelivery && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <Truck size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Free Nationwide Delivery</span>
            </div>
          )}
        </div>

        {/* Action Buttons: 1-Click Add & Build Custom Bundle Drawer Trigger */}
        <div className="space-y-2">
          
          {/* Primary CTA Button */}
          <button
            type="button"
            onClick={handleAddBaseBundle}
            data-sticky-sentinel="bundle-cta"
            className="w-full h-12 flex items-center justify-center gap-2 rounded-full bg-[#122A16] hover:bg-[#0c1d0f] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white font-semibold text-xs tracking-wide shadow-md active:scale-[0.99] transition-all"
          >
            <ShoppingBag size={14} />
            <span>
              ADD 2-STEP BUNDLE TO BAG • ৳ {calculation.finalPayable.toLocaleString('en-US')}
            </span>
          </button>

          {/* Interactive Custom Bundle Drawer Trigger Link */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#122A16] dark:text-emerald-400 underline underline-offset-4 hover:opacity-80 transition-opacity"
            >
              <span>Build Custom Bundle / Add More Products (Save up to 30%)</span>
              <ArrowRight size={13} className="mt-0.5" />
            </button>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. SLIDE-OVER MULTI-ITEM CUSTOM BUNDLE DRAWER                             */}
      {/* ========================================================================= */}
      <SeedBundleDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        mainProduct={mainProduct}
        initialAddon={activePairedProduct}
        catalogCandidates={catalogCandidates}
      />

    </section>
  );
}
