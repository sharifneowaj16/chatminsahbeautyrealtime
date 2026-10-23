'use client';

import { OfferFilterCategory } from './types';

interface OffersCategoryFilterCarouselProps {
  activeCategory: OfferFilterCategory;
  onSelectCategory: (category: OfferFilterCategory) => void;
}

const CATEGORIES: Array<{ id: OfferFilterCategory; label: string }> = [
  { id: 'all', label: 'All Offers (5)' },
  { id: 'vouchers', label: 'Voucher Codes' },
  { id: 'flash', label: 'Flash Markdown' },
  { id: 'bundles', label: 'Bundle Saves' },
  { id: 'vip', label: 'VIP Members' },
];

export function OffersCategoryFilterCarousel({
  activeCategory,
  onSelectCategory,
}: OffersCategoryFilterCarouselProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 py-1">
      {CATEGORIES.map((cat) => {
        const isActive = activeCategory === cat.id;

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 ${
              isActive
                ? 'bg-[#062402] text-white shadow-sm'
                : 'bg-[#F2F6F0] text-[#5A615D] hover:text-[#062402]'
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
