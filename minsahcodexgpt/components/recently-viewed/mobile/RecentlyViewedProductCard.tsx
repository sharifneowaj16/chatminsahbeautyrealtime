'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Heart, Star, ShoppingBag, QrCode, TrendingDown } from 'lucide-react';
import { formatPrice } from '@/utils/currency';
import { RecentlyViewedItem } from './types';

interface RecentlyViewedProductCardProps {
  item: RecentlyViewedItem;
  onAddToCart: (item: RecentlyViewedItem) => void;
  onToggleWishlist: (item: RecentlyViewedItem) => void;
}

export function RecentlyViewedProductCard({
  item,
  onAddToCart,
  onToggleWishlist,
}: RecentlyViewedProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
    onToggleWishlist(item);
  };

  return (
    <article className="bg-white rounded-[28px] p-3 shadow-[0_4px_24px_rgba(6,36,2,0.04)] border border-[#E2DED8]/60 flex flex-col gap-3 transition-all">
      {/* Product Image Frame */}
      <div className="relative w-full h-52 rounded-[22px] overflow-hidden bg-[#F2F6F0]">
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 360px"
        />

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 items-center max-w-[80%]">
          <span className="bg-[#062402]/85 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            {item.viewedAgo}
          </span>
          {item.priceDropBadge ? (
            <span className="bg-[#ba1a1a] text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-0.5">
              <TrendingDown className="w-3 h-3" />
              {item.priceDropBadge}
            </span>
          ) : item.discountBadge ? (
            <span className="bg-[#ccee9b] text-[#1c3a13] text-[10px] font-bold px-2 py-1 rounded-full">
              {item.discountBadge}
            </span>
          ) : null}
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={handleHeartClick}
          className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md text-[#062402] flex items-center justify-center active:scale-90 transition-all shadow-sm"
          aria-label="Save to wishlist"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isWishlisted ? 'fill-rose-600 text-rose-600' : 'text-[#43483f]'
            }`}
          />
        </button>

        {/* K-Verify QR Badge */}
        {item.hasHologram !== false && (
          <div className="absolute bottom-2.5 right-2.5 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
            <QrCode className="w-3 h-3 text-[#062402]" />
            <span className="text-[10px] text-[#062402] font-bold">K-Verify QR</span>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="flex flex-col gap-1.5 px-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#516d29] font-bold uppercase tracking-wider">
            {item.brand}
          </span>
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-[#D89B00] text-[#D89B00]" />
            <span className="text-xs font-bold text-[#181C1A]">{item.rating}</span>
            <span className="text-xs text-[#43483f]">({item.reviewCount})</span>
          </div>
        </div>

        <h3 className="text-sm font-bold text-[#181C1A] leading-tight">
          {item.name}
        </h3>

        <p className="text-xs text-[#43483f] line-clamp-1">
          {item.formulaNote}
        </p>

        <div className="flex items-center gap-1.5 pt-0.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              item.isLowStock ? 'bg-rose-600 animate-pulse' : 'bg-[#1b7a36]'
            }`}
          />
          <span
            className={`text-[11px] font-medium ${
              item.isLowStock ? 'text-rose-600 font-semibold' : 'text-[#181C1A]'
            }`}
          >
            {item.stockStatus}
          </span>
        </div>

        {/* Price & CTA */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-[#062402]">
              {formatPrice(item.price)}
            </span>
            {item.originalPrice && (
              <span className="text-xs text-[#43483f] line-through">
                {formatPrice(item.originalPrice)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onAddToCart(item)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#062402] text-white text-xs font-bold active:scale-95 transition-all shadow-sm"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Add to Bag</span>
          </button>
        </div>
      </div>
    </article>
  );
}
