'use client';

import React from 'react';
import Image from 'next/image';
import { Star, ShoppingBag } from 'lucide-react';
import { ComparisonProduct } from './types';

interface CompareProductHeaderCardProps {
  product: ComparisonProduct;
  onAddToCart?: () => void;
}

export default function CompareProductHeaderCard({
  product,
  onAddToCart,
}: CompareProductHeaderCardProps) {
  return (
    <div className="bg-white rounded-2xl p-2.5 flex flex-col justify-between shadow-sm relative border border-[#E2DED8]/60">
      {/* Discount Badge */}
      <div className="absolute top-2 left-2 z-10">
        <span className="px-1.5 py-0.5 rounded-full bg-[#D4F6A2] text-[#062402] font-bold text-[9px] uppercase tracking-wider">
          {product.discountPercentage}% OFF
        </span>
      </div>

      {/* Product Image */}
      <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#F2F6F0] mb-2">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 400px) 150px, 180px"
          className="object-cover"
        />
      </div>

      {/* Details */}
      <div className="flex flex-col flex-1">
        <span className="text-[10px] uppercase font-bold tracking-wider text-[#4b6723]">
          {product.brand}
        </span>
        <h2 className="text-[13px] leading-tight font-bold text-[#1a1c1a] line-clamp-1">
          {product.name}
        </h2>
        <span className="text-[11px] text-[#5A615D] mb-1">
          {product.size}
        </span>

        {/* Pricing */}
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="text-[16px] text-[#062402] font-bold">
            ৳{product.price.toLocaleString()}
          </span>
          <span className="text-[11px] line-through text-[#5A615D]/70">
            ৳{product.originalPrice.toLocaleString()}
          </span>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-3.5 h-3.5 text-[#4b6723] fill-[#4b6723]" />
          <span className="text-[11px] text-[#1a1c1a] font-semibold">
            {product.rating}
          </span>
          <span className="text-[10px] text-[#5A615D]">
            ({product.reviewCount})
          </span>
        </div>

        {/* Add to Bag Button */}
        <button
          type="button"
          onClick={onAddToCart}
          className="w-full py-2 rounded-full bg-[#062402] text-white text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-sm cursor-pointer hover:bg-[#1c3a13]"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Add to Bag</span>
        </button>
      </div>
    </div>
  );
}
