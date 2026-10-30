'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import {
  X,
  Search,
  Plus,
  Trash2,
  Sparkles,
  ShoppingBag,
  Truck,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';
import { safeImageUrl } from '@/lib/safe-image';
import { createBundleCartItem, generateBundleGroupId } from '@/utils/cartItemHelper';
import { estimateDeliveryCharge, parseWeightToKg } from '@/lib/buy-now';
import type { ProductVariantItem } from './SeedVariantRail';
import { cleanProductName } from './cleanProductName';
import { FreeDeliveryIncentiveBanner } from '@/components/cart/FreeDeliveryIncentiveBanner';
import { useOfferEngine } from '@/contexts/OfferEngineContext';

export interface BundleProductCandidate {
  id: string;
  name: string;
  price: number;
  costPrice?: number | null; // Admin purchase cost
  image: string;
  stock: number;
  hasFreeDelivery?: boolean;
  category?: string;
  variants?: ProductVariantItem[];
  selectedVariantId?: string | null;
  weight?: string | number | null;
  shippingWeight?: string | number | null;
  deliveryOfferType?: string | null;
  deliveryOfferAmount?: number | null;
  deliveryChargeInsideDhaka?: number | null;
  deliveryChargeOutsideDhaka?: number | null;
}

export interface SeedBundleDrawerProps {
  /** Drawer open state */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Anchor / Main Product */
  mainProduct: BundleProductCandidate;
  /** Initial suggested paired product */
  initialAddon?: BundleProductCandidate | null;
  /** Available catalog products to search from */
  catalogCandidates?: BundleProductCandidate[];
  /** Optional custom class */
  className?: string;
}

export default function SeedBundleDrawer({
  isOpen,
  onClose,
  mainProduct,
  initialAddon,
  catalogCandidates = [],
  className = '',
}: SeedBundleDrawerProps) {
  const { addBundleItems, freeDeliveryConfig } = useCart();
  const { openDrawer: openCartDrawer } = useCartDrawer();
  const { bundles: bundleConfig } = useOfferEngine();

  // Selected Products in Custom Bundle (Main product is always anchor)
  const [selectedProducts, setSelectedProducts] = useState<BundleProductCandidate[]>([
    mainProduct,
  ]);

  // Synchronize when drawer opens or initialAddon changes
  useEffect(() => {
    if (isOpen) {
      if (initialAddon && initialAddon.id !== mainProduct.id) {
        setSelectedProducts([mainProduct, initialAddon]);
      } else {
        setSelectedProducts([mainProduct]);
      }
    }
  }, [isOpen, mainProduct, initialAddon]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredCandidateId, setHoveredCandidateId] = useState<string | null>(null);

  // Lock body scroll & ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Catalog candidates (only real catalog candidates, no dummy Unsplash products)
  const allCandidates: BundleProductCandidate[] = useMemo(() => {
    return catalogCandidates;
  }, [catalogCandidates]);

  // Filter candidates based on search and exclude already selected items
  const filteredCandidates = useMemo(() => {
    const selectedIds = new Set(selectedProducts.map((p) => p.id));
    return allCandidates.filter((p) => {
      if (selectedIds.has(p.id)) return false;
      if (!searchQuery.trim()) return true;
      return (
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [allCandidates, selectedProducts, searchQuery]);

  // Add Product to Bundle
  const addProductToBundle = (product: BundleProductCandidate) => {
    if (product.stock <= 0) return;
    setSelectedProducts((prev) => [...prev, product]);
    setSearchQuery('');
  };

  // Remove Product from Bundle (cannot remove mainProduct)
  const removeProductFromBundle = (id: string) => {
    if (id === mainProduct.id) return;
    setSelectedProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // =========================================================================
  // VIP REAL BENEFIT MATHEMATICAL ENGINE
  // Formula:
  // Real Benefit = Max(0, Sum(Selling Price) - Sum(Purchase Cost) - Sum(Store Absorbed Delivery))
  // 2 Products: 15% of Real Benefit Discount
  // 3 Products: 25% of Real Benefit Discount
  // 4+ Products: 30% of Real Benefit Discount
  // =========================================================================
  const bundleCalculation = useMemo(() => {
    const itemCount = selectedProducts.length;
    let totalSellingPrice = 0;
    let totalCostPrice = 0;
    let totalStoreAbsorbedDelivery = 0;
    let hasAnyFreeDelivery = false;

    const costRatio = bundleConfig?.estimatedCostRatio ?? 0.75;

    selectedProducts.forEach((p) => {
      totalSellingPrice += p.price;
      const estimatedCost = (p.costPrice != null && Number(p.costPrice) > 0)
        ? Number(p.costPrice)
        : p.price * costRatio;
      totalCostPrice += estimatedCost;
      if (p.hasFreeDelivery || p.deliveryOfferType === 'FREE') {
        hasAnyFreeDelivery = true;
      }

      // Calculate real delivery cost absorbed by store (outside Dhaka standard)
      const productWeight = parseWeightToKg(p.shippingWeight) ?? parseWeightToKg(p.weight) ?? 0.25;
      const totalParcelWeight = productWeight + 0.1; // 100g default packaging
      const courierCost = estimateDeliveryCharge({
        city: 'Outside Dhaka',
        area: 'Outside',
        parcelWeightKg: totalParcelWeight,
      }).charge;

      let absorbedDelivery = 0;
      if (p.deliveryOfferType === 'FREE' || p.hasFreeDelivery) {
        absorbedDelivery = courierCost;
      } else if (p.deliveryOfferType === 'FIXED') {
        const fixedCustomerRate = p.deliveryChargeOutsideDhaka ?? p.deliveryOfferAmount ?? 0;
        absorbedDelivery = Math.max(0, courierCost - Number(fixedCustomerRate));
      }
      totalStoreAbsorbedDelivery += absorbedDelivery;
    });

    const realBenefit = Math.max(0, totalSellingPrice - totalCostPrice - totalStoreAbsorbedDelivery);

    // Tiered percentage of Real Benefit from Admin Offer Engine
    const tier2Rate = (bundleConfig?.twoStepDiscountPercent ?? 15) / 100;
    const tier3Rate = (bundleConfig?.threeStepDiscountPercent ?? 25) / 100;
    const tier4Rate = (bundleConfig?.fourStepDiscountPercent ?? 30) / 100;

    let discountPercentageOfBenefit = 0;
    if (itemCount === 2) {
      discountPercentageOfBenefit = tier2Rate;
    } else if (itemCount === 3) {
      discountPercentageOfBenefit = tier3Rate;
    } else if (itemCount >= 4) {
      discountPercentageOfBenefit = tier4Rate;
    }

    const customerSavings = Math.round(realBenefit * discountPercentageOfBenefit);
    const finalPayable = Math.max(0, totalSellingPrice - customerSavings);
    const ownerNetProfit = Math.round(realBenefit - customerSavings);

    const isFreeDelivery =
      finalPayable >= freeDeliveryConfig.nationwideThreshold || hasAnyFreeDelivery;

    const tier2Percent = bundleConfig?.twoStepDiscountPercent ?? 15;
    const tier3Percent = bundleConfig?.threeStepDiscountPercent ?? 25;
    const tier4Percent = bundleConfig?.fourStepDiscountPercent ?? 30;

    return {
      itemCount,
      totalSellingPrice,
      realBenefit,
      totalStoreAbsorbedDelivery,
      discountRateText:
        itemCount === 2
          ? `${tier2Percent}% of Profit Saved`
          : itemCount === 3
          ? `${tier3Percent}% of Profit Saved`
          : itemCount >= 4
          ? `${tier4Percent}% of Profit Saved`
          : 'Regular Single Item',
      customerSavings,
      finalPayable,
      ownerNetProfit,
      hasAnyFreeDelivery: isFreeDelivery,
      remainingForFreeDelivery: isFreeDelivery
        ? 0
        : Math.max(0, freeDeliveryConfig.nationwideThreshold - finalPayable),
    };
  }, [selectedProducts, freeDeliveryConfig.nationwideThreshold, bundleConfig]);

  // Handle Add to Cart
  const handleAddBundleToCart = async () => {
    // Add all selected products to cart with proportionally distributed bundle savings
    const discountRatio =
      bundleCalculation.totalSellingPrice > 0
        ? bundleCalculation.finalPayable / bundleCalculation.totalSellingPrice
        : 1;

    const bundleGroupId = generateBundleGroupId(
      selectedProducts.map((p) => {
        const activeVar = p.selectedVariantId
          ? p.variants?.find((v) => v.id === p.selectedVariantId) ?? p.variants?.[0] ?? null
          : p.variants?.[0] ?? null;
        return {
          productId: p.id,
          variantId: activeVar?.id ?? null,
        };
      })
    );
    const stepName = `${selectedProducts.length}-Step Bundle`;

    const bundleItems = selectedProducts.map((p) => {
      const activeVar = p.selectedVariantId
        ? p.variants?.find((v) => v.id === p.selectedVariantId) ?? p.variants?.[0] ?? null
        : p.variants?.[0] ?? null;
      return createBundleCartItem({
        product: {
          id: p.id,
          name: p.name,
          price: p.price,
          image: p.image,
          stock: p.stock,
        },
        variant: activeVar
          ? {
              id: activeVar.id,
              name: activeVar.name,
              price: p.price,
              image: p.image,
              sku: activeVar.sku,
              stock: activeVar.stock,
              attributes: activeVar.attributes,
            }
          : null,
        bundleId: bundleGroupId,
        bundleGroupId,
        bundleSource: 'custom-drawer',
        bundleName: stepName,
        discountRatio,
        quantity: 1,
      });
    });

    await addBundleItems(bundleItems);
    onClose();
    openCartDrawer();
  };

  if (!isOpen || (bundleConfig && bundleConfig.enabled === false)) return null;

  const tier2Percent = bundleConfig?.twoStepDiscountPercent ?? 15;
  const tier3Percent = bundleConfig?.threeStepDiscountPercent ?? 25;
  const tier4Percent = bundleConfig?.fourStepDiscountPercent ?? 30;

  return (
    <div className={`fixed inset-0 z-[180] overflow-hidden overflow-x-hidden no-scrollbar ${className}`}>
      
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Right Drawer Container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-6 sm:pl-10">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bundle-builder-title"
          className="w-screen max-w-lg bg-[#FAFAF7] dark:bg-zinc-900 border-l border-black/10 dark:border-white/10 shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300"
        >
          
          {/* ===================================================================== */}
          {/* 1. DRAWER HEADER                                                      */}
          {/* ===================================================================== */}
          <div className="p-6 border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-mono font-bold tracking-wider text-emerald-800 dark:text-emerald-300">
                  VIP BUNDLE BUILDER
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  {selectedProducts.length} Items Selected
                </span>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close bundle builder drawer"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 dark:border-white/15 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-700 transition-all active:scale-95"
              >
                <X size={16} />
              </button>
            </div>

            <h2
              id="bundle-builder-title"
              className="mt-3 text-xl font-bold tracking-tight text-[#122A16] dark:text-white"
            >
              Build Your Custom Routine Bundle
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              Add 2 items for {tier2Percent}% profit savings, 3 items for {tier3Percent}%, or 4+ items for {tier4Percent}% discount!
            </p>
          </div>

          {/* ===================================================================== */}
          {/* 2. DRAWER SCROLLABLE BODY                                             */}
          {/* ===================================================================== */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Selected Products Stack */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Your Bundle Selection
                </span>
                {bundleCalculation.hasAnyFreeDelivery && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    <Truck size={12} />
                    <span>Free Delivery Qualified</span>
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                {selectedProducts.map((item, idx) => {
                  const isMain = item.id === mainProduct.id;
                  return (
                    <div
                      key={`selected-bundle-item-${item.id}`}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        isMain
                          ? 'bg-[#122A16]/5 dark:bg-emerald-950/20 border-[#122A16]/20 dark:border-emerald-500/30'
                          : 'bg-white dark:bg-zinc-800/90 border-black/10 dark:border-white/10 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-stone-100 dark:bg-zinc-700 shrink-0 border border-black/5 dark:border-white/10">
                          <Image
                            src={safeImageUrl(item.image)}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            {isMain && (
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-[#122A16] dark:bg-emerald-500 text-white px-1.5 py-0.2 rounded-md">
                                Anchor Item
                              </span>
                            )}
                            <p className="text-xs font-bold text-[#122A16] dark:text-white truncate">
                              {cleanProductName(item.name)}
                            </p>
                          </div>
                          <p className="text-xs font-inter font-bold text-stone-600 dark:text-stone-300 mt-0.5">
                            ৳{Math.round(item.price)}
                          </p>
                        </div>
                      </div>

                      {/* Remove button (disabled for main product) */}
                      {!isMain && (
                        <button
                          type="button"
                          onClick={() => removeProductFromBundle(item.id)}
                          aria-label={`Remove ${item.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Search & Add Products Section */}
            <div className="space-y-3 pt-2 border-t border-black/10 dark:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Add More Products to Bundle
                </span>
                <span className="text-[11px] text-stone-400">
                  {filteredCandidates.length} suggestions
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search product name or category (e.g. Cream, Sunscreen)..."
                  className="w-full h-10 pl-9 pr-4 rounded-xl border border-black/15 dark:border-white/15 bg-white dark:bg-zinc-800 text-base sm:text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#122A16] dark:focus:ring-emerald-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Candidates List with Hover Add Capsule */}
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                {filteredCandidates.map((candidate) => {
                  const isHovered = hoveredCandidateId === candidate.id;
                  const isOutOfStock = candidate.stock <= 0;

                  return (
                    <div
                      key={`candidate-item-${candidate.id}`}
                      onMouseEnter={() => setHoveredCandidateId(candidate.id)}
                      onMouseLeave={() => setHoveredCandidateId(null)}
                      className="group relative p-3 rounded-2xl bg-white dark:bg-zinc-800/90 border border-black/10 dark:border-white/10 shadow-xs transition-all hover:border-[#122A16]/30 dark:hover:border-white/25"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 truncate">
                          <div className="relative h-11 w-11 rounded-xl overflow-hidden bg-stone-100 dark:bg-zinc-700 shrink-0 border border-black/5 dark:border-white/10">
                            <Image
                              src={safeImageUrl(candidate.image)}
                              alt={candidate.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold text-[#122A16] dark:text-white truncate">
                              {cleanProductName(candidate.name)}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-inter font-bold text-[#122A16] dark:text-emerald-400">
                                ৳{Math.round(candidate.price)}
                              </span>
                              {candidate.hasFreeDelivery && (
                                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 rounded-sm">
                                  Free Ship
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Fast Add Icon Button */}
                        <button
                          type="button"
                          onClick={() => addProductToBundle(candidate)}
                          disabled={isOutOfStock}
                          aria-label={`Add ${candidate.name} to bundle`}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#122A16] dark:bg-emerald-500 text-white hover:scale-105 active:scale-95 transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
                        >
                          <Plus size={15} strokeWidth={2.5} />
                        </button>
                      </div>

                      {/* Full-Width Hover Add Capsule Button */}
                      <div
                        className={`mt-2 transition-all duration-200 overflow-hidden ${
                          isHovered ? 'max-h-10 opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => addProductToBundle(candidate)}
                          disabled={isOutOfStock}
                          className="w-full h-8 flex items-center justify-center gap-1.5 rounded-xl bg-[#122A16]/10 hover:bg-[#122A16] dark:bg-emerald-500/15 dark:hover:bg-emerald-500 text-[#122A16] hover:text-white dark:text-emerald-300 dark:hover:text-white text-[11px] font-bold tracking-wide transition-all"
                        >
                          <Plus size={13} />
                          <span>Add to Bundle • Get Instant Profit Savings</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Real Benefit Math Breakdown Card */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-500/25 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-950 dark:text-emerald-200">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Real Benefit Calculation</span>
                </span>
                <span className="font-mono text-emerald-700 dark:text-emerald-300">
                  {bundleCalculation.discountRateText}
                </span>
              </div>

              <div className="space-y-1 text-xs text-emerald-900 dark:text-emerald-300/90 font-inter">
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400 font-sans">Total Selling Value:</span>
                  <span className="font-bold">৳{Math.round(bundleCalculation.totalSellingPrice)}</span>
                </div>
                {bundleCalculation.customerSavings > 0 && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                    <span className="font-sans">Your Real Profit Discount:</span>
                    <span>−৳{Math.round(bundleCalculation.customerSavings)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400 font-sans">Nationwide Delivery:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {bundleCalculation.hasAnyFreeDelivery ? 'FREE (৳0)' : 'Standard'}
                  </span>
                </div>
              </div>

              {/* Free delivery incentive banner when not yet unlocked */}
              {!bundleCalculation.hasAnyFreeDelivery && bundleCalculation.remainingForFreeDelivery > 0 && (
                <FreeDeliveryIncentiveBanner
                  isUnlocked={false}
                  remainingAmount={bundleCalculation.remainingForFreeDelivery}
                  className="mt-2"
                />
              )}

              <div className="pt-2 border-t border-emerald-500/20 flex items-baseline justify-between">
                <span className="text-xs font-bold text-stone-900 dark:text-white">
                  Final Payable Amount:
                </span>
                <span className="text-lg font-inter font-extrabold text-[#122A16] dark:text-emerald-400">
                  ৳{Math.round(bundleCalculation.finalPayable)}
                </span>
              </div>
            </div>

          </div>

          {/* ===================================================================== */}
          {/* 3. DRAWER FOOTER: 1-CLICK ADD BUNDLE ACTION                           */}
          {/* ===================================================================== */}
          <div className="p-4 sm:p-5 border-t border-black/10 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md space-y-2">
            <button
              type="button"
              onClick={handleAddBundleToCart}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-full bg-[#122A16] hover:bg-[#0c1d0f] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white font-semibold text-xs tracking-wide shadow-lg shadow-[#122A16]/20 transition-all active:scale-[0.99]"
            >
              <ShoppingBag size={15} />
              <span className="font-inter font-bold">
                ADD COMPLETE BUNDLE ({bundleCalculation.itemCount} ITEMS • ৳{Math.round(bundleCalculation.finalPayable)})
              </span>
            </button>
            <p className="text-[10px] text-center text-stone-500 dark:text-stone-400">
              {bundleCalculation.hasAnyFreeDelivery
                ? '✓ 100% Free Nationwide Delivery Applied • Cash on Delivery Available'
                : '✓ Cash on Delivery Available Nationwide'}
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
