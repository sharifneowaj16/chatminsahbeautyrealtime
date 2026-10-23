'use client';

import React, { useState, useMemo } from 'react';
import type { PLPProduct, PLPLayoutView, PLPSortOption, PLPFilterState } from './types';
import PLPMobileHeader from './PLPMobileHeader';
import PLPDhakaExpressBanner from './PLPDhakaExpressBanner';
import PLPControlToolbar from './PLPControlToolbar';
import PLPProductGrid from './PLPProductGrid';
import PLPEditorialSpotlight from './PLPEditorialSpotlight';
import { PriceRangeFilterModal } from './filter/PriceRangeFilterModal';
import type { DetailedFilterState } from './filter/types';
import PLPToastNotification from './PLPToastNotification';
import { useCart } from '@/contexts/CartContext';

interface PLPMobileViewProps {
  initialProducts?: PLPProduct[];
  title?: string;
  cartCount?: number;
}

const DEFAULT_STITCH_PLP_PRODUCTS: PLPProduct[] = [
  {
    id: 'arisol-sun-relief',
    slug: 'arisol-soothing-sun-relief-spf50',
    brand: 'ARISOL',
    title: 'Soothing Sun Relief SPF50+ PA++++',
    subtitle: '50ml • Centella & Green Tea',
    rating: 4.8,
    reviewCount: 189,
    price: 1365,
    regularPrice: 1950,
    discountPercent: 30,
    image: 'https://lh3.googleusercontent.com/aida/AEtjO1UyYX1umUH79AmRcKg_Z802qdhHAlP71L8glJNYsZNrqTVcQl3yieC-vbt8kB_ZpiBk3G-K-rsefsUoqhVBEXRZNBnhELrzUUp5QVNIxYnHksZdqjoIor1p8FiEw0SH0Z01XJFX8e2jEgPxRSqLMvSV4tElciOaF8sq_Zuak5FO6oK9LR2QNUCEsxid6F-yGJ7d9On113z8x1jGG26qvjyMKiAVIWrtvLI4-QXKbdjQwRhD8dDypGAI-A',
    hubBadge: 'Only 3 in Banani Hub',
    category: 'Sunscreen',
  },
  {
    id: 'anua-77-toner',
    slug: 'anua-heartleaf-77-soothing-facial-toner',
    brand: 'ANUA',
    title: 'Heartleaf 77% Soothing Facial Toner',
    subtitle: '250ml • Sub-acidic Calming',
    rating: 4.9,
    reviewCount: 420,
    price: 2100,
    regularPrice: 2700,
    discountPercent: 22,
    image: 'https://lh3.googleusercontent.com/aida/AEtjO1V0ZK1hxPEA6N0RA-ZeyM_5_z7LqtmnEw7R9tI5d_6EBgl9FSLXorl0uyYQmSSEsit1LJ51mJGJa9oJF-DzA2ppEweGIA0GFvcAZw8BAJEjKuaPtSjOxXO3iqDaJdxtmcUUQbnsvs6RVtXDhvaZcy0R0G0Z0mN_MPKnemvAv6hlw2nFp6j-9ykbJsF8YjcM1CPNxXz9tkHfh0SE8pcOJoGI6x2IuVAPwLceyesr5kvCPGa74tj_Z2z0Cw',
    hubBadge: '100% Genuine Sealed',
    category: 'Toner',
  },
  {
    id: 'elixir-vital-serum',
    slug: 'elixir-vital-glass-skin-hydrating-serum',
    brand: 'ELIXIR VITAL',
    title: 'Glass Skin Hydrating Dropper Serum',
    subtitle: '30ml • Hyaluronic Acid 4X',
    rating: 4.9,
    reviewCount: 340,
    price: 1890,
    regularPrice: 2650,
    discountPercent: 28,
    image: 'https://lh3.googleusercontent.com/aida/AEtjO1Xjq2uLipLxHYel2pWwxLHQRxNXRUi09THSnyfnSyG_PTKOpRKnyC6SNM-76JH7Dc2sz0fRVEuJn9Kqn7N1jfPXcaLnUGyCFFqESayX6-0W1Sf9SykBZwjbgi8xAsFqGtLMQVooqxpgeruJvVXDOZ2_BP8EALOKzzqrxAztKvBL6KQ_lqeTefcaADOQ0YvypIT-48VT_raZBGCKBKh3ODZ5Zxn56V762q0PgRYGGbhMjxMtnZh78QFcbw',
    hubBadge: 'Dhaka Same-Day Express',
    category: 'Serum',
  },
  {
    id: 'laneige-lip-sleeping-mask',
    slug: 'laneige-lip-sleeping-mask-berry-moisture',
    brand: 'LANEIGE',
    title: 'Lip Sleeping Mask Berry Moisture',
    subtitle: '20g • Berry Fruit & Vit C',
    rating: 4.9,
    reviewCount: 512,
    price: 1720,
    regularPrice: 2100,
    discountPercent: 18,
    image: 'https://lh3.googleusercontent.com/aida/AEtjO1X9S_R5gUdrYEyPuZV-PFdP1ip80AzNBr_KUk2CNMjlR-y5H6gqBNzjPAmqKJ5izpxgM_xBsuuHSXCH4rsDbKJ4w-NUJKQdqn5rxrFwdDHPos3D44b59mr9dU5Guw8lrF0DMqzfBoC-t96ti52jN9Yuj_8KIWI1bwlfK8rfvZHIOn6RM_6mYTb98qHux5gpUFJwYxcVVUhLpa2i0Ofi-3HNOPuIXL1ThhmX-KhLBZ37alUuKu_Ddu3p_A',
    hubBadge: '100% Genuine Amore',
    category: 'Lip Care',
  },
];

export default function PLPMobileView({
  initialProducts = DEFAULT_STITCH_PLP_PRODUCTS,
  title = 'Categories',
  cartCount,
}: PLPMobileViewProps) {
  const { addItem, items } = useCart();
  const currentCartCount = cartCount !== undefined ? cartCount : items.reduce((sum, i) => sum + i.quantity, 0);
  const [layout, setLayout] = useState<PLPLayoutView>('grid');
  const [sort, setSort] = useState<PLPSortOption>('Popularity');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<DetailedFilterState>({
    minPrice: 500,
    maxPrice: 5000,
    categories: [],
    brands: [],
    shades: [],
    sizes: [],
    ingredients: [],
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const handleAddToCart = (product: PLPProduct) => {
    try {
      addItem({
        id: product.id,
        name: product.title,
        price: product.price,
        quantity: 1,
        image: product.image,
      });
      showToast('Added to your Dhaka Bag 🛍️');
    } catch {
      showToast('Added to bag!');
    }
  };

  const handleToggleWishlist = (product: PLPProduct, isLiked: boolean) => {
    if (isLiked) {
      showToast('Saved to your Wishlist ❤️');
    } else {
      showToast('Removed from Wishlist');
    }
  };

  // Filter & Sort state machine
  const filteredProducts = useMemo(() => {
    let result = [...initialProducts];

    // Filter by Brand
    if (filters.brands.length > 0) {
      result = result.filter((p) =>
        filters.brands.some((b) => p.brand.toLowerCase().includes(b.toLowerCase()))
      );
    }

    // Filter by Price Range
    result = result.filter(
      (p) => p.price >= filters.minPrice && p.price <= filters.maxPrice
    );

    // Sort
    if (sort === 'Price: Low to High') {
      result.sort((a, b) => a.price - b.price);
    } else if (sort === 'Price: High to Low') {
      result.sort((a, b) => b.price - a.price);
    } else if (sort === 'Customer Rating') {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [initialProducts, filters, sort]);

  const activeFilterCount =
    (filters.minPrice > 500 || filters.maxPrice < 5000 ? 1 : 0) +
    filters.categories.length +
    filters.brands.length +
    filters.shades.length +
    filters.sizes.length +
    filters.ingredients.length;

  return (
    <div className="lg:hidden min-h-screen bg-[#faf9f6] text-[#181C1A] flex flex-col font-sans">
      {/* 1. Mobile Header */}
      <PLPMobileHeader
        title={title}
        cartCount={currentCartCount}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col pt-16 pb-24">
        {/* 2. Fast Delivery Banner */}
        <PLPDhakaExpressBanner />

        {/* 3. Filter & Sort Toolbar */}
        <PLPControlToolbar
          layout={layout}
          onChangeLayout={setLayout}
          selectedSort={sort}
          onSelectSort={setSort}
          activeFilterCount={activeFilterCount}
          onOpenFilter={() => setFilterOpen(true)}
        />

        {/* 4. Product Listing Grid / List */}
        <PLPProductGrid
          products={filteredProducts.length > 0 ? filteredProducts : initialProducts}
          layout={layout}
          onAddToCart={handleAddToCart}
          onToggleWishlist={handleToggleWishlist}
        />

        {/* 5. Editorial Spotlight */}
        <PLPEditorialSpotlight onAddToCart={handleAddToCart} />
      </main>

      {/* 6. Price Range Filter Modal (Stitch Screen 18) */}
      <PriceRangeFilterModal
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onApply={(f) => {
          setFilters(f);
          showToast(`Filters updated: ${filteredProducts.length} items`);
        }}
        totalResultsCount={filteredProducts.length}
      />

      {/* 7. Toast Feedback */}
      <PLPToastNotification message={toastMessage} />
    </div>
  );
}
