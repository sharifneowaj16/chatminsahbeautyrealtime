'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { PLPProduct, PLPLayoutView } from './types';

interface PLPProductCardProps {
  product: PLPProduct;
  layout?: PLPLayoutView;
  onAddToCart?: (product: PLPProduct) => void;
  onToggleWishlist?: (product: PLPProduct, isLiked: boolean) => void;
}

export default function PLPProductCard({
  product,
  layout = 'grid',
  onAddToCart,
  onToggleWishlist,
}: PLPProductCardProps) {
  const [isLiked, setIsLiked] = useState(false);

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    if (onToggleWishlist) onToggleWishlist(product, nextLiked);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) onAddToCart(product);
  };

  if (layout === 'list') {
    return (
      <article className="w-full bg-white rounded-[24px] p-3 flex gap-3 shadow-sm hover:shadow-md transition-shadow relative border border-[#E2DED8]/60">
        <Link href={`/products/${product.slug || product.id}`} className="w-28 h-32 rounded-[20px] overflow-hidden bg-[#F8FAF7] shrink-0 relative block">
          {product.image ? (
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#EAF7D8] flex items-center justify-center text-[#4b6723] text-xs font-bold">
              K-BEAUTY
            </div>
          )}
          {product.discountPercent && (
            <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-[#EAF7D8] text-[#1c3a13] text-[9px] font-bold">
              -{product.discountPercent}%
            </span>
          )}
        </Link>

        <div className="flex flex-col justify-between flex-1 min-w-0">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] text-[#4b6723] font-bold uppercase tracking-wider">
                {product.brand}
              </span>
              <span className="w-1 h-1 rounded-full bg-[#5A615D] opacity-40" />
              <div className="flex items-center gap-0.5 text-[11px] text-[#181C1A] font-bold">
                <svg className="text-[#4b6723]" width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>{product.rating}</span>
                <span className="text-[10px] text-[#5A615D] font-normal">({product.reviewCount})</span>
              </div>
            </div>

            <Link href={`/products/${product.slug || product.id}`}>
              <h3 className="text-[13px] font-semibold text-[#181C1A] line-clamp-2 leading-snug hover:underline">
                {product.title}
              </h3>
            </Link>
            {product.subtitle && (
              <p className="text-[11px] text-[#5A615D] line-clamp-1 mt-0.5">
                {product.subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[#E2DED8]/40 mt-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[15px] text-[#062402] font-bold tracking-tight">
                ৳{product.price.toLocaleString('en-US')}
              </span>
              {product.regularPrice && product.regularPrice > product.price && (
                <span className="text-[11px] text-[#5A615D] line-through opacity-70">
                  ৳{product.regularPrice.toLocaleString('en-US')}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleAdd}
              aria-label={`Add ${product.title} to cart`}
              className="px-3 py-1.5 rounded-full bg-[#1c3a13] text-[#D4F6A2] text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-transform shadow-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span>+ Add</span>
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="product-card flex flex-col bg-white rounded-[24px] p-2.5 shadow-sm hover:shadow-md transition-shadow relative border border-[#E2DED8]/60">
      {/* Top Image Box */}
      <Link href={`/products/${product.slug || product.id}`} className="relative w-full aspect-square rounded-[20px] overflow-hidden bg-[#F8FAF7] mb-2.5 block group">
        {product.image ? (
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-[#EAF7D8] flex items-center justify-center text-[#4b6723] text-xs font-bold">
            K-BEAUTY
          </div>
        )}

        {/* Discount Badge */}
        {product.discountPercent && (
          <div className="absolute top-2 left-2 flex items-center gap-1">
            <span className="px-2 py-0.5 rounded-full bg-[#1c3a13] text-[#D4F6A2] text-[10px] font-bold tracking-tight shadow-sm">
              -{product.discountPercent}%
            </span>
          </div>
        )}

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={handleWishlist}
          aria-label="Add to wishlist"
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#5A615D] hover:text-[#ba1a1a] transition-all active:scale-90 shadow-sm"
        >
          <svg
            className={isLiked ? 'text-[#ba1a1a] fill-[#ba1a1a]' : 'text-[#5A615D]'}
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill={isLiked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* Stock Hub Pill */}
        {product.hubBadge && (
          <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a] animate-pulse" />
            <span className="text-[10px] text-[#181C1A] truncate font-semibold">
              {product.hubBadge}
            </span>
          </div>
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-col flex-1 justify-between">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-wider text-[#4b6723] font-bold">
              {product.brand}
            </span>
            <div className="flex items-center gap-0.5">
              <svg className="text-[#4b6723]" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span className="text-[11px] text-[#181C1A] font-bold">
                {product.rating}
              </span>
              <span className="text-[10px] text-[#5A615D] opacity-70">
                ({product.reviewCount})
              </span>
            </div>
          </div>

          <Link href={`/products/${product.slug || product.id}`}>
            <h3 className="text-[13px] font-semibold text-[#181C1A] line-clamp-2 leading-snug hover:underline">
              {product.title}
            </h3>
          </Link>
          {product.subtitle && (
            <p className="text-[11px] text-[#5A615D] mt-0.5 truncate">
              {product.subtitle}
            </p>
          )}
        </div>

        {/* Footer Price & Add CTA */}
        <div className="pt-2 mt-2 flex items-center justify-between border-t border-[#E2DED8]/60">
          <div className="flex flex-col">
            <span className="text-[15px] text-[#062402] font-bold tracking-tight">
              ৳{product.price.toLocaleString('en-US')}
            </span>
            {product.regularPrice && product.regularPrice > product.price && (
              <span className="text-[10px] text-[#5A615D] line-through opacity-70">
                ৳{product.regularPrice.toLocaleString('en-US')}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleAdd}
            aria-label={`Add ${product.title} to cart`}
            className="w-9 h-9 rounded-full bg-[#1c3a13] text-[#D4F6A2] hover:bg-[#062402] hover:text-white flex items-center justify-center transition-all active:scale-90 shadow-sm"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}
