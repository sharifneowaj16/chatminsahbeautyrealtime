'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { ChevronDown, Check } from 'lucide-react';
import { extractVariantAttributes } from '@/utils/cartItemHelper';
import { safeImageUrl } from '@/lib/safe-image';
import NodeConnector, { type NodeTarget } from '@/components/ui/NodeConnector';

export interface ProductVariantItem {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  attributes?: Record<string, string> | null;
  image?: string | null;
}

export interface SeedHeroVariantDropdownProps {
  variants?: ProductVariantItem[];
  selectedVariantId: string | null;
  defaultImage?: string;
  galleryImages?: string[];
  onVariantChange: (variantId: string | null, price: number, stock: number) => void;
  onImageChange?: (imageUrl: string | null) => void;
  onHoverImage?: (imageUrl: string | null) => void;
  onSelectVariant?: (variant: ProductVariantItem) => void;
  onOpenChange?: (isOpen: boolean) => void;
  compact?: boolean;
  layout?: 'grid' | 'list';
  className?: string;
}

export function getVariantSize(v: ProductVariantItem): string | null {
  const attrs = extractVariantAttributes(v.attributes, v.name);
  if (attrs.size) return attrs.size;
  if (attrs.volume) return attrs.volume;
  if (v.name) {
    if (v.name.includes('30*2') || v.name.toLowerCase().includes('30ml')) return '30*2 ml';
    if (v.name.includes('80*2') || v.name.toLowerCase().includes('80ml')) return '80*2 ml';
    const match = v.name.match(/\b(\d+(?:\*\d+)?\s*(?:ml|g|oz|kg|l|pcs?|pack))\b/i);
    if (match) return match[1].trim();
  }
  return null;
}

export function parseVariantParts(v: ProductVariantItem): { shade: string; size: string | null } {
  const rawSize = getVariantSize(v);
  let shade = '';

  if (v.attributes && typeof v.attributes === 'object') {
    const shadeKeys = ['shade', 'Shade', 'shadeName', 'color', 'Color', 'colour', 'tone', 'formulation'];
    for (const key of shadeKeys) {
      if (v.attributes[key]) {
        shade = String(v.attributes[key]).trim();
        break;
      }
    }
  }

  if (!shade && v.name) {
    shade = v.name.trim();
  }

  // If shade contains slash like "30g / Rose" or "Rose / 30g", clean it up
  if (shade && shade.includes('/')) {
    const parts = shade.split('/').map((p) => p.trim());
    const sizePart = parts.find((p) => /\b\d+(?:\*\d+)?\s*(?:ml|g|oz|kg|l|pcs?|pack)\b/i.test(p));
    const shadePart = parts.find((p) => p !== sizePart);
    if (shadePart) shade = shadePart;
    if (!rawSize && sizePart) {
      return { shade, size: sizePart };
    }
  }

  // If shade contains the extracted size (e.g. "Rose 30g"), separate them cleanly
  if (rawSize && shade) {
    const regex = new RegExp(`\\b${rawSize.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const cleaned = shade.replace(regex, '').replace(/\s+/g, ' ').trim();
    if (cleaned) {
      shade = cleaned;
    } else {
      // If cleaned is empty, the variant is purely a size (e.g. "50ml")
      return { shade: rawSize, size: null };
    }
  }

  return {
    shade: shade || 'Default',
    size: rawSize || null,
  };
}

export function getVariantShadeName(v: ProductVariantItem): string {
  return parseVariantParts(v).shade;
}

export default function SeedHeroVariantDropdown({
  variants = [],
  selectedVariantId,
  defaultImage = '/images/categories/Skincare.png',
  galleryImages = [],
  onVariantChange,
  onImageChange,
  onHoverImage,
  onSelectVariant,
  onOpenChange,
  compact = false,
  layout = 'grid',
  className = '',
}: SeedHeroVariantDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredVariantId, setHoveredVariantId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [placementSide, setPlacementSide] = useState<'left' | 'right'>('right');
  const [cardWidth, setCardWidth] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [dynamicTargets, setDynamicTargets] = useState<NodeTarget[] | null>(null);

  // Safe fallback targets clamped within the visible popbar (max 5 items)
  const safeStaticTargets: NodeTarget[] = useMemo(() => {
    const ROW_HEIGHT = 44;
    const maxVisible = Math.min(variants.length, 5);
    const activeId = hoveredVariantId || selectedVariantId || (variants[0]?.id ?? '');
    return variants.slice(0, maxVisible).map((v, idx) => {
      const bottomDistance = (maxVisible - 1 - idx) * ROW_HEIGHT + ROW_HEIGHT / 2;
      const yOffset = -(bottomDistance - 15);
      return {
        id: v.id,
        yOffset,
        isActive: v.id === activeId,
        label: v.name,
      };
    });
  }, [variants, selectedVariantId, hoveredVariantId]);

  // Update connector targets based on actual DOM row positions within the visible popbar
  const updateConnectorPositions = useCallback(() => {
    if (!modalRef.current || !listRef.current || variants.length === 0) return;

    const modalRect = modalRef.current.getBoundingClientRect();
    const listRect = listRef.current.getBoundingClientRect();
    const activeId = hoveredVariantId || selectedVariantId || (variants[0]?.id ?? '');

    // Visible bounds inside list container (with 6px padding for socket radius)
    const minVisibleY = listRect.top + 6;
    const maxVisibleY = listRect.bottom - 6;

    // Find all option buttons
    const optionEls = listRef.current.querySelectorAll<HTMLButtonElement>('button[role="option"]');
    if (!optionEls || optionEls.length === 0) return;

    const newTargets: NodeTarget[] = [];
    let hasActiveTarget = false;
    let activeRowY = 0;

    optionEls.forEach((btn, idx) => {
      const v = variants[idx];
      if (!v) return;

      const btnRect = btn.getBoundingClientRect();
      const rowCenterY = btnRect.top + btnRect.height / 2;
      const isItemActive = v.id === activeId;

      if (isItemActive) {
        hasActiveTarget = true;
        activeRowY = rowCenterY;
      }

      // Check if row is visible within the list viewport
      const isVisible = rowCenterY >= minVisibleY && rowCenterY <= maxVisibleY;

      if (isVisible) {
        const bottomDistance = modalRect.bottom - rowCenterY;
        const yOffset = -(bottomDistance - 15);

        newTargets.push({
          id: v.id,
          yOffset,
          isActive: isItemActive,
          label: v.name,
        });
      }
    });

    // Smart Edge Clamping for Active/Selected Variant:
    // If the active variant is scrolled out of view (above top or below bottom),
    // clamp its socket right to the top or bottom visible edge of the popbar!
    if (!hasActiveTarget || !newTargets.some((t) => t.isActive)) {
      const activeVar = variants.find((v) => v.id === activeId) || variants[0];
      if (activeVar) {
        let clampedCenterY: number;
        if (activeRowY > 0 && activeRowY < minVisibleY) {
          clampedCenterY = minVisibleY;
        } else if (activeRowY > maxVisibleY) {
          clampedCenterY = maxVisibleY;
        } else {
          const activeIdx = variants.findIndex((v) => v.id === activeId);
          clampedCenterY = activeIdx === 0 ? minVisibleY : maxVisibleY;
        }

        const bottomDistance = modalRect.bottom - clampedCenterY;
        const yOffset = -(bottomDistance - 15);

        newTargets.push({
          id: activeVar.id,
          yOffset,
          isActive: true,
          label: activeVar.name,
        });
      }
    }

    setDynamicTargets(newTargets);
  }, [variants, selectedVariantId, hoveredVariantId]);

  const connectorTargets = dynamicTargets && dynamicTargets.length > 0 ? dynamicTargets : safeStaticTargets;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper to resolve variant image with gallery image fallback
  const resolveVariantImage = (v: ProductVariantItem, index: number): string => {
    if (v.image && v.image.trim() !== '') return v.image;
    if (galleryImages && galleryImages.length > index && galleryImages[index]) {
      return galleryImages[index];
    }
    const shadeName = (v.name || '').toLowerCase();
    if (shadeName.includes('ivory')) return defaultImage || '/images/categories/Makeup.png';
    if (shadeName.includes('beige')) return '/images/categories/Skincare.png';
    if (shadeName.includes('sand')) return '/images/categories/Sunscreen.png';
    if (index === 0) return defaultImage || '/images/categories/Makeup.png';
    if (index === 1) return '/images/categories/Skincare.png';
    if (index === 2) return '/images/categories/Sunscreen.png';
    return defaultImage || '/images/categories/Skincare.png';
  };

  // Active variant resolution
  const activeVariant = useMemo(() => {
    return (
      variants.find((v) => v.id === selectedVariantId) ||
      (variants.length > 0 ? variants[0] : null)
    );
  }, [variants, selectedVariantId]);

  const activeIndex = useMemo(() => {
    if (!activeVariant) return 0;
    const idx = variants.findIndex((v) => v.id === activeVariant.id);
    return idx >= 0 ? idx : 0;
  }, [variants, activeVariant]);

  const { shade: activeShade, size: activeSize } = useMemo(() => {
    if (!activeVariant) return { shade: 'Select variant', size: null };
    return parseVariantParts(activeVariant);
  }, [activeVariant]);

  // Hovered variant resolution for live interactive hover preview
  const hoveredVariant = useMemo(() => {
    if (!hoveredVariantId) return null;
    return variants.find((v) => v.id === hoveredVariantId) || null;
  }, [variants, hoveredVariantId]);

  const hoveredIndex = useMemo(() => {
    if (!hoveredVariant) return -1;
    const idx = variants.findIndex((v) => v.id === hoveredVariant.id);
    return idx >= 0 ? idx : -1;
  }, [variants, hoveredVariant]);

  // Displayed variant on the trigger button (previews hovered variant if hovering, else locked activeVariant)
  const displayVariant = hoveredVariant || activeVariant;
  const displayIndex = hoveredIndex >= 0 ? hoveredIndex : activeIndex;

  const displayImage = useMemo(() => {
    if (!displayVariant) return defaultImage || null;
    return resolveVariantImage(displayVariant, displayIndex);
  }, [displayVariant, displayIndex, defaultImage, galleryImages]);

  const { shade: displayShade, size: displaySize } = useMemo(() => {
    if (!displayVariant) return { shade: 'Select variant', size: null };
    return parseVariantParts(displayVariant);
  }, [displayVariant]);

  // The permanent locked image of the active selected variant
  const lockedImage = useMemo(() => {
    if (!activeVariant) return defaultImage || null;
    return resolveVariantImage(activeVariant, activeIndex);
  }, [activeVariant, activeIndex, defaultImage, galleryImages]);

  // Pre-warm / preload all variant images for instant zero-latency hover preview
  useEffect(() => {
    if (!isOpen || !variants || variants.length === 0) return;
    variants.forEach((v, idx) => {
      const src = resolveVariantImage(v, idx);
      if (src && typeof window !== 'undefined') {
        const img = new window.Image();
        img.src = src;
      }
    });
  }, [isOpen, variants, galleryImages, defaultImage]);

  // Restore Hero Gallery to the locked variant image
  const restoreLockedImage = () => {
    if (onHoverImage) {
      onHoverImage(null);
    } else if (onImageChange) {
      onImageChange(lockedImage);
    }
  };

  const closeDropdown = () => {
    setHoveredVariantId(null);
    restoreLockedImage();
    setIsOpen(false);
    onOpenChange?.(false);
  };

  const toggleDropdown = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const isLeftHalf = typeof window !== 'undefined' ? centerX < window.innerWidth / 2 : true;
      setPlacementSide(isLeftHalf ? 'right' : 'left');

      const cardEl = containerRef.current.closest('article');
      if (cardEl) {
        const cardRect = cardEl.getBoundingClientRect();
        setCardWidth(cardRect.width);
      }
    }

    const next = !isOpen;
    setIsOpen(next);
    if (!next) {
      restoreLockedImage();
    }
    onOpenChange?.(next);
  };

  // Click outside / Esc key handler
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        (!modalRef.current || !modalRef.current.contains(e.target as Node))
      ) {
        closeDropdown();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeDropdown();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, lockedImage]);

  // Synchronize connector targets and auto-scroll to selected variant on open
  useEffect(() => {
    if (!isOpen) {
      setDynamicTargets(null);
      return;
    }

    const timer = setTimeout(() => {
      updateConnectorPositions();
      const activeEl = listRef.current?.querySelector('[aria-selected="true"]') as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
      updateConnectorPositions();
    }, 40);

    window.addEventListener('resize', updateConnectorPositions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateConnectorPositions);
    };
  }, [isOpen, updateConnectorPositions]);

  // Mouse leave handler for option list
  const handleMouseLeaveList = () => {
    setHoveredVariantId(null);
    restoreLockedImage();
  };

  // Live hover preview handler
  const handleItemMouseEnter = (v: ProductVariantItem, idx: number) => {
    setHoveredVariantId(v.id);
    const targetImg = resolveVariantImage(v, idx);
    if (onHoverImage) {
      onHoverImage(targetImg);
    } else if (onImageChange) {
      onImageChange(targetImg);
    }
  };

  // Handler for selecting a variant
  const handleSelectVariant = (targetVar: ProductVariantItem, idx: number) => {
    closeDropdown();
    onVariantChange(targetVar.id, targetVar.price, targetVar.stock ?? 100);
    const selectedImg = resolveVariantImage(targetVar, idx);
    if (onImageChange) {
      onImageChange(selectedImg);
    }
    if (onHoverImage) {
      onHoverImage(selectedImg);
    }
    if (onSelectVariant) {
      onSelectVariant(targetVar);
    }
  };

  if (!variants || variants.length <= 1) {
    return null;
  }

  // Common Dropdown List Content (preserving 100% design and logic)
  const dropdownListContent = (
    <>
      <div
        className={`${
          compact ? 'text-[9px] px-2.5 py-1.5' : 'text-[10px] px-3.5 py-2'
        } uppercase font-bold text-stone-400 dark:text-stone-500 tracking-wider bg-stone-50/80 dark:bg-zinc-800/40 border-b border-stone-200/80 dark:border-white/10 flex items-center justify-between`}
      >
        <span>Available Formulations &amp; Sizes</span>
        <span className="font-mono text-stone-500">{variants.length} Options</span>
      </div>

      <div
        ref={listRef}
        onScroll={updateConnectorPositions}
        onMouseLeave={handleMouseLeaveList}
        className={`${
          compact ? 'max-h-48 sm:max-h-56' : 'max-h-64 sm:max-h-72'
        } overflow-y-auto flex flex-col gap-[1px] bg-stone-200/60 dark:bg-white/10 p-[1px] scroll-smooth ios-scrollbar`}
      >
        {variants.map((v, idx) => {
          const isSelected = v.id === selectedVariantId;
          const isOOS = v.stock !== undefined && v.stock <= 0;
          const { shade: vShade, size: vSize } = parseVariantParts(v);
          const vImage = resolveVariantImage(v, idx);

          return (
            <button
              key={`hero-var-${v.id}`}
              type="button"
              role="option"
              aria-selected={isSelected}
              disabled={isOOS}
              onClick={() => handleSelectVariant(v, idx)}
              onMouseEnter={() => handleItemMouseEnter(v, idx)}
              onMouseOver={() => handleItemMouseEnter(v, idx)}
              onFocus={() => handleItemMouseEnter(v, idx)}
              className={`w-full ${
                compact ? 'px-2 py-2 sm:px-2.5 sm:py-2.5' : 'px-3 py-2.5 sm:px-3.5 sm:py-3'
              } flex items-center gap-2 sm:gap-2.5 text-left transition-all duration-150 cursor-pointer ${
                isSelected
                  ? 'bg-[#E5EAE1] dark:bg-emerald-950/40 text-[#1c3a13] dark:text-emerald-200 font-medium'
                  : isOOS
                  ? 'opacity-40 cursor-not-allowed bg-stone-50/40 dark:bg-zinc-800/30'
                  : 'bg-white dark:bg-zinc-900 hover:bg-stone-50 dark:hover:bg-zinc-800/80 text-stone-800 dark:text-stone-200'
              }`}
            >
              {/* Left: Thumbnail Image */}
              <div
                className={`relative ${
                  compact ? 'h-7 w-7 sm:h-8 sm:w-8 rounded-lg' : 'h-9 w-9 sm:h-10 sm:w-10 rounded-xl'
                } overflow-hidden shrink-0 border border-stone-200/80 dark:border-white/10 bg-stone-100 dark:bg-zinc-800`}
              >
                {vImage ? (
                  <Image
                    src={safeImageUrl(vImage)}
                    alt={v.name}
                    fill
                    sizes={compact ? '32px' : '40px'}
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-stone-500">
                    {v.name.slice(0, 3)}
                  </div>
                )}
              </div>

              {/* 3-Column Content: Left (Shade + Stock) | Center (Product Size in Middle) | Right (Price + Check) */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 min-w-0 flex-1">
                {/* Column 1: Left - Shade Name with In Stock below */}
                <div className="min-w-0 pr-1">
                  <p
                    className={`${
                      compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'
                    } font-bold truncate leading-tight text-stone-900 dark:text-stone-100`}
                  >
                    {vShade}
                  </p>
                  <p
                    className={`mt-0.5 ${
                      compact ? 'text-[9.5px]' : 'text-[10.5px]'
                    } ${
                      isOOS
                        ? 'text-rose-500 font-medium'
                        : 'text-emerald-700 dark:text-emerald-400 font-medium'
                    }`}
                  >
                    {isOOS ? 'Sold out' : 'In Stock'}
                  </p>
                </div>

                {/* Column 2: Exact Middle - Product Size with Semi-Bold Font */}
                <div className="flex items-center justify-center px-1.5">
                  {vSize ? (
                    <span
                      className={`font-semibold text-stone-800 dark:text-stone-200 font-mono tracking-tight ${
                        compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-[13px]'
                      }`}
                    >
                      {vSize}
                    </span>
                  ) : null}
                </div>

                {/* Column 3: Right - Price + Selection Checkmark */}
                <div className="flex items-center justify-end gap-1.5 shrink-0 pl-1">
                  <span
                    className={`font-inter font-bold ${
                      compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'
                    } text-[#1c3a13] dark:text-emerald-400`}
                  >
                    ৳{Math.round(v.price)}
                  </span>
                  <div className={`shrink-0 flex items-center justify-center ${compact ? 'w-4 h-4' : 'w-5 h-5'}`}>
                    {isSelected ? (
                      <div
                        className={`flex ${
                          compact ? 'h-4 w-4' : 'h-5 w-5'
                        } items-center justify-center rounded-full bg-[#1c3a13] dark:bg-emerald-400 text-white dark:text-zinc-950 shadow-2xs`}
                      >
                        <Check size={compact ? 9 : 11} strokeWidth={3} />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {!compact && (
        <div className="flex items-center justify-between text-xs mb-1.5 px-0.5">
          <span className="font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 text-[11px]">
            Select Formulation &amp; Size
          </span>
          <span className="font-mono text-xs font-bold text-[#1c3a13] dark:text-emerald-400">
            {variants.length} Options
          </span>
        </div>
      )}

      {/* Collapsed Trigger Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Select variant. Currently: ${displayShade}${displaySize ? ` ${displaySize}` : ''}`}
        className={`w-full ${
          compact
            ? 'h-7.5 sm:h-8 px-2.5 sm:px-3 rounded-full'
            : 'h-12 sm:h-[50px] px-3 sm:px-3.5 rounded-2xl'
        } flex items-center justify-between gap-1.5 sm:gap-2.5 border bg-white dark:bg-zinc-800/90 text-left transition-all shadow-2xs cursor-pointer select-none ${
          isOpen
            ? 'border-[#1c3a13] ring-2 ring-[#1c3a13]/20 dark:border-emerald-400 dark:ring-emerald-400/30'
            : 'border-[#1c3a13]/20 dark:border-white/12 hover:border-[#1c3a13] dark:hover:border-white/30'
        }`}
      >
        {/* Left: Thumbnail Image */}
        <div
          className={`relative ${
            compact ? 'h-5 w-5 sm:h-6 sm:w-6 rounded-full' : 'h-7 w-7 sm:h-8 sm:w-8 rounded-lg'
          } overflow-hidden shrink-0 border border-stone-200/80 dark:border-white/10 bg-stone-100 dark:bg-zinc-800 aspect-square`}
        >
          <Image
            src={safeImageUrl(displayImage || defaultImage)}
            alt={displayVariant?.name || 'Variant thumbnail'}
            fill
            sizes={compact ? '24px' : '32px'}
            className="object-cover transition-opacity duration-150"
          />
        </div>

        {/* Middle Content: [ Rose - same space - 30g - same space - ৳450 ] */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 min-w-0 flex-1">
          <span
            className={`${
              compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-[13.5px]'
            } font-bold text-[#181C1A] dark:text-white truncate`}
          >
            {displayShade}
          </span>
          {displaySize && (
            <span
              className={`shrink-0 font-mono font-medium text-stone-600 dark:text-stone-300 ${
                compact ? 'text-[10px] sm:text-[11px]' : 'text-xs sm:text-[12.5px]'
              }`}
            >
              {displaySize}
            </span>
          )}
          <span
            className={`shrink-0 font-inter font-bold ${
              compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-[13.5px]'
            } text-[#1c3a13] dark:text-emerald-400`}
          >
            ৳{Math.round(displayVariant?.price ?? 0)}
          </span>
        </div>

        {/* Right: Animated Chevron */}
        <ChevronDown
          size={compact ? 12 : 15}
          className={`shrink-0 text-stone-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#1c3a13] dark:text-emerald-400' : ''
          }`}
        />
      </button>

      {/* 1. GRID VIEW: Side flyout (docked left or right of product card with connecting side arrow) */}
      {isOpen && compact && layout === 'grid' && (
        <div
          ref={modalRef}
          role="listbox"
          aria-label="Available variants"
          style={{
            width: cardWidth ? `${Math.min(cardWidth, 280)}px` : undefined,
            maxWidth: 'calc(100vw - 28px)',
          }}
          className={`absolute ${
            placementSide === 'right'
              ? 'left-[calc(100%+32px)]'
              : 'right-[calc(100%+32px)]'
          } bottom-0 z-[60] w-[190px] sm:w-[240px] md:w-[260px] rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/15 shadow-2xl overflow-visible animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* NodeConnector: n8n-style dark green curved bezier wire spanning the gap */}
          <div
            className={`absolute ${
              placementSide === 'right' ? '-left-[32px]' : '-right-[32px]'
            } bottom-[15px] pointer-events-none z-[65]`}
          >
            <NodeConnector
              direction={placementSide === 'right' ? 'popover-right' : 'popover-left'}
              gapWidth={32}
              color="#1c3a13"
              targets={connectorTargets}
            />
          </div>

          {/* Rounded inner container */}
          <div className="w-full h-full rounded-2xl overflow-hidden">
            {dropdownListContent}
          </div>
        </div>
      )}

      {/* Shared Full-Screen Backdrop Blur (z-40): Blurs background except active product card (z-50) */}
      {mounted && isOpen && compact && typeof document !== 'undefined' && (
        createPortal(
          <div
            className="fixed inset-0 z-40 bg-black/35 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              closeDropdown();
            }}
            aria-hidden="true"
          />,
          document.body
        )
      )}

      {/* 2. LIST VIEW: Centered Modal Dialog in the middle of screen (Portal to document.body) */}
      {mounted && isOpen && compact && layout === 'list' && typeof document !== 'undefined' && (
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-label="Available variants"
          >
            {/* Centered Modal Card in the middle of screen */}
            <div
              ref={modalRef}
              className="relative z-10 w-full max-w-[320px] rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl border border-stone-200 dark:border-white/15 overflow-hidden animate-in zoom-in-95 duration-150 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {dropdownListContent}
            </div>
          </div>,
          document.body
        )
      )}

      {/* 3. PRODUCT DETAIL HERO / NON-COMPACT: Standard Luxury Dropdown below trigger */}
      {isOpen && !compact && (
        <div
          role="listbox"
          aria-label="Available variants"
          className="absolute left-0 right-0 top-full mt-2 z-50 w-full rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/15 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {dropdownListContent}
        </div>
      )}
    </div>
  );
}

