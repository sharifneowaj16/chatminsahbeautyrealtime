'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ActiveFilter, ShopFilters } from '@/types/product';
import { getActiveFilters, buildSearchParams, parseSearchParams } from '@/lib/shopUtils';
import { trackShopClearFilter } from '@/lib/tracking/shop-events';
import { buildCatalogPath } from '@/lib/catalog-navigation';

interface ActiveFiltersProps {
  totalProducts: number;
}

export default function ActiveFilters({ totalProducts }: ActiveFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = parseSearchParams(searchParams);
  const activeFilters = getActiveFilters(filters);

  const removeFilter = (filter: ActiveFilter) => {
    const newFilters: Partial<ShopFilters> = { ...filters };

    switch (filter.param) {
      case 'category':
        delete newFilters.category;
        break;
      case 'subcategory':
        delete newFilters.subcategory;
        break;
      case 'brand':
        if (Array.isArray(newFilters.brand)) {
          newFilters.brand = newFilters.brand.filter(b => b !== filter.value);
          if (newFilters.brand.length === 0) delete newFilters.brand;
        }
        break;
      case 'price':
        delete newFilters.minPrice;
        delete newFilters.maxPrice;
        break;
      case 'skinType':
        if (Array.isArray(newFilters.skinType)) {
          newFilters.skinType = newFilters.skinType.filter(st => st !== filter.value);
          if (newFilters.skinType.length === 0) delete newFilters.skinType;
        }
        break;
      case 'skinConcern':
        if (Array.isArray(newFilters.skinConcern)) {
          newFilters.skinConcern = newFilters.skinConcern.filter(sc => sc !== filter.value);
          if (newFilters.skinConcern.length === 0) delete newFilters.skinConcern;
        }
        break;
      case 'rating':
        delete newFilters.rating;
        break;
      case 'tags':
        if (Array.isArray(newFilters.tags)) {
          newFilters.tags = newFilters.tags.filter(t => t !== filter.value);
          if (newFilters.tags.length === 0) delete newFilters.tags;
        }
        break;
      case 'inStockOnly':
        delete newFilters.inStockOnly;
        break;
      case 'saleOnly':
        delete newFilters.saleOnly;
        break;
    }

    // Reset to page 1 when filters change
    delete newFilters.page;

    trackShopClearFilter(filter.param, totalProducts);

    const queryString = buildSearchParams(newFilters);
    router.push(buildCatalogPath(new URLSearchParams(queryString)), { scroll: false });
  };

  const clearAllFilters = () => {
    trackShopClearFilter('all', totalProducts);
    const queryString = buildSearchParams({
      search: filters.search,
      sort: filters.sort,
    });
    router.push(buildCatalogPath(new URLSearchParams(queryString)), { scroll: false });
  };

  if (activeFilters.length === 0) {
    return (
      <div className="mb-4">
        <p className="text-sm text-minsah-secondary">
          Showing <span className="font-semibold text-minsah-dark">{totalProducts}</span> products
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* Result Count */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-minsah-secondary">
          Showing <span className="font-semibold text-minsah-dark">{totalProducts}</span> matching products with{' '}
          <span className="font-semibold text-minsah-primary">{activeFilters.length}</span> filter
          {activeFilters.length !== 1 ? 's' : ''} applied
        </p>
        {activeFilters.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            onClick={clearAllFilters}
            aria-label="Clear all active shop filters"
            className="rounded-xl px-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 overflow-x-auto scrollbar-hide pb-2">
        {activeFilters.map((filter, index) => (
          <Button
            key={`${filter.param}-${index}`}
            type="button"
            variant="primary"
            onClick={() => removeFilter(filter)}
            aria-label={`Remove ${filter.label} filter`}
            className="rounded-full bg-gradient-to-r from-minsah-primary to-minsah-secondary px-3 py-1.5 text-sm shadow-sm hover:from-minsah-dark hover:to-minsah-primary hover:shadow"
          >
            <span>{filter.label}</span>
            <X size={14} className="transition-transform duration-200 group-hover:rotate-90" aria-hidden="true" />
          </Button>
        ))}
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
