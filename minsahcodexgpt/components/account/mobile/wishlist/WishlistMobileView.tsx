'use client';

import React, { useState, useMemo } from 'react';
import type { MobileWishlistItem, WishlistFilterType, WishlistSortType } from './types';
import WishlistFeedbackToast from './WishlistFeedbackToast';
import WishlistSubHeader from './WishlistSubHeader';
import WishlistPriceDropBanner from './WishlistPriceDropBanner';
import WishlistFilterRibbon from './WishlistFilterRibbon';
import WishlistSwipeItemCard from './WishlistSwipeItemCard';
import WishlistEmptyState from './WishlistEmptyState';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';

interface WishlistMobileViewProps {
  initialItems?: MobileWishlistItem[];
}

const DEFAULT_STITCH_WISHLIST: MobileWishlistItem[] = [
  {
    id: 'item-laneige',
    productId: 'laneige-lip-sleeping-mask',
    name: 'Lip Sleeping Mask Berry',
    brand: 'LANEIGE',
    variant: 'Berry Complex & Vitamin C • 20g',
    price: 1720,
    originalPrice: 2025,
    discountPercent: 15,
    inStock: true,
    stockLabel: 'In Stock • Banani Hub (24h)',
    rating: 4.9,
    reviewCount: 340,
    image:
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&q=80',
    category: 'pricedrop',
    isFavorite: true,
  },
  {
    id: 'item-arisol',
    productId: 'arisol-sun-relief',
    name: 'Soothing Sun Relief SPF50+',
    brand: 'ARISOL LAB',
    variant: 'Centella & Green Tea • 50ml',
    price: 1365,
    originalPrice: 1950,
    discountPercent: 30,
    inStock: true,
    stockLabel: 'High Demand • Only 3 Left',
    rating: 4.8,
    reviewCount: 192,
    image:
      'https://images.unsplash.com/photo-1608248597359-5773179267ff?auto=format&fit=crop&w=300&q=80',
    category: 'suncare',
    isFavorite: true,
  },
  {
    id: 'item-anua',
    productId: 'anua-heartleaf-toner',
    name: 'Heartleaf 77% Soothing Toner',
    brand: 'ANUA KOREA',
    variant: 'Heartleaf Calming Extract • 250ml',
    price: 2100,
    originalPrice: null,
    inStock: true,
    stockLabel: 'Restocked Fresh • Banani Hub',
    rating: 4.9,
    reviewCount: 512,
    image:
      'https://images.unsplash.com/photo-1608248597359-5773179267ff?auto=format&fit=crop&w=300&q=80',
    category: 'instock',
    isFavorite: true,
  },
  {
    id: 'item-elixir',
    productId: 'elixir-vital-serum',
    name: 'Glass Skin Hydrating Serum',
    brand: 'ELIXIR VITAL',
    variant: 'Quad-Hyaluronic & Panthenol • 30ml',
    price: 1890,
    originalPrice: 2150,
    discountPercent: 12,
    inStock: true,
    stockLabel: 'Ready for Express Dispatch',
    rating: 5.0,
    reviewCount: 88,
    image:
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=300&q=80',
    category: 'serum',
    isFavorite: true,
  },
  {
    id: 'item-joseon',
    productId: 'beauty-of-joseon-cream',
    name: 'Dynasty Cream Royal Formulation',
    brand: 'BEAUTY OF JOSEON',
    variant: 'Ginseng & Niacinamide • 50ml',
    price: 1850,
    originalPrice: 2100,
    discountPercent: 12,
    inStock: true,
    stockLabel: 'In Stock • Dhaka Express',
    rating: 4.7,
    reviewCount: 215,
    image:
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&q=80',
    category: 'pricedrop',
    isFavorite: true,
  },
];

export default function WishlistMobileView({
  initialItems = DEFAULT_STITCH_WISHLIST,
}: WishlistMobileViewProps) {
  const { addItem } = useCart();
  const { registerAddIntent, openForSuccessfulAdd } = useCartDrawer();

  const [items, setItems] = useState<MobileWishlistItem[]>(() => {
    return initialItems && initialItems.length > 0 ? initialItems : DEFAULT_STITCH_WISHLIST;
  });

  const [filter, setFilter] = useState<WishlistFilterType>('all');
  const [sort, setSort] = useState<WishlistSortType>('recent');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastRemovedItem, setLastRemovedItem] = useState<{
    item: MobileWishlistItem;
    index: number;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const handleRemove = (id: string, name: string) => {
    const idx = items.findIndex((i) => i.id === id);
    if (idx !== -1) {
      const removed = items[idx];
      setLastRemovedItem({ item: removed, index: idx });
      setItems((prev) => prev.filter((i) => i.id !== id));
      showToast(`Removed "${name}" from Wishlist`);
    }
  };

  const handleUndo = () => {
    if (lastRemovedItem) {
      setItems((prev) => {
        const next = [...prev];
        next.splice(lastRemovedItem.index, 0, lastRemovedItem.item);
        return next;
      });
      setLastRemovedItem(null);
      setToastMessage(null);
    }
  };

  const handleAddToBag = async (item: MobileWishlistItem) => {
    try {
      const drawerIntentId = registerAddIntent();
      await addItem({
        id: item.productId,
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: 1,
        image: item.image,
      });
      openForSuccessfulAdd(
        drawerIntentId,
        {
          id: item.productId,
          name: item.name,
          price: item.price,
          quantity: 1,
          image: item.image,
        },
        1
      );
      showToast(`Added "${item.name}" to Bag!`);
    } catch {
      showToast(`Failed to add "${item.name}" to Bag`);
    }
  };

  const handleMoveAll = async () => {
    const available = items.filter((i) => i.inStock);
    if (available.length === 0) return;

    try {
      const drawerIntentId = registerAddIntent();
      for (const item of available) {
        await addItem({
          id: item.productId,
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: 1,
          image: item.image,
        });
      }
      if (available[0]) {
        openForSuccessfulAdd(
          drawerIntentId,
          {
            id: available[0].productId,
            name: available[0].name,
            price: available[0].price,
            quantity: 1,
            image: available[0].image,
          },
          available.length
        );
      }
      showToast(`Moved ${available.length} items to Bag!`);
    } catch {
      showToast('Could not move all items to Bag');
    }
  };

  const handleToggleFavorite = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isFavorite: !i.isFavorite } : i))
    );
  };

  const counts = useMemo(
    () => ({
      all: items.length,
      instock: items.filter((i) => i.inStock).length,
      pricedrop: items.filter((i) => Boolean(i.discountPercent && i.discountPercent > 0)).length,
      suncare: items.filter((i) => i.category === 'suncare').length,
      serum: items.filter((i) => i.category === 'serum').length,
    }),
    [items]
  );

  const priceDropStats = useMemo(() => {
    const discounted = items.filter((i) => i.originalPrice && i.originalPrice > i.price);
    const totalSaved = discounted.reduce(
      (acc, curr) => acc + ((curr.originalPrice || curr.price) - curr.price),
      0
    );
    return {
      count: discounted.length,
      totalSaved,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (filter === 'instock') result = result.filter((i) => i.inStock);
    else if (filter === 'pricedrop')
      result = result.filter((i) => Boolean(i.discountPercent && i.discountPercent > 0));
    else if (filter === 'suncare') result = result.filter((i) => i.category === 'suncare');
    else if (filter === 'serum') result = result.filter((i) => i.category === 'serum');

    if (sort === 'price-asc') return [...result].sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') return [...result].sort((a, b) => b.price - a.price);
    if (sort === 'rating') return [...result].sort((a, b) => b.rating - a.rating);
    return result;
  }, [items, filter, sort]);

  const toggleSort = () => {
    setSort((prev) => {
      if (prev === 'recent') return 'price-asc';
      if (prev === 'price-asc') return 'price-desc';
      if (prev === 'price-desc') return 'rating';
      return 'recent';
    });
  };

  const sortLabel = useMemo(() => {
    if (sort === 'price-asc') return 'Price: Low to High';
    if (sort === 'price-desc') return 'Price: High to Low';
    if (sort === 'rating') return 'Top Rated';
    return 'Recently Saved';
  }, [sort]);

  return (
    <div className="lg:hidden min-h-screen bg-[#faf9f6] text-[#181C1A] flex flex-col font-sans pb-24">
      {/* 1. Undo feedback toast */}
      <WishlistFeedbackToast
        message={toastMessage}
        onUndo={handleUndo}
        showUndo={Boolean(lastRemovedItem)}
      />

      {/* 2. Sub-Header */}
      <WishlistSubHeader
        itemsCount={items.length}
        onMoveAll={handleMoveAll}
        onShare={() => {
          if (navigator.share) {
            navigator.share({
              title: 'My Minsah Wishlist',
              url: window.location.href,
            });
          } else {
            navigator.clipboard.writeText(window.location.href);
            showToast('Wishlist link copied to clipboard!');
          }
        }}
      />

      {/* 3. Flash Price Drop Banner */}
      <WishlistPriceDropBanner
        discountCount={priceDropStats.count}
        totalSaved={priceDropStats.totalSaved}
      />

      {/* 4. Filter & Sort Ribbon */}
      <WishlistFilterRibbon
        currentFilter={filter}
        onSelectFilter={setFilter}
        counts={counts}
        currentSort={sort}
        onToggleSort={toggleSort}
        sortLabel={sortLabel}
      />

      {/* 5. Wishlist Cards Feed */}
      <main className="px-4 flex flex-col gap-3.5">
        {filteredItems.length === 0 ? (
          <WishlistEmptyState
            isFiltered={filter !== 'all'}
            onResetFilter={() => setFilter('all')}
          />
        ) : (
          filteredItems.map((item, idx) => (
            <WishlistSwipeItemCard
              key={item.id}
              item={item}
              onRemove={handleRemove}
              onAddToBag={handleAddToBag}
              onToggleFavorite={handleToggleFavorite}
              showSwipeHint={idx === 0}
            />
          ))
        )}
      </main>
    </div>
  );
}
