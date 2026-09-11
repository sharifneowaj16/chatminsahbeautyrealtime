'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ShoppingBag, Check } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';
import { useToast } from '@/components/ui/ToastProvider';
import SeedBundleDrawer, { BundleProductCandidate } from './SeedBundleDrawer';
import SeedBundleProductCapsule from './SeedBundleProductCapsule';
import { safeImageUrl } from '@/lib/safe-image';
import { createBundleCartItem, findStandaloneCartItems } from '@/utils/cartItemHelper';
import { estimateDeliveryCharge, extractVariantWeightKg, parseWeightToKg } from '@/lib/buy-now';
import { cleanProductName } from './cleanProductName';

export interface SeedHeroBundleCardProps {
  /** Anchor / Main Product */
  mainProduct: BundleProductCandidate;
  /** Suggested Addon Product from admin / relatedProducts */
  pairedProduct?: BundleProductCandidate | null;
  /** Catalog products list for search inside drawer */
  catalogCandidates?: BundleProductCandidate[];
  /** Admin toggle */
  enabled?: boolean;
  /** Callback when main product variant changes inside bundle */
  onMainVariantChange?: (variantId: string | null, currentPrice: number, stock: number) => void;
  className?: string;
}

export default function SeedHeroBundleCard({
  mainProduct,
  pairedProduct,
  catalogCandidates = [],
  enabled = true,
  onMainVariantChange,
  className = '',
}: SeedHeroBundleCardProps) {
  const { items, addItem, removeItem } = useCart();
  const { openDrawer: openCartDrawer } = useCartDrawer();
  const { pushToast } = useToast();

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

  // Variant lists
  const mainVariants = useMemo(() => mainProduct.variants || [], [mainProduct.variants]);
  const pairedVariants = useMemo(() => activePairedProduct.variants || [], [activePairedProduct.variants]);

  // Selected variant state
  const [selectedMainVariantId, setSelectedMainVariantId] = useState<string | null>(
    () => mainVariants[0]?.id ?? null
  );
  const [selectedPairedVariantId, setSelectedPairedVariantId] = useState<string | null>(
    () => pairedVariants[0]?.id ?? null
  );

  // Synchronize main variant when mainProduct.price or mainVariants changes
  useEffect(() => {
    if (mainVariants.length > 0) {
      const matchByPrice = mainVariants.find((v) => v.price === mainProduct.price);
      if (matchByPrice) {
        setSelectedMainVariantId(matchByPrice.id);
      } else if (!selectedMainVariantId || !mainVariants.some((v) => v.id === selectedMainVariantId)) {
        setSelectedMainVariantId(mainVariants[0].id);
      }
    }
  }, [mainProduct.price, mainVariants, selectedMainVariantId]);

  // Synchronize paired variant when pairedVariants changes
  useEffect(() => {
    if (pairedVariants.length > 0) {
      if (!selectedPairedVariantId || !pairedVariants.some((v) => v.id === selectedPairedVariantId)) {
        setSelectedPairedVariantId(pairedVariants[0].id);
      }
    }
  }, [pairedVariants, selectedPairedVariantId]);

  const activeMainVariant = useMemo(() => {
    return mainVariants.find((v) => v.id === selectedMainVariantId) || (mainVariants.length > 0 ? mainVariants[0] : null);
  }, [mainVariants, selectedMainVariantId]);

  const activePairedVariant = useMemo(() => {
    return pairedVariants.find((v) => v.id === selectedPairedVariantId) || (pairedVariants.length > 0 ? pairedVariants[0] : null);
  }, [pairedVariants, selectedPairedVariantId]);

  const effectiveMainPrice = activeMainVariant?.price ?? mainProduct.price;
  const effectiveMainImage = activeMainVariant?.image || mainProduct.image;

  const effectivePairedPrice = activePairedVariant?.price ?? activePairedProduct.price;
  const effectivePairedImage = activePairedVariant?.image || activePairedProduct.image;

  const handleMainVariantSelect = (varId: string) => {
    setSelectedMainVariantId(varId);
    const chosen = mainVariants.find((v) => v.id === varId);
    if (chosen && onMainVariantChange) {
      onMainVariantChange(chosen.id, chosen.price, chosen.stock);
    }
  };

  // =========================================================================
  // REAL BENEFIT 15% DISCOUNT CALCULATION FOR 2-STEP BASE BUNDLE
  // Formula:
  // Real Benefit = Max(0, Selling Price - Purchase Cost - Store Absorbed Delivery)
  // =========================================================================
  const calculation = useMemo(() => {
    const totalSellingPrice = effectiveMainPrice + effectivePairedPrice;
    // Fallback purchase cost: 75% of selling price to guarantee zero loss
    const mainCost = mainProduct.costPrice != null ? mainProduct.costPrice : effectiveMainPrice * 0.75;
    const pairedCost = activePairedProduct.costPrice != null ? activePairedProduct.costPrice : effectivePairedPrice * 0.75;

    // Weight and courier delivery calculation (outside Dhaka standard)
    const mainWeight = extractVariantWeightKg(activeMainVariant?.attributes) ?? parseWeightToKg(mainProduct.shippingWeight) ?? parseWeightToKg(mainProduct.weight) ?? 0.25;
    const pairedWeight = extractVariantWeightKg(activePairedVariant?.attributes) ?? parseWeightToKg(activePairedProduct.shippingWeight) ?? parseWeightToKg(activePairedProduct.weight) ?? 0.25;

    const mainCourier = estimateDeliveryCharge({ city: 'Outside Dhaka', area: 'Outside', parcelWeightKg: mainWeight + 0.1 }).charge;
    const pairedCourier = estimateDeliveryCharge({ city: 'Outside Dhaka', area: 'Outside', parcelWeightKg: pairedWeight + 0.1 }).charge;

    let mainAbsorbed = 0;
    if (mainProduct.deliveryOfferType === 'FREE' || mainProduct.hasFreeDelivery) {
      mainAbsorbed = mainCourier;
    } else if (mainProduct.deliveryOfferType === 'FIXED') {
      mainAbsorbed = Math.max(0, mainCourier - (mainProduct.deliveryOfferAmount ?? 0));
    }

    let pairedAbsorbed = 0;
    if (activePairedProduct.deliveryOfferType === 'FREE' || activePairedProduct.hasFreeDelivery) {
      pairedAbsorbed = pairedCourier;
    } else if (activePairedProduct.deliveryOfferType === 'FIXED') {
      pairedAbsorbed = Math.max(0, pairedCourier - (activePairedProduct.deliveryOfferAmount ?? 0));
    }

    const totalStoreAbsorbedDelivery = mainAbsorbed + pairedAbsorbed;
    
    const realBenefit = Math.max(0, totalSellingPrice - (mainCost + pairedCost) - totalStoreAbsorbedDelivery);
    // 2-step bundle gets 15% of Real Profit
    const customerSavings = Math.round(realBenefit * 0.15);
    const finalPayable = Math.max(0, totalSellingPrice - customerSavings);
    // Free delivery conditions: 1) finalPayable >= 1100, or 2) mainProduct / pairedProduct has special free delivery flag
    const hasFreeDelivery =
      finalPayable >= 1100 ||
      Boolean(
        mainProduct.hasFreeDelivery ||
        activePairedProduct.hasFreeDelivery ||
        mainProduct.deliveryOfferType === 'FREE' ||
        activePairedProduct.deliveryOfferType === 'FREE'
      );

    return {
      totalSellingPrice,
      customerSavings,
      finalPayable,
      hasFreeDelivery,
    };
  }, [
    effectiveMainPrice,
    effectivePairedPrice,
    mainProduct.costPrice,
    mainProduct.hasFreeDelivery,
    mainProduct.weight,
    mainProduct.shippingWeight,
    mainProduct.deliveryOfferType,
    mainProduct.deliveryOfferAmount,
    activePairedProduct.costPrice,
    activePairedProduct.hasFreeDelivery,
    activePairedProduct.weight,
    activePairedProduct.shippingWeight,
    activePairedProduct.deliveryOfferType,
    activePairedProduct.deliveryOfferAmount,
    activeMainVariant?.attributes,
    activePairedVariant?.attributes,
  ]);

  // If disabled by admin, return null
  if (!enabled) return null;

  // Direct 1-Click Add 2-Step Bundle to Bag
  const handleAddBaseBundle = () => {
    const discountRatio =
      calculation.totalSellingPrice > 0
        ? calculation.finalPayable / calculation.totalSellingPrice
        : 1;

    const bundleGroupId = `bundle-${mainProduct.id}-${activeMainVariant?.id || 'base'}-${activePairedProduct.id}-${activePairedVariant?.id || 'base'}`;

    // Smart Auto-Upgrade: Remove existing standalone (non-bundle) single items to prevent duplicate rows
    const standaloneItems = findStandaloneCartItems(items, [
      mainProduct.id,
      activePairedProduct.id,
    ]);

    if (standaloneItems.length > 0) {
      standaloneItems.forEach((item) => removeItem(item.id));
      pushToast({
        title: 'Upgraded to 2-Step Routine Bundle with savings!',
        tone: 'success',
      });
    }

    // Add Main Product as Bundle Item with Variant
    const mainItem = createBundleCartItem({
      product: {
        id: mainProduct.id,
        name: cleanProductName(mainProduct.name),
        price: effectiveMainPrice,
        image: effectiveMainImage,
        stock: activeMainVariant?.stock ?? 50,
      },
      variant: activeMainVariant
        ? {
            id: activeMainVariant.id,
            name: activeMainVariant.name,
            price: effectiveMainPrice,
            image: effectiveMainImage,
            sku: activeMainVariant.sku,
            stock: activeMainVariant.stock,
            attributes: activeMainVariant.attributes,
          }
        : null,
      bundleId: bundleGroupId,
      bundleName: '2-Step Bundle',
      discountRatio,
      quantity: 1,
    });
    addItem(mainItem);

    // Add Paired Product as Bundle Item with Variant
    const pairedItem = createBundleCartItem({
      product: {
        id: activePairedProduct.id,
        name: cleanProductName(activePairedProduct.name),
        price: effectivePairedPrice,
        image: effectivePairedImage,
        stock: activePairedVariant?.stock ?? activePairedProduct.stock ?? 50,
      },
      variant: activePairedVariant
        ? {
            id: activePairedVariant.id,
            name: activePairedVariant.name,
            price: effectivePairedPrice,
            image: effectivePairedImage,
            sku: activePairedVariant.sku,
            stock: activePairedVariant.stock,
            attributes: activePairedVariant.attributes,
          }
        : null,
      bundleId: bundleGroupId,
      bundleName: '2-Step Bundle',
      discountRatio,
      quantity: 1,
    });
    addItem(pairedItem);

    openCartDrawer();
  };

  return (
    <section className={`w-full ${className}`} aria-label="Frequently Paired With Bundle Section">
      
      {/* ========================================================================= */}
      {/* 1. INLINE LUXURY BUNDLE CARD CONTAINER (PHASE 1)                          */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-[28px] bg-white dark:bg-zinc-900 border border-stone-200/90 dark:border-white/10 shadow-xs space-y-5">
        
        {/* Phase 1: Card Header (• DUO RITUAL + Serif Title + Save Badge) */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
              <span>DUO RITUAL</span>
            </div>
            <h3 className="font-sans text-2xl sm:text-[26px] font-medium font-[500] tracking-tight text-[#122A16] dark:text-white mt-1">
              Frequently Paired With
            </h3>
          </div>

          <span
            className="shrink-0 inline-flex items-center rounded-full bg-[#EAF5EC] dark:bg-emerald-950/60 border border-[#D4EBD9] dark:border-emerald-500/25 px-3.5 py-1 text-[#1E6839] dark:text-emerald-300 shadow-2xs font-inter"
            style={{
              fontSize: '12px',
              fontWeight: 700,
              lineHeight: '16px',
              letterSpacing: 'normal',
            }}
          >
            SAVE ৳{calculation.customerSavings > 0 ? Math.round(calculation.customerSavings) : '150'}
          </span>
        </div>

        {/* ========================================================================= */}
        {/* PHASE 2: STEP 1 - MAIN PRODUCT CAPSULE (REUSABLE)                        */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-stone-200/90 dark:border-white/10 shadow-2xs">
          <SeedBundleProductCapsule
            stepNumber={1}
            stepLabel="MAIN PRODUCT"
            stepLabelColor="text-stone-500 dark:text-stone-400"
            product={{
              ...mainProduct,
              price: effectiveMainPrice,
              image: effectiveMainImage,
              variants: mainVariants,
            }}
            selectedVariantId={selectedMainVariantId}
            onVariantSelect={(varId, pPrice, vStock) => {
              handleMainVariantSelect(varId);
            }}
          />
        </div>

        {/* ========================================================================= */}
        {/* PHASE 3: TRANSITION DIVIDER (+ PAIR WITH)                                */}
        {/* ========================================================================= */}
        <div className="relative py-2 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-dashed border-stone-200 dark:border-white/10" />
          </div>
          <span className="relative z-10 inline-flex items-center gap-1 rounded-full bg-white dark:bg-zinc-900 border border-stone-200/90 dark:border-white/10 px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-600 dark:text-stone-300 shadow-2xs">
            + PAIR WITH
          </span>
        </div>

        {/* ========================================================================= */}
        {/* PHASE 4: STEP 2 - PAIRED PRODUCT CAPSULE (REUSABLE)                      */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-stone-200/90 dark:border-white/10 shadow-2xs">
          <SeedBundleProductCapsule
            stepNumber={2}
            stepLabel="FREQUENTLY PAIRED WITH THIS"
            stepLabelColor="text-emerald-800 dark:text-emerald-400"
            product={{
              ...activePairedProduct,
              price: effectivePairedPrice,
              image: effectivePairedImage,
              variants: pairedVariants,
            }}
            selectedVariantId={selectedPairedVariantId}
            onVariantSelect={(varId, pPrice, vStock) => {
              setSelectedPairedVariantId(varId);
            }}
          />
        </div>

        {/* ========================================================================= */}
        {/* PHASE 5: BUNDLE PRICE ROW & CHECKOUT ACTION SUMMARY                      */}
        {/* ========================================================================= */}
        <div className="pt-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
                BUNDLE PRICE
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-inter font-bold text-xl sm:text-2xl text-[#122A16] dark:text-white leading-none">
                  ৳{Math.round(calculation.finalPayable)}
                </span>
                {calculation.customerSavings > 0 && (
                  <span className="font-inter text-xs sm:text-sm text-stone-400 line-through leading-none">
                    ৳{Math.round(calculation.totalSellingPrice)}
                  </span>
                )}
                {calculation.customerSavings > 0 && (
                  <span className="inline-flex items-center rounded-md bg-[#EAF5EC] dark:bg-emerald-950/50 border border-[#D4EBD9] dark:border-emerald-500/30 px-2 py-0.5 font-inter text-[11px] font-bold text-[#1E6839] dark:text-emerald-300 shadow-2xs">
                    Save ৳{Math.round(calculation.customerSavings)}
                  </span>
                )}
              </div>
            </div>

            {calculation.hasFreeDelivery && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#BBE3CE] dark:border-emerald-500/30 bg-[#F2FAF6] dark:bg-emerald-950/40 px-3 py-1 text-xs font-medium text-[#1E6839] dark:text-emerald-300 shadow-2xs">
                <Check size={12} strokeWidth={2.5} className="text-[#1E6839] dark:text-emerald-400 shrink-0" />
                <span>You Earn Free Delivery</span>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            {/* Primary CTA Button */}
            <button
              type="button"
              onClick={handleAddBaseBundle}
              data-sticky-sentinel="bundle-cta"
              className="w-full h-12 sm:h-13 flex items-center justify-center gap-2 rounded-full bg-[#122A16] hover:bg-[#0c1d0f] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white font-bold text-xs sm:text-[13px] tracking-wide shadow-md active:scale-[0.99] transition-all cursor-pointer"
            >
              <ShoppingBag size={15} />
              <span className="font-inter font-bold">
                Add Both to Bag • ৳{Math.round(calculation.finalPayable)}
              </span>
            </button>

            {/* Interactive Custom Bundle Drawer Trigger Link */}
            <div className="text-center pt-0.5">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition-colors cursor-pointer"
              >
                <span>Create Your Own Bundle (Save up to 30%)</span>
                <span className="text-stone-400 dark:text-stone-500 font-bold ml-0.5">›</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. SLIDE-OVER MULTI-ITEM CUSTOM BUNDLE DRAWER                             */}
      {/* ========================================================================= */}
      <SeedBundleDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        mainProduct={{
          ...mainProduct,
          price: effectiveMainPrice,
          image: effectiveMainImage,
        }}
        initialAddon={{
          ...activePairedProduct,
          price: effectivePairedPrice,
          image: effectivePairedImage,
        }}
        catalogCandidates={catalogCandidates}
      />

    </section>
  );
}
