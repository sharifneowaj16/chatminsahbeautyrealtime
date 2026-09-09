'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Check, Sparkles, Layers } from 'lucide-react';

export interface ProductVariantItem {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  attributes?: Record<string, string> | null;
  image?: string | null;
}

export interface SeedVariantRailProps {
  variants?: ProductVariantItem[];
  basePrice: number;
  baseStock: number;
  onVariantChange: (variantId: string | null, price: number, stock: number) => void;
  onImageChange?: (imageUrl: string | null) => void;
  className?: string;
}

function getVariantSize(v: ProductVariantItem): string | null {
  if (v.attributes && typeof v.attributes === 'object') {
    const sizeKeys = ['size', 'Size', 'packSize', 'pack_size', 'volume', 'Volume', 'capacity', 'weight', 'Weight'];
    for (const key of sizeKeys) {
      if (v.attributes[key]) {
        return String(v.attributes[key]).trim();
      }
    }
    for (const [key, val] of Object.entries(v.attributes)) {
      if (val && typeof val === 'string' && ['size', 'volume', 'pack_size', 'weight'].includes(key.toLowerCase())) {
        return val.trim();
      }
    }
  }

  if (v.name) {
    if (v.name.includes('30*2') || v.name.toLowerCase().includes('30ml')) return '30*2 ml';
    if (v.name.includes('80*2') || v.name.toLowerCase().includes('80ml')) return '80*2 ml';
    const match = v.name.match(/\b(\d+(?:\*\d+)?\s*(?:ml|g|oz|kg|l|pcs?|pack))\b/i);
    if (match) return match[1].trim();
  }

  return null;
}

function getVariantShade(v: ProductVariantItem): string | null {
  if (v.attributes && typeof v.attributes === 'object') {
    const shadeKeys = ['shade', 'Shade', 'shadeName', 'color', 'Color', 'colour'];
    for (const key of shadeKeys) {
      if (v.attributes[key]) {
        return String(v.attributes[key]).trim();
      }
    }
  }
  return v.name || null;
}

export default function SeedVariantRail({
  variants = [],
  basePrice,
  baseStock,
  onVariantChange,
  onImageChange,
  className = '',
}: SeedVariantRailProps) {
  // If no variants, return null
  if (!variants || variants.length <= 1) {
    return null;
  }

  // Detect available pack sizes or volume groups (e.g. "30*2 ml", "80*2 ml", "30ml", "50ml")
  const detectedSizes = React.useMemo(() => {
    const sizeSet = new Set<string>();
    variants.forEach((v) => {
      const sizeAttr = getVariantSize(v);
      if (sizeAttr) sizeSet.add(sizeAttr);
    });
    return Array.from(sizeSet);
  }, [variants]);

  // Active Selected State
  const initialSize = React.useMemo(() => {
    if (detectedSizes.length === 0) return null;
    const firstVarSize = variants[0] ? getVariantSize(variants[0]) : null;
    return firstVarSize && detectedSizes.includes(firstVarSize) ? firstVarSize : detectedSizes[0];
  }, [detectedSizes, variants]);

  const [selectedSize, setSelectedSize] = useState<string | null>(initialSize);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    variants[0]?.id || ''
  );
  const [hoveredVariant, setHoveredVariant] = useState<ProductVariantItem | null>(null);

  // Synchronize when variants prop changes
  useEffect(() => {
    if (variants.length > 0) {
      const current = variants.find((v) => v.id === selectedVariantId);
      if (!current) {
        const initial = variants[0];
        setSelectedVariantId(initial.id);
        const initialSizeVal = getVariantSize(initial);
        if (initialSizeVal) setSelectedSize(initialSizeVal);
      }
    }
  }, [variants, selectedVariantId]);

  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Filter variants by selected size if multi-dimensional, otherwise show all
  const filteredVariants = React.useMemo(() => {
    if (!selectedSize || detectedSizes.length === 0) return variants;
    const matching = variants.filter((v) => getVariantSize(v) === selectedSize);
    return matching.length > 0 ? matching : variants;
  }, [variants, selectedSize, detectedSizes.length]);

  // Check scroll capabilities
  const checkScroll = () => {
    if (!railRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = railRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [filteredVariants]);

  const scrollRail = (direction: 'left' | 'right') => {
    if (!railRef.current) return;
    const scrollAmount = direction === 'left' ? -180 : 180;
    railRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    setTimeout(checkScroll, 300);
  };

  // Handle pack size selection (immediately switches active variant & notifies parent)
  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);

    // Find all variants that match this size
    const matching = variants.filter((v) => getVariantSize(v) === size);
    if (matching.length === 0) return;

    // Check if the currently selected variant already matches this size
    const currentMatches = matching.find((v) => v.id === selectedVariantId);
    const currentVariant = variants.find((v) => v.id === selectedVariantId);
    const currentShade = currentVariant ? getVariantShade(currentVariant) : null;
    const shadeMatch = currentShade ? matching.find((v) => getVariantShade(v) === currentShade) : null;

    const targetVariant = currentMatches || shadeMatch || matching[0];

    if (targetVariant) {
      setSelectedVariantId(targetVariant.id);
      onVariantChange(targetVariant.id, targetVariant.price, targetVariant.stock);
      if (targetVariant.image) {
        onImageChange?.(targetVariant.image);
      }
    }
  };

  // Handle swatch selection
  const handleSelect = (v: ProductVariantItem) => {
    setSelectedVariantId(v.id);
    const vSize = getVariantSize(v);
    if (vSize && vSize !== selectedSize) {
      setSelectedSize(vSize);
    }
    onVariantChange(v.id, v.price, v.stock);
    if (v.image) {
      onImageChange?.(v.image);
    }
  };

  // Active variant object
  const activeVariant =
    variants.find((v) => v.id === selectedVariantId) || filteredVariants[0] || variants[0];

  return (
    <div className={`space-y-3.5 ${className}`}>
      
      {/* ========================================================================= */}
      {/* 1. PACK SIZE / VOLUME SELECTOR (e.g. 30*2 ml vs 80*2 ml)                  */}
      {/* ========================================================================= */}
      {detectedSizes.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Select Pack Size
            </span>
            {selectedSize && (
              <span className="font-mono text-xs font-semibold text-[#1c3a13] dark:text-emerald-400">
                {selectedSize}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {detectedSizes.map((size) => {
              const isSelected = selectedSize === size;
              const isBigPack = size.includes('80') || size.toLowerCase().includes('big') || size.toLowerCase().includes('large') || size.toLowerCase().includes('salon');
              const matchingForSize = variants.filter((v) => getVariantSize(v) === size);
              const sizePrice = matchingForSize[0]?.price ?? basePrice;

              return (
                <button
                  key={`size-btn-${size}`}
                  type="button"
                  onClick={() => handleSizeSelect(size)}
                  className={`relative flex items-center justify-between p-2.5 px-3.5 rounded-2xl border text-left transition-all duration-200 ${
                    isSelected
                      ? 'border-[#1c3a13] bg-[#1c3a13]/5 dark:border-emerald-400 dark:bg-emerald-950/30 ring-1 ring-[#1c3a13] dark:ring-emerald-400'
                      : 'border-black/10 dark:border-white/10 bg-white/60 dark:bg-zinc-800/60 hover:border-black/25 dark:hover:border-white/25'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-bold text-[#1c3a13] dark:text-white truncate">
                      {size === '30*2 ml' ? '30*2 ml (Small Pack)' : size === '80*2 ml' ? '80*2 ml (Big Pack)' : size}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-inter font-bold text-xs text-[#1c3a13] dark:text-emerald-300">
                      ৳{Math.round(sizePrice)}
                    </p>
                    {isBigPack && (
                      <span className="inline-block mt-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 dark:text-emerald-300">
                        Save 20%
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SHADE / VARIANT SWATCH RAIL (Horizontal Smooth Scrolling Track)        */}
      {/* ========================================================================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Shade / Formulation ({filteredVariants.length} available)
          </span>
          <span className="font-mono text-xs font-bold text-[#1c3a13] dark:text-emerald-400 truncate max-w-[200px]">
            {hoveredVariant ? hoveredVariant.name : activeVariant?.name}
          </span>
        </div>

        {/* Rail Container */}
        <div className="relative group/rail">
          
          {/* Left Arrow */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollRail('left')}
              aria-label="Scroll variants left"
              className="absolute -left-2.5 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 dark:bg-zinc-800 text-stone-900 dark:text-white shadow-md border border-black/10 dark:border-white/15 hover:scale-105 transition-all"
            >
              <ChevronLeft size={14} />
            </button>
          )}

          {/* Horizontal Swatch Track */}
          <div
            ref={railRef}
            onScroll={checkScroll}
            className="flex items-center gap-2.5 overflow-x-auto overflow-y-hidden py-1.5 px-1 no-scrollbar scroll-smooth"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {filteredVariants.map((v, idx) => {
              const isSelected = v.id === selectedVariantId;
              const isHovered = hoveredVariant?.id === v.id;
              const isOutOfStock = v.stock <= 0;

              return (
                <div
                  key={`variant-rail-item-${v.id}`}
                  className="relative shrink-0"
                  onMouseEnter={() => setHoveredVariant(v)}
                  onMouseLeave={() => setHoveredVariant(null)}
                >
                  <button
                    type="button"
                    onClick={() => handleSelect(v)}
                    disabled={isOutOfStock}
                    aria-label={`Select ${v.name}, Price ৳${v.price}`}
                    className={`group relative flex h-13 w-13 items-center justify-center rounded-2xl overflow-hidden border transition-all duration-200 ${
                      isSelected
                        ? 'border-[#1c3a13] ring-2 ring-[#1c3a13] dark:border-emerald-400 dark:ring-emerald-400 scale-105 shadow-md'
                        : isOutOfStock
                        ? 'border-black/5 dark:border-white/5 opacity-40 cursor-not-allowed bg-stone-100 dark:bg-zinc-800'
                        : 'border-black/10 dark:border-white/15 bg-white dark:bg-zinc-800/80 hover:border-black/30 dark:hover:border-white/40 hover:scale-105'
                    }`}
                  >
                    {/* Variant Thumbnail Image */}
                    {v.image && typeof v.image === 'string' && v.image.trim() !== '' ? (
                      <Image
                        src={v.image.trim()}
                        alt={v.name}
                        fill
                        sizes="52px"
                        className="object-cover object-center"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-200 to-stone-300 dark:from-zinc-700 dark:to-zinc-800 text-[10px] font-mono font-bold text-stone-700 dark:text-stone-200 p-1 text-center">
                        {v.name.slice(0, 4)}
                      </div>
                    )}

                    {/* Selected Check Indicator */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-[0.5px]">
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[#1c3a13] shadow-xs">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Right Arrow */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollRail('right')}
              aria-label="Scroll variants right"
              className="absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 dark:bg-zinc-800 text-stone-900 dark:text-white shadow-md border border-black/10 dark:border-white/15 hover:scale-105 transition-all"
            >
              <ChevronRight size={14} />
            </button>
          )}

        </div>

      </div>

    </div>
  );
}
