'use client';

import React, { useState, useRef } from 'react';
import {
  Trash2,
  X,
  Star,
  Heart,
  ShoppingBag,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import type { MobileWishlistItem } from './types';

interface WishlistSwipeItemCardProps {
  item: MobileWishlistItem;
  onRemove: (id: string, name: string) => void;
  onAddToBag: (item: MobileWishlistItem) => void;
  onToggleFavorite: (id: string) => void;
  showSwipeHint?: boolean;
}

export default function WishlistSwipeItemCard({
  item,
  onRemove,
  onAddToBag,
  onToggleFavorite,
  showSwipeHint = false,
}: WishlistSwipeItemCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef<number>(0);
  const currentOffsetX = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    currentOffsetX.current = offsetX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    // Allow dragging left up to -110px, prevent dragging right past 0
    const newOffset = Math.min(0, Math.max(-110, currentOffsetX.current + diff));
    setOffsetX(newOffset);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    // Snap to open (-90px) or closed (0)
    if (offsetX < -45) {
      setOffsetX(-90);
    } else {
      setOffsetX(0);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[24px] max-h-[600px] transition-all duration-300">
      {/* Underlying Action Reveal Layer */}
      <div className="absolute inset-0 bg-gradient-to-l from-[#ba1a1a] via-[#93000a] to-[#28531c] rounded-[24px] flex items-center justify-end pr-5 text-white select-none">
        <button
          type="button"
          onClick={() => onRemove(item.id, item.name)}
          className="flex flex-col items-center justify-center gap-1 text-white hover:scale-105 active:scale-95 transition-transform py-2 px-3 rounded-2xl"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
            <Trash2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] tracking-wide uppercase font-bold text-white/95">
            Remove
          </span>
        </button>
      </div>

      {/* Top Draggable Product Card */}
      <article
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="relative rounded-[24px] bg-white p-3.5 border border-[#E2DED8]/60 shadow-xs flex flex-col gap-3 select-none"
      >
        {/* Swipe Hint Pill */}
        {showSwipeHint && offsetX === 0 && (
          <div className="absolute top-2 right-12 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#efeeeb]/90 backdrop-blur-sm text-[10px] font-bold text-[#43483f] border border-[#E2DED8]/50 pointer-events-none">
            <ArrowLeft className="w-3 h-3 text-[#4b6723] animate-pulse" />
            <span>Swipe left</span>
          </div>
        )}

        <div className="flex gap-3.5 items-start">
          {/* Product Image */}
          <div className="relative w-28 h-28 rounded-[20px] overflow-hidden bg-[#efeeeb] shrink-0 border border-[#E2DED8]/40">
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover object-center pointer-events-none"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/images/categories/Skincare.png';
              }}
            />
            {item.discountPercent && (
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#062402] text-[#EAF7D8] text-[10px] font-bold shadow-xs">
                -{item.discountPercent}%
              </span>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4b6723]">
                  {item.brand}
                </span>
                <button
                  type="button"
                  aria-label="Remove item"
                  onClick={() => onRemove(item.id, item.name)}
                  className="w-7 h-7 rounded-full bg-[#F8FAF7] hover:bg-red-50 text-[#43483f] hover:text-[#ba1a1a] active:scale-90 transition-all flex items-center justify-center cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <h2 className="text-sm font-bold text-[#062402] leading-tight truncate mt-0.5">
                {item.name}
              </h2>
              <p className="text-[11px] text-[#43483f] truncate mt-0.5">{item.variant}</p>
            </div>

            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="px-2 py-0.5 rounded-full bg-[#EAF7D8]/60 text-[#1c3a13] text-[9px] font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#4b6723]" />
                Authentic Seal
              </span>
              <span className="text-[11px] text-[#43483f] flex items-center gap-0.5 font-bold">
                <Star className="w-3 h-3 text-[#4b6723] fill-[#4b6723]" />
                {item.rating} ({item.reviewCount})
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-base text-[#062402] font-bold">
                ৳{item.price.toLocaleString()}
              </span>
              {item.originalPrice && item.originalPrice > item.price && (
                <span className="text-xs text-[#43483f] line-through">
                  ৳{item.originalPrice.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col gap-2 pt-2.5 border-t border-[#E2DED8]/40 bg-[#F8FAF7] px-3 py-2.5 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-[#4b6723] font-bold min-w-0 pr-1">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  item.inStock ? 'bg-[#4b6723]' : 'bg-red-500'
                }`}
              />
              <span className="truncate">{item.stockLabel}</span>
            </div>

            <button
              type="button"
              aria-label="Favorite toggle"
              onClick={() => onToggleFavorite(item.id)}
              className="w-8 h-8 rounded-full bg-white text-[#ba1a1a] border border-[#E2DED8]/50 flex items-center justify-center active:scale-90 hover:scale-105 transition-all shadow-2xs cursor-pointer"
            >
              <Heart
                className={`w-4 h-4 ${
                  item.isFavorite ? 'fill-[#ba1a1a]' : 'text-[#ba1a1a]'
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            disabled={!item.inStock}
            onClick={() => onAddToBag(item)}
            className={`w-full py-2.5 min-h-[44px] rounded-full text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-2 shadow-2xs ${
              item.inStock
                ? 'bg-[#062402] hover:bg-[#28531c] text-white cursor-pointer'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-[#ccee9b]" />
            <span>{item.inStock ? 'Add to Bag' : 'Out of Stock'}</span>
          </button>
        </div>
      </article>
    </div>
  );
}
