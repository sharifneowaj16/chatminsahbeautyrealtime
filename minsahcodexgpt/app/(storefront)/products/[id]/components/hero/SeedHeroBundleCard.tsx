'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ShoppingBag, Check, Sparkles } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';
import { useToast } from '@/components/ui/ToastProvider';
import SeedBundleDrawer, { BundleProductCandidate } from './SeedBundleDrawer';
import SeedBundleProductCapsule from './SeedBundleProductCapsule';
import { safeImageUrl } from '@/lib/safe-image';
import { createBundleCartItem, findStandaloneCartItems, generateBundleGroupId } from '@/utils/cartItemHelper';
import { estimateDeliveryCharge, extractVariantWeightKg, parseWeightToKg } from '@/lib/buy-now';
import { cleanProductName } from './cleanProductName';
import { FreeDeliveryIncentiveBanner } from '@/components/cart/FreeDeliveryIncentiveBanner';

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
  const { items, addItem, removeItem, freeDeliveryConfig } = useCart();
  const { openDrawer: openCartDrawer } = useCartDrawer();
  const { pushToast } = useToast();

  // Bundle Drawer Open State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Active Paired Product (Only real verified candidates, NO dummy fallback)
  const activePairedProduct: BundleProductCandidate | null = useMemo(() => {
    if (pairedProduct) return pairedProduct;
    if (catalogCandidates.length > 0) return catalogCandidates[0];
    return null;
  }, [pairedProduct, catalogCandidates]);

  // Variant lists
  const mainVariants = useMemo(() => mainProduct.variants || [], [mainProduct.variants]);
  const pairedVariants = useMemo(
    () => activePairedProduct?.variants || [],
    [activePairedProduct?.variants]
  );

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
    } else {
      setSelectedPairedVariantId(null);
    }
  }, [pairedVariants, selectedPairedVariantId]);

  const activeMainVariant = useMemo(() => {
    return mainVariants.find((v) => v.id === selectedMainVariantId) || (mainVariants.length > 0 ? mainVariants[0] : null);
  }, [mainVariants, selectedMainVariantId]);

  const activePairedVariant = useMemo(() => {
    if (!activePairedProduct) return null;
    return pairedVariants.find((v) => v.id === selectedPairedVariantId) || (pairedVariants.length > 0 ? pairedVariants[0] : null);
  }, [activePairedProduct, pairedVariants, selectedPairedVariantId]);

  const effectiveMainPrice = activeMainVariant?.price ?? mainProduct.price;
  const effectiveMainImage = activeMainVariant?.image || mainProduct.image;

  const effectivePairedPrice = activePairedVariant?.price ?? activePairedProduct?.price ?? 0;
  const effectivePairedImage = activePairedVariant?.image || activePairedProduct?.image || '';

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
    if (!activePairedProduct) {
      const hasFreeDelivery = Boolean(
        effectiveMainPrice >= freeDeliveryConfig.nationwideThreshold ||
        mainProduct.hasFreeDelivery ||
        mainProduct.deliveryOfferType === 'FREE'
      );
      return {
        totalSellingPrice: effectiveMainPrice,
        customerSavings: 0,
        finalPayable: effectiveMainPrice,
        hasFreeDelivery,
        remainingForFreeDelivery: hasFreeDelivery
          ? 0
          : Math.max(0, freeDeliveryConfig.nationwideThreshold - effectiveMainPrice),
      };
    }

    const totalSellingPrice = effectiveMainPrice + effectivePairedPrice;
    // Fallback purchase cost: 75% of selling price to guarantee zero loss
    const mainCost = (mainProduct.costPrice != null && Number(mainProduct.costPrice) > 0)
      ? Number(mainProduct.costPrice)
      : effectiveMainPrice * 0.75;
    const pairedCost = (activePairedProduct.costPrice != null && Number(activePairedProduct.costPrice) > 0)
      ? Number(activePairedProduct.costPrice)
      : effectivePairedPrice * 0.75;

    // Weight and courier delivery calculation (outside Dhaka standard)
    const mainWeight = extractVariantWeightKg(activeMainVariant?.attributes) ?? parseWeightToKg(mainProduct.shippingWeight) ?? parseWeightToKg(mainProduct.weight) ?? 0.25;
    const pairedWeight = extractVariantWeightKg(activePairedVariant?.attributes) ?? parseWeightToKg(activePairedProduct.shippingWeight) ?? parseWeightToKg(activePairedProduct.weight) ?? 0.25;

    // 1. Combined parcel courier delivery (bundled into a single shipping parcel)
    const combinedWeight = mainWeight + pairedWeight + 0.1;
    const combinedCourier = estimateDeliveryCharge({
      city: 'Outside Dhaka',
      area: 'Outside',
      parcelWeightKg: combinedWeight,
    }).charge;

    let totalStoreAbsorbedDelivery = 0;
    if (
      mainProduct.deliveryOfferType === 'FREE' ||
      activePairedProduct.deliveryOfferType === 'FREE' ||
      mainProduct.hasFreeDelivery ||
      activePairedProduct.hasFreeDelivery
    ) {
      totalStoreAbsorbedDelivery = combinedCourier;
    } else if (
      mainProduct.deliveryOfferType === 'FIXED' ||
      activePairedProduct.deliveryOfferType === 'FIXED'
    ) {
      const fixedAmount =
        mainProduct.deliveryChargeOutsideDhaka ??
        activePairedProduct.deliveryChargeOutsideDhaka ??
        mainProduct.deliveryOfferAmount ??
        activePairedProduct.deliveryOfferAmount ??
        0;
      totalStoreAbsorbedDelivery = Math.max(0, combinedCourier - Number(fixedAmount));
    }

    // Available profit margin before discount
    const availableMargin = Math.max(
      0,
      totalSellingPrice - (mainCost + pairedCost) - totalStoreAbsorbedDelivery
    );

    // Realistic bundle discount rule:
    // Minimum 5% off total selling price or 15% of net profit margin, whichever is higher,
    // strictly capped so store never sells at a loss (max 80% of available margin).
    const targetSavings = Math.max(
      Math.round(availableMargin * 0.15),
      Math.round(totalSellingPrice * 0.05)
    );
    const maxSafeDiscount = Math.round(availableMargin * 0.8);
    const customerSavings = availableMargin > 0 ? Math.min(targetSavings, maxSafeDiscount) : 0;
    const finalPayable = Math.max(0, totalSellingPrice - customerSavings);

    // Free delivery conditions: 1) finalPayable >= nationwideThreshold, or 2) mainProduct / pairedProduct has special free delivery flag
    const hasFreeDelivery =
      finalPayable >= freeDeliveryConfig.nationwideThreshold ||
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
      remainingForFreeDelivery: hasFreeDelivery
        ? 0
        : Math.max(0, freeDeliveryConfig.nationwideThreshold - finalPayable),
    };
  }, [
    activePairedProduct,
    effectiveMainPrice,
    effectivePairedPrice,
    mainProduct.costPrice,
    mainProduct.hasFreeDelivery,
    mainProduct.weight,
    mainProduct.shippingWeight,
    mainProduct.deliveryOfferType,
    mainProduct.deliveryOfferAmount,
    mainProduct.deliveryChargeOutsideDhaka,
    activeMainVariant?.attributes,
    activePairedVariant?.attributes,
    freeDeliveryConfig.nationwideThreshold,
  ]);

  // If disabled by admin, return null
  if (!enabled) return null;

  // Direct 1-Click Add 2-Step Bundle to Bag
  const handleAddBaseBundle = () => {
    if (!activePairedProduct) return;

    const discountRatio =
      calculation.totalSellingPrice > 0
        ? calculation.finalPayable / calculation.totalSellingPrice
        : 1;

    const bundleGroupId = generateBundleGroupId([
      { productId: mainProduct.id, variantId: activeMainVariant?.id },
      { productId: activePairedProduct.id, variantId: activePairedVariant?.id },
    ]);

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
      bundleGroupId,
      bundleSource: 'hero-card',
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
      bundleGroupId,
      bundleSource: 'hero-card',
      bundleName: '2-Step Bundle',
      discountRatio,
      quantity: 1,
    });
    addItem(pairedItem);

    openCartDrawer();
  };

  return (
    <section className={`w-full ${className}`} aria-label="Frequently Paired With Bundle Section">
      
      {activePairedProduct ? (
        /* ========================================================================= */
        /* 1A. INLINE LUXURY DUO BUNDLE CARD (WHEN PAIRED PRODUCT EXISTS)            */
        /* ========================================================================= */
        <div className="p-5 sm:p-6 rounded-[28px] bg-white dark:bg-zinc-900 border border-stone-200/90 dark:border-white/10 shadow-xs space-y-5">
          
          {/* Card Header (• DUO RITUAL + Title + Save Badge) */}
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

            {/* Top-Right Badge: Only shown when there is genuine savings */}
            {calculation.customerSavings > 0 && (
              <span className="shrink-0 inline-flex items-center rounded-full bg-[#EAF5EC] dark:bg-emerald-950/60 border border-[#D4EBD9] dark:border-emerald-500/25 px-3.5 py-1 text-[#1E6839] dark:text-emerald-300 shadow-2xs font-inter text-xs font-bold leading-4">
                SAVE ৳{Math.round(calculation.customerSavings)}
              </span>
            )}
          </div>

          {/* STEP 1 - MAIN PRODUCT CAPSULE */}
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
              onVariantSelect={(varId) => {
                handleMainVariantSelect(varId);
              }}
            />
          </div>

          {/* TRANSITION DIVIDER (+ PAIR WITH) */}
          <div className="relative py-2 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dashed border-stone-200 dark:border-white/10" />
            </div>
            <span className="relative z-10 inline-flex items-center gap-1 rounded-full bg-white dark:bg-zinc-900 border border-stone-200/90 dark:border-white/10 px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-600 dark:text-stone-300 shadow-2xs">
              + PAIR WITH
            </span>
          </div>

          {/* STEP 2 - PAIRED PRODUCT CAPSULE */}
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
              onVariantSelect={(varId) => {
                setSelectedPairedVariantId(varId);
              }}
            />
          </div>

          {/* BUNDLE PRICE ROW & CHECKOUT ACTION SUMMARY */}
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

            {/* Incentive banner for free delivery when not yet unlocked */}
            {!calculation.hasFreeDelivery && calculation.remainingForFreeDelivery > 0 && (
              <FreeDeliveryIncentiveBanner
                isUnlocked={false}
                remainingAmount={calculation.remainingForFreeDelivery}
              />
            )}

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

              {/* Interactive Custom Bundle Drawer Trigger */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  className="w-full py-2.5 px-3.5 flex items-center justify-between rounded-xl bg-stone-50 hover:bg-stone-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 border border-stone-200/80 dark:border-white/10 text-xs text-stone-700 dark:text-stone-300 transition-colors cursor-pointer group"
                >
                  <span className="flex items-center gap-1.5 font-medium truncate">
                    <Sparkles size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-[#122A16] dark:text-white font-semibold">Want other items?</span>
                    <span className="truncate">Create Custom Bundle</span>
                  </span>
                  <span className="shrink-0 text-emerald-700 dark:text-emerald-300 font-bold font-mono text-[11px] group-hover:translate-x-0.5 transition-transform ml-2">
                    Up to 30% OFF ›
                  </span>
                </button>
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* ========================================================================= */
        /* 1B. STANDALONE CUSTOM BUNDLE ROUTINE BUILDER (WHEN NO PAIRED ITEM EXISTS) */
        /* ========================================================================= */
        <div className="p-5 sm:p-6 rounded-[28px] bg-white dark:bg-zinc-900 border border-stone-200/90 dark:border-white/10 shadow-xs space-y-4">
          {/* Header with SAVE UP TO 30% badge */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
                <span>BUILD YOUR ROUTINE</span>
              </div>
              <h3 className="font-sans text-xl sm:text-2xl font-medium tracking-tight text-[#122A16] dark:text-white mt-1">
                Create Your Custom Bundle
              </h3>
            </div>

            <span className="shrink-0 inline-flex items-center rounded-full bg-[#EAF5EC] dark:bg-emerald-950/60 border border-[#D4EBD9] dark:border-emerald-500/25 px-3 py-1 text-[#1E6839] dark:text-emerald-300 shadow-2xs font-inter text-xs font-bold">
              SAVE UP TO 30%
            </span>
          </div>

          <p className="text-xs sm:text-[13px] text-stone-600 dark:text-stone-300 leading-relaxed">
            Pair this formulation with essentials from our catalog to build your personalized skincare ritual and unlock automated tiered savings:
          </p>

          {/* Tiered discounts pill row */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="rounded-xl border border-stone-200/90 dark:border-white/10 bg-stone-50/70 dark:bg-zinc-800/60 p-2.5 text-center">
              <p className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 tracking-wider">2 Products</p>
              <p className="font-inter font-bold text-xs sm:text-sm text-[#122A16] dark:text-emerald-400 mt-0.5">15% OFF</p>
            </div>
            <div className="rounded-xl border border-stone-200/90 dark:border-white/10 bg-stone-50/70 dark:bg-zinc-800/60 p-2.5 text-center">
              <p className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 tracking-wider">3 Products</p>
              <p className="font-inter font-bold text-xs sm:text-sm text-[#122A16] dark:text-emerald-400 mt-0.5">25% OFF</p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 dark:border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/30 p-2.5 text-center">
              <p className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 tracking-wider">4+ Products</p>
              <p className="font-inter font-bold text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 mt-0.5">30% OFF</p>
            </div>
          </div>

          {/* Primary CTA to open Custom Bundle Drawer */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              data-sticky-sentinel="bundle-cta"
              className="w-full h-12 sm:h-13 flex items-center justify-center gap-2 rounded-full bg-[#122A16] hover:bg-[#0c1d0f] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white font-bold text-xs sm:text-[13px] tracking-wide shadow-md active:scale-[0.99] transition-all cursor-pointer"
            >
              <Sparkles size={15} />
              <span className="font-inter font-bold">
                Build Custom Bundle (+ Choose Add-ons)
              </span>
            </button>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 text-center mt-2">
              ✓ Free Delivery over ৳{freeDeliveryConfig.nationwideThreshold.toLocaleString('en-IN')} • Cash on Delivery Available
            </p>
          </div>
        </div>
      )}

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
          selectedVariantId: activeMainVariant?.id ?? null,
        }}
        initialAddon={
          activePairedProduct
            ? {
                ...activePairedProduct,
                price: effectivePairedPrice,
                image: effectivePairedImage,
                selectedVariantId: activePairedVariant?.id ?? null,
              }
            : null
        }
        catalogCandidates={catalogCandidates}
      />

    </section>
  );
}
