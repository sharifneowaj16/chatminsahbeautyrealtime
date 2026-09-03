'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Star,
  ShoppingBag,
  ShieldCheck,
  MessageCircle,
  Plus,
  Minus,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';
import SeedVariantRail, { ProductVariantItem } from './SeedVariantRail';

export interface SeedHeroBuyBoxProps {
  productId: string;
  productName: string;
  code?: string;                        // Formulation Code e.g. "DS-01®", "NS-01™", "MB-01"
  badge?: string;                       // Highlight pill e.g. "Bestseller", "Top Rated"
  price: number;
  comparePrice?: number | null;
  scientificPitch?: string | null;      // 2-line clinical value proposition
  rating?: { average: number; total: number };
  stock?: number;
  inStock?: boolean;
  variants?: ProductVariantItem[];
  productImage?: string;
  onVariantChange?: (variantId: string | null, price: number, stock: number) => void;
  onImageChange?: (imageUrl: string | null) => void;
  whatsappNumber?: string;
  className?: string;
}

export default function SeedHeroBuyBox({
  productId,
  productName,
  code = 'DS-01®',
  badge = 'Bestseller',
  price,
  comparePrice,
  scientificPitch,
  rating = { average: 5.0, total: 15301 },
  stock = 50,
  inStock = true,
  variants = [],
  productImage = '/images/categories/Skincare.png',
  onVariantChange,
  onImageChange,
  whatsappNumber = '8801700000000',
  className = '',
}: SeedHeroBuyBoxProps) {
  const { addItem } = useCart();
  const { openDrawer: openCartDrawer } = useCartDrawer();

  // Selected Variant & Pricing state
  const [activeVariantId, setActiveVariantId] = useState<string | null>(
    variants.length > 0 ? variants[0].id : null
  );
  const [currentPrice, setCurrentPrice] = useState<number>(
    variants.length > 0 && variants[0]?.price ? variants[0].price : price
  );
  const [activeStock, setActiveStock] = useState<number>(
    variants.length > 0 && variants[0]?.stock !== undefined ? variants[0].stock : stock
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  // Synchronize price if props price changes
  useEffect(() => {
    if (variants.length === 0) {
      setCurrentPrice(price);
      setActiveStock(stock);
    }
  }, [price, stock, variants.length]);

  const handleVariantSelect = (variantId: string | null, variantPrice: number, variantStock: number) => {
    setActiveVariantId(variantId);
    setCurrentPrice(variantPrice);
    setActiveStock(variantStock);
    onVariantChange?.(variantId, variantPrice, variantStock);
  };

  // =========================================================================
  // LIVE REAL-TIME DISPATCH LOGIC (Bangladesh Timezone, 3:00 PM Cutoff, Friday Deliveries)
  // =========================================================================
  const dispatchStatus = useMemo(() => {
    const now = new Date();
    // UTC+6 Bangladesh offset
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const bdTime = new Date(utc + 3600000 * 6);

    const currentHour = bdTime.getHours();
    const isAvailable = activeStock > 0 && inStock;

    if (isAvailable) {
      if (currentHour < 15) {
        // Before 3:00 PM
        return {
          type: 'same-day',
          title: 'In Stock • Order before 3:00 PM for Same-Day Dispatch',
          subtitle: 'Guaranteed 24–48 hrs delivery (Friday delivery available)',
          indicatorColor: 'bg-emerald-500',
        };
      } else {
        // After 3:00 PM
        return {
          type: 'next-morning',
          title: 'In Stock • Dispatches tomorrow morning',
          subtitle: 'Guaranteed 24–48 hrs fast nationwide delivery',
          indicatorColor: 'bg-emerald-500',
        };
      }
    } else {
      // Out of stock / Pre-order
      return {
        type: 'backorder',
        title: 'Available for Order • Dispatches on next working day (Sat–Thu)',
        subtitle: 'Priority processing upon incoming lab batch',
        indicatorColor: 'bg-amber-500',
      };
    }
  }, [activeStock, inStock]);

  // Default 2-line clinical pitch if none provided by admin
  const displayPitch =
    scientificPitch && scientificPitch.trim() !== ''
      ? scientificPitch
      : 'Active Dermal Formula clinically engineered to target pigmentation, strengthen moisture barrier, and restore radiant glass-skin glow.*';

  // Handle Add to Cart
  const handleAddToCart = async () => {
    if (activeStock <= 0) return;
    setIsAdding(true);
    try {
      const selectedVariantObj = variants.find((v) => v.id === activeVariantId);
      addItem({
        id: activeVariantId ? `${productId}-${activeVariantId}` : productId,
        productId: productId,
        name: selectedVariantObj ? `${productName} (${selectedVariantObj.name})` : productName,
        price: currentPrice,
        image: selectedVariantObj?.image || productImage,
        quantity: quantity,
      });
      openCartDrawer();
    } catch {
      // Graceful fallback
    } finally {
      setIsAdding(false);
    }
  };

  // WhatsApp instant order message
  const whatsappUrl = useMemo(() => {
    const cleanNum = whatsappNumber.replace(/[^0-9]/g, '');
    const selectedVariantObj = variants.find((v) => v.id === activeVariantId);
    const msg = `Hello Minsah Beauty, I would like to order:\n\n*Product:* ${productName}\n${selectedVariantObj ? `*Variant:* ${selectedVariantObj.name}\n` : ''}*Quantity:* ${quantity}\n*Total Price:* ৳ ${(currentPrice * quantity).toLocaleString('en-US')}\n\nPlease confirm my delivery details.`;
    return `https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`;
  }, [whatsappNumber, productName, activeVariantId, variants, quantity, currentPrice]);

  return (
    <div className={`w-full max-w-[448px] space-y-0 ${className}`}>
      
      {/* ========================================================================= */}
      {/* 1. CODE PILL & TITLE (Exact: Pill 12px 500, Title 32px line-height 1.15)  */}
      {/* ========================================================================= */}
      <div>
        {/* Code Badge Pill */}
        {code && (
          <div className="mb-2">
            <span className="inline-flex items-center rounded-full border border-[#122A16]/30 dark:border-white/20 px-2.5 py-1 text-[12px] font-mono font-medium tracking-[0.05em] text-[#122A16] dark:text-emerald-400 bg-transparent">
              {code}
            </span>
          </div>
        )}

        {/* Product Title */}
        <h1 className="text-[32px] sm:text-[34px] font-normal leading-[1.15] tracking-[-0.02em] text-[#122A16] dark:text-white mb-3">
          {productName}
        </h1>

        {/* 5-Star Rating & Review Count (Exact: 13px, gap 6px, stars 14px) */}
        <div className="flex items-center gap-1.5 text-[13px] text-[#122A16] dark:text-stone-300 mb-4">
          <div className="flex items-center gap-1 text-[#122A16] dark:text-emerald-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={`buybox-star-${star}`}
                size={14}
                className="fill-current text-current"
              />
            ))}
          </div>
          <a
            href="#product-reviews"
            className="font-normal hover:underline underline-offset-4 ml-1 transition-colors"
          >
            {rating.total.toLocaleString('en-US')} Reviews
          </a>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SCIENTIFIC VALUE PITCH (Exact: 15px, line-height 1.45, color #122A16) */}
      {/* ========================================================================= */}
      <div className="mb-5">
        <p className="text-[15px] leading-[1.45] text-[#122A16]/85 dark:text-stone-300 font-normal">
          {displayPitch}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 3. PRICE & BESTSELLER BADGE (Exact: Price 24px/500, Badge #CDE6B4/12px)   */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-[24px] sm:text-[26px] font-medium tracking-tight text-[#122A16] dark:text-white font-mono">
          ৳ {currentPrice.toLocaleString('en-US')}
        </span>

        {badge && (
          <span className="inline-flex items-center rounded-full bg-[#CDE6B4] text-[#122A16] px-2.5 py-0.5 text-[12px] font-semibold tracking-wide">
            {badge}
          </span>
        )}

        {comparePrice && comparePrice > currentPrice && (
          <span className="text-[15px] text-stone-400 line-through font-mono">
            ৳ {comparePrice.toLocaleString('en-US')}
          </span>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. MULTI-DIMENSIONAL VARIANT RAIL (Pack Size & Shade Swatches)             */}
      {/* ========================================================================= */}
      {variants && variants.length > 0 && (
        <div className="mb-4">
          <SeedVariantRail
            variants={variants}
            basePrice={price}
            baseStock={stock}
            onVariantChange={handleVariantSelect}
            onImageChange={onImageChange}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. LIVE REAL-TIME DISPATCH STATUS (Bangladesh Cutoff & Delivery Logic)   */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-stone-50/70 dark:bg-zinc-800/60 p-3 shadow-xs space-y-1 mb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-900 dark:text-white">
          <span className={`h-2 w-2 rounded-full ${dispatchStatus.indicatorColor} shrink-0 animate-pulse`} />
          <span>{dispatchStatus.title}</span>
        </div>
        <p className="text-[11px] text-stone-500 dark:text-stone-400 pl-4">
          {dispatchStatus.subtitle}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 6. PRIMARY CTA BUTTON (Exact: Height 48px, Pill 9999px, Font 16px 600)    */}
      {/* ========================================================================= */}
      <div className="space-y-3 mb-3">
        <div className="flex items-center gap-2.5">
          
          {/* Quantity Stepper */}
          <div className="flex h-12 items-center rounded-full border border-black/15 dark:border-white/20 bg-stone-100 dark:bg-zinc-800 px-2 shrink-0">
            <button
              type="button"
              onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-700 dark:text-stone-300 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 transition-all"
            >
              <Minus size={14} />
            </button>
            <span className="w-8 text-center text-sm font-mono font-bold text-stone-900 dark:text-white">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((prev) => Math.min(activeStock || 99, prev + 1))}
              disabled={quantity >= activeStock}
              aria-label="Increase quantity"
              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-700 dark:text-stone-300 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 transition-all"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Seed-Style Solid Forest Green Start Now CTA Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={activeStock <= 0 || isAdding}
            className="flex-1 flex h-12 items-center justify-center gap-2 rounded-full bg-[#122A16] hover:bg-[#0c1d0f] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white font-semibold text-[16px] tracking-[0.01em] shadow-sm active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingBag size={17} />
            <span>
              {activeStock > 0
                ? `Start Now • ৳ ${(currentPrice * quantity).toLocaleString('en-US')}`
                : 'Currently Out of Stock'}
            </span>
          </button>
        </div>

        {/* WhatsApp Fast Order Option */}
        {whatsappNumber && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-emerald-600/30 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100/70 transition-all shadow-xs"
          >
            <MessageCircle size={15} className="text-emerald-600 dark:text-emerald-400" />
            <span>Order via WhatsApp (Instant Checkout)</span>
          </a>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 7. GUARANTEE LINE (Exact: 13px, color #556655, margin 12px 0 24px 0)      */}
      {/* ========================================================================= */}
      <div className="pt-2 text-center">
        <p className="flex items-center justify-center gap-1.5 text-[13px] text-[#556655] dark:text-stone-400 font-normal">
          <ShieldCheck size={14} className="text-[#122A16] dark:text-emerald-400 shrink-0" />
          <span>✓ Guaranteed 24 to 48 hrs delivery • Cash on Delivery Available</span>
        </p>
      </div>

    </div>
  );
}
