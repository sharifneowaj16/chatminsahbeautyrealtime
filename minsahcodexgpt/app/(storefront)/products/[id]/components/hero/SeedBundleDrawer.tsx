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

export interface BundleProductCandidate {
  id: string;
  name: string;
  price: number;
  costPrice?: number | null; // Admin purchase cost
  image: string;
  stock: number;
  hasFreeDelivery?: boolean;
  category?: string;
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
  const { addItem } = useCart();
  const { openDrawer: openCartDrawer } = useCartDrawer();

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

  // Fallback catalog candidates if empty
  const allCandidates: BundleProductCandidate[] = useMemo(() => {
    if (catalogCandidates.length > 0) return catalogCandidates;
    return [
      {
        id: 'cand-1',
        name: 'Deep Moisture Barrier Cream',
        price: 1200,
        costPrice: 700,
        image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80',
        stock: 24,
        hasFreeDelivery: true,
        category: 'Moisturizer',
      },
      {
        id: 'cand-2',
        name: 'UV Shield SPF 50+ Sunscreen',
        price: 1100,
        costPrice: 650,
        image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=400&q=80',
        stock: 35,
        hasFreeDelivery: false,
        category: 'Sun Care',
      },
      {
        id: 'cand-3',
        name: 'Centella Calming Relief Toner',
        price: 950,
        costPrice: 500,
        image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=400&q=80',
        stock: 18,
        hasFreeDelivery: true,
        category: 'Toner',
      },
      {
        id: 'cand-4',
        name: 'Peptide Eye Lift Contour Serum',
        price: 1350,
        costPrice: 750,
        image: 'https://images.unsplash.com/photo-1608248597359-54316d7a5b39?auto=format&fit=crop&w=400&q=80',
        stock: 12,
        hasFreeDelivery: false,
        category: 'Eye Care',
      },
    ];
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
  // Real Benefit = Sum(Selling Price - Purchase Cost)
  // 2 Products: 15% of Real Benefit Discount
  // 3 Products: 25% of Real Benefit Discount
  // 4+ Products: 30% of Real Benefit Discount
  // =========================================================================
  const bundleCalculation = useMemo(() => {
    const itemCount = selectedProducts.length;
    let totalSellingPrice = 0;
    let totalCostPrice = 0;
    let hasAnyFreeDelivery = false;

    selectedProducts.forEach((p) => {
      totalSellingPrice += p.price;
      // If admin didn't set costPrice, estimate conservative 60% purchase cost to guarantee zero loss
      const estimatedCost = p.costPrice != null ? p.costPrice : p.price * 0.6;
      totalCostPrice += estimatedCost;
      if (p.hasFreeDelivery) {
        hasAnyFreeDelivery = true;
      }
    });

    const realBenefit = Math.max(0, totalSellingPrice - totalCostPrice);

    // Tiered percentage of Real Benefit
    let discountPercentageOfBenefit = 0;
    if (itemCount === 2) {
      discountPercentageOfBenefit = 0.15; // 15% of profit
    } else if (itemCount === 3) {
      discountPercentageOfBenefit = 0.25; // 25% of profit
    } else if (itemCount >= 4) {
      discountPercentageOfBenefit = 0.30; // 30% of profit
    }

    const customerSavings = Math.round(realBenefit * discountPercentageOfBenefit);
    const finalPayable = Math.max(0, totalSellingPrice - customerSavings);
    const ownerNetProfit = Math.round(realBenefit - customerSavings);

    return {
      itemCount,
      totalSellingPrice,
      realBenefit,
      discountRateText:
        itemCount === 2
          ? '15% of Profit Saved'
          : itemCount === 3
          ? '25% of Profit Saved'
          : itemCount >= 4
          ? '30% of Profit Saved'
          : 'Regular Single Item',
      customerSavings,
      finalPayable,
      ownerNetProfit,
      hasAnyFreeDelivery,
    };
  }, [selectedProducts]);

  // Handle Add to Cart
  const handleAddBundleToCart = () => {
    // Add all selected products to cart with proportionally distributed bundle savings
    const discountRatio =
      bundleCalculation.totalSellingPrice > 0
        ? bundleCalculation.finalPayable / bundleCalculation.totalSellingPrice
        : 1;

    selectedProducts.forEach((p) => {
      const adjustedPrice = Math.round(p.price * discountRatio);
      addItem({
        id: `bundle-${p.id}`,
        productId: p.id,
        name: `${p.name} [Bundle Offer]`,
        price: adjustedPrice,
        image: p.image,
        quantity: 1,
      });
    });

    onClose();
    openCartDrawer();
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden ${className}`}>
      
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
              Add 2 items for 15% profit savings, 3 items for 25%, or 4+ items for 30% discount!
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
                              {item.name}
                            </p>
                          </div>
                          <p className="text-xs font-mono font-bold text-stone-600 dark:text-stone-300 mt-0.5">
                            ৳ {item.price.toLocaleString('en-US')}
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
                  className="w-full h-10 pl-9 pr-4 rounded-xl border border-black/15 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#122A16] dark:focus:ring-emerald-400"
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
                              {candidate.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-mono font-bold text-[#122A16] dark:text-emerald-400">
                                ৳ {candidate.price.toLocaleString('en-US')}
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

              <div className="space-y-1 text-xs text-emerald-900 dark:text-emerald-300/90 font-mono">
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400 font-sans">Total Selling Value:</span>
                  <span>৳ {bundleCalculation.totalSellingPrice.toLocaleString('en-US')}</span>
                </div>
                {bundleCalculation.customerSavings > 0 && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                    <span className="font-sans">Your Real Profit Discount:</span>
                    <span>− ৳ {bundleCalculation.customerSavings.toLocaleString('en-US')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400 font-sans">Nationwide Delivery:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {bundleCalculation.hasAnyFreeDelivery ? 'FREE (৳ 0)' : 'Standard'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-500/20 flex items-baseline justify-between">
                <span className="text-xs font-bold text-stone-900 dark:text-white">
                  Final Payable Amount:
                </span>
                <span className="text-lg font-mono font-extrabold text-[#122A16] dark:text-emerald-400">
                  ৳ {bundleCalculation.finalPayable.toLocaleString('en-US')}
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
              <span>
                ADD COMPLETE BUNDLE ({bundleCalculation.itemCount} ITEMS • ৳ {bundleCalculation.finalPayable.toLocaleString('en-US')})
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
