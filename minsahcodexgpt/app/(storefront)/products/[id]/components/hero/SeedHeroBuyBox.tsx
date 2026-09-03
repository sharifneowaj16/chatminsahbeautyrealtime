'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Star,
  ShieldCheck,
  Truck,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';
import SeedVariantRail, { ProductVariantItem } from './SeedVariantRail';

export interface SeedHeroBuyBoxProps {
  productId: string;
  sku?: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  shortDescription?: string;
  keyBenefits?: string[];
  variants?: ProductVariantItem[];
  defaultImage?: string;
  onVariantChange?: (variantId: string | null, currentPrice: number, stock: number) => void;
  onImageChange?: (imageUrl: string | null) => void;
  className?: string;
}

export default function SeedHeroBuyBox({
  productId,
  sku = 'DS-01®',
  name,
  price,
  compareAtPrice,
  shortDescription,
  variants = [],
  defaultImage = '/images/categories/Skincare.png',
  onVariantChange,
  onImageChange,
  className = '',
}: SeedHeroBuyBoxProps) {
  const { addItem } = useCart();
  const { openDrawer: openCartDrawer } = useCartDrawer();

  // Selected Variant & Quantity State
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(price);
  const [currentStock, setCurrentStock] = useState<number>(100);
  const [currentImage, setCurrentImage] = useState<string>(defaultImage);
  const [quantity, setQuantity] = useState(1);

  // Sync price if base price prop changes
  useEffect(() => {
    if (!selectedVariantId) {
      setCurrentPrice(price);
    }
  }, [price, selectedVariantId]);

  // Pricing calculation
  const originalPrice = compareAtPrice ?? (currentPrice > 0 ? Math.round(currentPrice * 1.2) : 0);

  // Real-time Bangladesh Dispatch Logic (UTC+6, 3:00 PM Cutoff, Friday Deliveries Enabled)
  const [dispatchStatus, setDispatchStatus] = useState({
    canDispatchToday: true,
    message: 'Order before 3:00 PM for Same-Day Dispatch',
    deliveryGuarantee: 'Guaranteed 24–48 hrs delivery (Friday delivery available)',
  });

  useEffect(() => {
    const calculateDispatch = () => {
      const now = new Date();
      // Convert to Bangladesh Time (UTC+6)
      const bdTime = new Date(now.getTime() + (6 * 60 + now.getTimezoneOffset()) * 60000);
      const hours = bdTime.getHours();
      const minutes = bdTime.getMinutes();

      // Cutoff time: 3:00 PM (15:00)
      const isBeforeCutoff = hours < 15;

      if (isBeforeCutoff) {
        const remainingHours = 14 - hours;
        const remainingMinutes = 59 - minutes;
        setDispatchStatus({
          canDispatchToday: true,
          message: `Order within ${remainingHours}h ${remainingMinutes}m for Same-Day Dispatch`,
          deliveryGuarantee: 'Guaranteed 24–48 hrs delivery (Friday delivery available)',
        });
      } else {
        setDispatchStatus({
          canDispatchToday: false,
          message: 'Orders placed after 3:00 PM will dispatch first thing tomorrow',
          deliveryGuarantee: 'Guaranteed 24–48 hrs delivery (Friday delivery available)',
        });
      }
    };

    calculateDispatch();
    const interval = setInterval(calculateDispatch, 60000);
    return () => clearInterval(interval);
  }, []);

  // Quantity Stepper
  const increaseQty = () => setQuantity((prev) => prev + 1);
  const decreaseQty = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  // Variant change handler
  const handleVariantChange = (varId: string | null, newPrice: number, stock: number) => {
    setSelectedVariantId(varId);
    setCurrentPrice(newPrice);
    setCurrentStock(stock);
    if (onVariantChange) onVariantChange(varId, newPrice, stock);
  };

  const handleImageChange = (imgUrl: string | null) => {
    if (imgUrl) setCurrentImage(imgUrl);
    if (onImageChange) onImageChange(imgUrl);
  };

  // Add to Cart
  const handleAddToCart = () => {
    addItem({
      id: selectedVariantId || productId,
      productId: productId,
      variantId: selectedVariantId || undefined,
      name: name,
      price: currentPrice,
      image: currentImage,
      quantity: quantity,
    });
    openCartDrawer();
  };

  return (
    <div className={`w-full flex flex-col font-sans ${className}`}>
      
      {/* ========================================================================= */}
      {/* 1. SEED CODE PILL (12px md:13px / 500 / #163020)                          */}
      {/* ========================================================================= */}
      <div className="mb-2">
        <span className="inline-flex items-center rounded-full border border-[#163020] dark:border-emerald-400/50 bg-transparent px-2.5 py-0.5 text-xs lg:text-[13px] font-medium tracking-wide text-[#163020] dark:text-emerald-300 select-none">
          {sku} FORMULA
        </span>
      </div>

      {/* ========================================================================= */}
      {/* 2. PRODUCT TITLE H1 (26px Mobile / 28px Tablet / 32px Desktop / #163020)  */}
      {/* ========================================================================= */}
      <h1 className="text-[26px] md:text-[28px] lg:text-[32px] font-medium leading-[1.15] tracking-tight text-[#163020] dark:text-white mb-2.5">
        {name}
      </h1>

      {/* ========================================================================= */}
      {/* 3. REVIEWS & TRUST LINE (13px md:14px / #163020)                          */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1.5 text-xs md:text-sm text-[#163020] dark:text-emerald-200 mb-4">
        <div className="flex text-[#163020] dark:text-emerald-400 text-sm tracking-widest">
          ★★★★★
        </div>
        <span className="font-bold">5.0</span>
        <span className="text-[#163020]/40 dark:text-white/40">•</span>
        <span className="underline underline-offset-2 cursor-pointer hover:opacity-80">
          15,301 Reviews
        </span>
      </div>

      {/* ========================================================================= */}
      {/* 4. CLINICAL / VALUE PITCH (14px Mobile / 15px Tablet / 16px Desktop)      */}
      {/* ========================================================================= */}
      <p className="text-sm md:text-[15px] lg:text-base leading-[1.45] text-[#163020] dark:text-stone-300 mb-4 lg:mb-5">
        {shortDescription ||
          'Targeted botanical complex clinically engineered to fade hyperpigmentation, strengthen skin barrier, and restore radiant glass-skin glow.*'}
      </p>

      {/* ========================================================================= */}
      {/* 5. PRICE ROW & BESTSELLER BADGE (#D4F6A2 Lime Pill)                       */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2.5 mb-4 lg:mb-5">
        <span className="text-[22px] md:text-[24px] lg:text-[26px] font-medium text-[#163020] dark:text-white">
          ৳ {currentPrice.toLocaleString('en-US')}
        </span>

        <span className="rounded-full bg-[#D4F6A2] text-[#163020] px-2.5 py-0.5 text-xs font-bold tracking-wide shadow-xs">
          Bestseller
        </span>

        {originalPrice > currentPrice && (
          <span className="text-sm md:text-[15px] text-stone-400 line-through font-mono">
            ৳ {originalPrice.toLocaleString('en-US')}
          </span>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. MULTI-DIMENSIONAL VARIANT RAIL & PACK SIZES                            */}
      {/* ========================================================================= */}
      {variants && variants.length > 1 && (
        <div className="mb-4">
          <SeedVariantRail
            variants={variants}
            basePrice={price}
            baseStock={currentStock}
            onVariantChange={handleVariantChange}
            onImageChange={handleImageChange}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. LIVE DISPATCH STATUS (3:00 PM Cutoff, Friday Deliveries)                */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-[#163020]/12 dark:border-white/12 bg-white dark:bg-zinc-800/80 p-3 mb-4 lg:mb-5 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-[#163020] dark:text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span>In Stock • {dispatchStatus.message}</span>
        </div>
        <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 pl-4">
          {dispatchStatus.deliveryGuarantee}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 8. CTA BUTTON (Exact Height 54px Desktop / 48px Mobile / #163020)         */}
      {/* ========================================================================= */}
      <div className="flex gap-2.5 mb-2.5">
        {/* Quantity Stepper */}
        <div className="flex items-center rounded-full border border-[#163020]/20 dark:border-white/20 bg-white dark:bg-zinc-800 px-2 h-12 lg:h-[54px] shrink-0">
          <button
            type="button"
            onClick={decreaseQty}
            aria-label="Decrease quantity"
            className="flex h-7 w-7 items-center justify-center text-sm font-bold text-[#163020] dark:text-white hover:opacity-70 active:scale-90"
          >
            −
          </button>
          <span className="w-7 text-center font-mono text-sm font-bold text-[#163020] dark:text-white">
            {quantity}
          </span>
          <button
            type="button"
            onClick={increaseQty}
            aria-label="Increase quantity"
            className="flex h-7 w-7 items-center justify-center text-sm font-bold text-[#163020] dark:text-white hover:opacity-70 active:scale-90"
          >
            +
          </button>
        </div>

        {/* Solid Forest Green Start Now CTA */}
        <button
          type="button"
          onClick={handleAddToCart}
          className="flex-1 h-12 lg:h-[54px] rounded-full bg-[#163020] hover:bg-[#0D2B1D] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white text-[15px] lg:text-base font-semibold tracking-tight shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          <span>Start Now • ৳ {(currentPrice * quantity).toLocaleString('en-US')}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 9. TRUST & GUARANTEE NOTE (13px / #163020 text-muted)                      */}
      {/* ========================================================================= */}
      <p className="text-xs lg:text-[13px] text-[#163020]/75 dark:text-stone-400 text-center mb-5">
        ✓ Guaranteed 24 to 48 hrs delivery • Cash on Delivery Available
      </p>

    </div>
  );
}
