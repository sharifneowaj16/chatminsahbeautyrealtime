'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, Tag, ChevronRight } from 'lucide-react';
import { safeImageUrl, DEFAULT_SKINCARE_PLACEHOLDER } from '@/lib/safe-image';

export interface ShopDrawerProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number | null;
  image: string;
  category?: string;
  code?: string;
  badge?: string;
}

interface ProductShopDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  products?: ShopDrawerProduct[];
  currentProductId?: string;
}

// Default curated fallback products from Minsah Beauty's top lines
const defaultShopProducts: ShopDrawerProduct[] = [
  {
    id: 'prod-ds-serum',
    name: 'Advanced Niacinamide Glow Serum',
    slug: 'advanced-niacinamide-glow-serum',
    price: 1450,
    image: '/images/categories/Serum.png',
    category: 'Serum Formula',
    code: 'NS-01®',
    badge: 'Best Seller',
  },
  {
    id: 'prod-sunscreen',
    name: 'Ultra-Light Invisible Sunscreen SPF50+',
    slug: 'ultra-light-invisible-sunscreen-spf50',
    price: 1250,
    image: '/images/categories/Sunscreen.png',
    category: 'UV Defense',
    code: 'UV-50™',
    badge: 'Popular',
  },
  {
    id: 'prod-lip-treatment',
    name: 'Hydra-Peptide Lip Therapy Balm',
    slug: 'hydra-peptide-lip-therapy-balm',
    price: 850,
    image: '/images/categories/Lip_Care.png',
    category: 'Lip Care',
    code: 'LP-02™',
  },
  {
    id: 'prod-daily-duo',
    name: 'Radiance Essentials Duo Bundle',
    slug: 'radiance-essentials-duo-bundle',
    price: 2450,
    originalPrice: 2700,
    image: '/images/categories/Skincare.png',
    category: 'Clinical Duo',
    code: 'DUO-01®',
    badge: 'Save 15%',
  },
  {
    id: 'prod-hair-vital',
    name: 'Rosemary Scalp & Hair Vitality Elixir',
    slug: 'rosemary-scalp-hair-vitality-elixir',
    price: 1650,
    image: '/images/categories/Hair_Care.png',
    category: 'Hair Care',
    code: 'HC-03™',
  },
];

export default function ProductShopDrawer({
  isOpen,
  onClose,
  products = defaultShopProducts,
  currentProductId,
}: ProductShopDrawerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize dynamic items synchronously with guaranteed non-empty image strings
  const items = useMemo(() => {
    const list = products && Array.isArray(products) && products.length > 0 ? products : defaultShopProducts;
    const filtered = currentProductId
      ? list.filter((p) => p && p.id !== currentProductId && p.slug !== currentProductId)
      : list;
    const final = filtered.length > 0 ? filtered : defaultShopProducts;
    return final.map((p) => ({
      ...p,
      image: safeImageUrl(p?.image, DEFAULT_SKINCARE_PLACEHOLDER),
    }));
  }, [products, currentProductId]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Shop products menu"
      className="absolute top-[calc(100%+8px)] left-0 z-50 w-[340px] sm:w-[380px] animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
      onMouseLeave={onClose}
    >
      <div className="overflow-hidden rounded-3xl border border-white/20 bg-[#122416]/95 backdrop-blur-2xl shadow-2xl shadow-black/60 text-white ring-1 ring-black/10">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-white/[0.02]">
          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-300/80 font-semibold flex items-center gap-1.5">
            <Sparkles size={11} className="text-emerald-400" />
            Curated Formulations
          </span>
          <span className="text-[10px] font-mono text-white/40">
            {items.length} items
          </span>
        </div>

        {/* Scrollable Products List */}
        <div
          className="max-h-[380px] overflow-y-auto overscroll-contain p-2 space-y-1"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.35) transparent',
          }}
        >
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/products/${item.slug || item.id}`}
              onClick={onClose}
              className="group flex items-center gap-3 p-2 rounded-2xl hover:bg-white/10 active:bg-white/15 transition-all duration-150"
            >
              {/* Product Thumbnail Box */}
              <div className="relative h-13 w-13 flex-shrink-0 overflow-hidden rounded-xl bg-white/10 border border-white/10 flex items-center justify-center p-1 group-hover:border-emerald-400/40 transition-colors">
                <Image
                  src={safeImageUrl(item.image)}
                  alt={item.name || 'Product'}
                  width={52}
                  height={52}
                  className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    // Fallback to placeholder if image fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              {/* Product Info */}
              <div className="min-w-0 flex-1">
                {/* Code / Category & Badge */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] font-mono tracking-wider uppercase text-emerald-300/90 font-medium truncate">
                    {item.code || item.category || 'Formulation'}
                  </span>
                  {item.badge && (
                    <span className="inline-flex items-center rounded-full bg-emerald-400/20 border border-emerald-400/30 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-200">
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Main Product Title */}
                <p className="truncate text-xs font-semibold text-white/95 group-hover:text-emerald-100 transition-colors mt-0.5">
                  {item.name}
                </p>

                {/* Subtitle / Category text */}
                <p className="text-[11px] text-white/60 truncate">
                  {item.category || 'Clinical Skincare'}
                </p>
              </div>

              {/* Subtle hover chevron */}
              <ChevronRight
                size={15}
                className="text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0"
              />
            </Link>
          ))}
        </div>

        {/* Pinned Bottom Footer Link (Shop all products →) */}
        <div className="border-t border-white/10 bg-white/[0.03] p-3 px-4">
          <Link
            href="/shop"
            onClick={onClose}
            className="group flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white hover:text-emerald-300 transition-colors"
          >
            <span>Shop all products</span>
            <ArrowRight
              size={14}
              className="text-white/70 group-hover:text-emerald-300 group-hover:translate-x-1 transition-transform"
            />
          </Link>
        </div>

      </div>
    </div>
  );
}
