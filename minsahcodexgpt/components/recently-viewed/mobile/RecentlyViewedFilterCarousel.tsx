'use client';

import { RecentlyViewedCategoryFilter } from './types';

interface RecentlyViewedFilterCarouselProps {
  activeCategory: RecentlyViewedCategoryFilter;
  onSelectCategory: (category: RecentlyViewedCategoryFilter) => void;
  counts: Record<RecentlyViewedCategoryFilter, number>;
}

export function RecentlyViewedFilterCarousel({
  activeCategory,
  onSelectCategory,
  counts,
}: RecentlyViewedFilterCarouselProps) {
  const filters: Array<{ id: RecentlyViewedCategoryFilter; label: string; count: number }> = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'sunscreens', label: 'Sunscreens', count: counts.sunscreens },
    { id: 'serums', label: 'Serums', count: counts.serums },
    { id: 'toners', label: 'Toners', count: counts.toners },
    { id: 'lip-care', label: 'Lip Care', count: counts['lip-care'] },
  ];

  return (
    <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 py-2">
      {filters.map((filter) => {
        const isActive = activeCategory === filter.id;

        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => onSelectCategory(filter.id)}
            className={`h-9 px-4 rounded-full text-xs font-bold whitespace-nowrap active:scale-95 transition-all shrink-0 flex items-center gap-2 shadow-xs cursor-pointer ${
              isActive
                ? 'bg-[#062402] text-white ring-1 ring-[#062402]'
                : 'bg-[#F2F6F0] text-[#1c3a13] hover:bg-[#E8F0E5] border border-[#E2DED8]/70'
            }`}
          >
            <span>{filter.label}</span>
            <span
              className={`w-5 h-5 rounded-full text-[11px] inline-flex items-center justify-center font-bold ${
                isActive
                  ? 'bg-[#28531c] text-[#D4F6A2]'
                  : 'bg-[#E2DED8]/70 text-[#43483f]'
              }`}
            >
              {filter.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
