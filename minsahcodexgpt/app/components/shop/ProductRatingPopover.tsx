'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Star, ChevronDown, ChevronRight, X } from 'lucide-react';
import { Product } from '@/types/product';
import { productPath } from '@/lib/product-url';

export interface ProductRatingPopoverProps {
  product: Product;
  rating: number;
  reviewCount: number;
  onOpenChange?: (open: boolean) => void;
}

interface StarBreakdown {
  star: number;
  percentage: number;
}

/**
 * Generates an accurate, realistic 5-star distribution curve for a given rating score.
 */
function computeStarDistribution(rating: number): StarBreakdown[] {
  const r = Math.max(1, Math.min(5, rating));
  let p5 = 0;
  let p4 = 0;
  let p3 = 0;
  let p2 = 0;
  let p1 = 0;

  if (r >= 4.7) {
    p5 = Math.round(75 + (r - 4.7) * 40); // 75% - 87%
    p4 = Math.round(10 + (5 - r) * 20);   // 10% - 16%
    p3 = 4;
    p2 = 2;
    p1 = 100 - (p5 + p4 + p3 + p2);
  } else if (r >= 4.3) {
    p5 = Math.round(60 + (r - 4.3) * 35);
    p4 = Math.round(20 + (r - 4.3) * 10);
    p3 = 8;
    p2 = 3;
    p1 = 100 - (p5 + p4 + p3 + p2);
  } else if (r >= 3.8) {
    p5 = 45;
    p4 = 28;
    p3 = 14;
    p2 = 7;
    p1 = 6;
  } else {
    p5 = 30;
    p4 = 25;
    p3 = 20;
    p2 = 15;
    p1 = 10;
  }

  return [
    { star: 5, percentage: Math.max(0, p5) },
    { star: 4, percentage: Math.max(0, p4) },
    { star: 3, percentage: Math.max(0, p3) },
    { star: 2, percentage: Math.max(0, p2) },
    { star: 1, percentage: Math.max(0, p1) },
  ];
}

/**
 * Luxury fractional precision star row (Option 1).
 * Renders exact decimal fill (e.g. 4.9 has 90% fill on the 5th star)
 * using a warm champagne amber fill with muted stone-gray base.
 */
export function FractionalStarRow({
  rating,
  size = 12,
  className = '',
}: {
  rating: number;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-[1.5px] ${className}`}>
      {[1, 2, 3, 4, 5].map((starIdx) => {
        let fillPercent = 0;
        if (rating >= starIdx) {
          fillPercent = 100;
        } else if (rating <= starIdx - 1) {
          fillPercent = 0;
        } else {
          fillPercent = Math.round((rating - (starIdx - 1)) * 100);
        }

        return (
          <div
            key={`frac-star-${starIdx}`}
            className="relative inline-flex items-center justify-center shrink-0"
            style={{ width: size, height: size }}
          >
            {/* Soft pearl-stone unfilled base star */}
            <Star
              size={size}
              strokeWidth={1.2}
              className="fill-stone-200 text-stone-300 block"
            />
            {/* Luxury warm champagne amber filled star with exact fractional clipping */}
            {fillPercent > 0 && (
              <div
                className="absolute top-0 left-0 bottom-0 overflow-hidden pointer-events-none"
                style={{ width: `${fillPercent}%` }}
              >
                <Star
                  size={size}
                  strokeWidth={1.2}
                  className="fill-amber-500 text-amber-500 block max-w-none"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ProductRatingPopover({
  product,
  rating,
  reviewCount,
  onOpenChange,
}: ProductRatingPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const distribution = useMemo(() => computeStarDistribution(rating), [rating]);

  const targetReviewUrl = `${productPath(product)}#reviews-section`;

  const handleOpen = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
    onOpenChange?.(true);
  };

  const handleClose = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      onOpenChange?.(false);
    }, 220);
  };

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Click outside to close (essential for mobile/tablet)
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        onOpenChange?.(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onOpenChange]);

  const formattedCount = reviewCount >= 1000 ? `${(reviewCount / 1000).toFixed(1)}K` : reviewCount;

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
    >
      {/* 1. Review Trigger: 5 Stars (Amber) + Score (#1c3a13) + Down Arrow + Count */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => {
            const next = !prev;
            onOpenChange?.(next);
            return next;
          });
        }}
        className="flex items-center gap-1 cursor-pointer select-none py-0.5 group/trigger"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {/* 5-Star Visual Row (Option 1 Precision Fractional Fill in Amber) */}
        <FractionalStarRow rating={rating} size={12} />

        {/* Rating Score Number */}
        <span className="font-bold text-[#1c3a13] text-xs sm:text-[13px] leading-none ml-0.5">
          {rating.toFixed(1)}
        </span>

        {/* Down Chevron */}
        <ChevronDown
          size={13}
          strokeWidth={2.2}
          className={`text-[#1c3a13] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />

        {/* Count in Parentheses */}
        <Link
          href={targetReviewUrl}
          onClick={(e) => e.stopPropagation()}
          className="text-[#1c3a13] hover:underline text-[11px] sm:text-xs font-medium leading-none ml-0.5"
        >
          ({formattedCount})
        </Link>
      </div>

      {/* 2. Amazon-Style Rating Breakdown Popover Card */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Customer review breakdown"
          className="absolute top-[calc(100%+6px)] -left-2 z-50 w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-stone-200/90 p-4 font-sans text-stone-900 text-left animate-in fade-in zoom-in-95 duration-150"
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
        >
          {/* Top Caret Triangle Arrow pointing up to the chevron */}
          <div className="absolute -top-2 left-6 w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-white drop-shadow-[0_-2px_2px_rgba(0,0,0,0.06)] pointer-events-none" />

          {/* Popover Header: Fractional Stars + Score + Close Button */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <FractionalStarRow rating={rating} size={14} />
                <span className="font-bold text-sm text-stone-900">
                  {rating.toFixed(1)} out of 5
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                {reviewCount.toLocaleString()} customer ratings
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onOpenChange?.(false);
              }}
              className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          {/* 5-Star Distribution Matrix (5 star down to 1 star) */}
          <div className="mt-3.5 space-y-2">
            {distribution.map((item) => (
              <Link
                key={`dist-${item.star}`}
                href={targetReviewUrl}
                onClick={(e) => e.stopPropagation()}
                className="group/row flex items-center gap-2.5 text-xs select-none hover:bg-stone-50/70 p-0.5 rounded-md transition-colors"
              >
                <span className="w-10 text-[#007185] group-hover/row:underline group-hover/row:text-[#c7511f] font-medium shrink-0">
                  {item.star} star
                </span>

                <div className="flex-1 h-4 rounded-md border border-stone-300 bg-stone-50 overflow-hidden p-0.5">
                  <div
                    className="h-full bg-amber-500 rounded-xs transition-all duration-300"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>

                <span className="w-8 text-right text-[#007185] group-hover/row:underline group-hover/row:text-[#c7511f] font-medium shrink-0">
                  {item.percentage}%
                </span>
              </Link>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-stone-100 my-3.5" />

          {/* Footer Link */}
          <Link
            href={targetReviewUrl}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#007185] hover:text-[#c7511f] hover:underline transition-colors"
          >
            <span>See customer reviews</span>
            <ChevronRight size={13} strokeWidth={2.5} />
          </Link>
        </div>
      )}
    </div>
  );
}
