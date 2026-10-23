'use client';

import { useState } from 'react';
import { RecentlyViewedMobileHeader } from './RecentlyViewedMobileHeader';
import { RecentlyViewedPrivacyBar } from './RecentlyViewedPrivacyBar';
import { RecentlyViewedFilterCarousel } from './RecentlyViewedFilterCarousel';
import { RecentlyViewedProductCard } from './RecentlyViewedProductCard';
import { RecentlyViewedReCompareBento } from './RecentlyViewedReCompareBento';
import { RecentlyViewedClearHistoryModal } from './RecentlyViewedClearHistoryModal';
import { RecentlyViewedFloatingResumeBar } from './RecentlyViewedFloatingResumeBar';
import { RecentlyViewedItem, RecentlyViewedCategoryFilter } from './types';
import { History, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

const INITIAL_ITEMS: RecentlyViewedItem[] = [
  {
    id: 'rv-1',
    name: 'Glass Skin Hydrating Serum (30ml)',
    brand: 'ELIXIR VITAL',
    price: 1890,
    originalPrice: 2650,
    discountBadge: '28% OFF',
    viewedAgo: 'Viewed 12m ago',
    timelineGroup: 'today',
    category: 'serum',
    image: '/images/products/elixir-serum.png',
    rating: 4.9,
    reviewCount: 340,
    formulaNote: 'Quad-Hyaluronic • 5% Niacinamide • Dewy Barrier Plump',
    stockStatus: 'In Stock • Banani Hub Express Delivery',
    hasHologram: true,
  },
  {
    id: 'rv-2',
    name: 'Heartleaf 77% Soothing Toner (250ml)',
    brand: 'ANUA • K-BEAUTY',
    price: 2100,
    originalPrice: 2700,
    discountBadge: '22% OFF',
    viewedAgo: 'Viewed 45m ago',
    timelineGroup: 'today',
    category: 'toner',
    image: '/images/products/anua-toner.png',
    rating: 4.8,
    reviewCount: 215,
    formulaNote: '77% Heartleaf Extract • Calming Prep • Redness Relief',
    stockStatus: 'In Stock • Official Batch Verified',
    hasHologram: true,
  },
  {
    id: 'rv-3',
    name: 'Soothing Sun Relief SPF50+ PA++++ (50ml)',
    brand: 'ARISOL LABS',
    price: 1365,
    originalPrice: 1950,
    priceDropBadge: 'Price Dropped ৳150',
    discountBadge: '30% OFF Flash',
    viewedAgo: 'Viewed Yesterday',
    timelineGroup: 'yesterday',
    category: 'sunscreen',
    image: '/images/products/sun-relief.png',
    rating: 4.8,
    reviewCount: 189,
    formulaNote: 'Centella Asiatica • Green Tea • Zero White-Cast Formula',
    stockStatus: 'Only 3 left in stock in Dhaka',
    isLowStock: true,
    hasHologram: true,
  },
  {
    id: 'rv-4',
    name: 'Lip Sleeping Mask Berry (20g)',
    brand: 'LANEIGE',
    price: 1720,
    originalPrice: 2100,
    discountBadge: '18% OFF',
    viewedAgo: 'Viewed Yesterday',
    timelineGroup: 'yesterday',
    category: 'lip',
    image: '/images/products/laneige-lip.png',
    rating: 4.9,
    reviewCount: 512,
    formulaNote: 'Berry Fruit Complex • Vitamin C • Overnight Hydration',
    stockStatus: 'Authentic Korean Import • Batch: EXP2026',
    hasHologram: true,
  },
];

export function RecentlyViewedMobileView() {
  const [items, setItems] = useState<RecentlyViewedItem[]>(INITIAL_ITEMS);
  const [activeCategory, setActiveCategory] = useState<RecentlyViewedCategoryFilter>('all');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleClearConfirm = () => {
    setItems([]);
    setIsClearModalOpen(false);
    showToast('Browsing history cleared');
  };

  const handleAddToCart = (item: RecentlyViewedItem) => {
    showToast(`${item.name} added to bag!`);
  };

  const handleToggleWishlist = (item: RecentlyViewedItem) => {
    showToast(`Updated wishlist for ${item.name}`);
  };

  const filteredItems = items.filter((item) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'sunscreens') return item.category === 'sunscreen';
    if (activeCategory === 'serums') return item.category === 'serum';
    if (activeCategory === 'toners') return item.category === 'toner';
    if (activeCategory === 'lip-care') return item.category === 'lip';
    return true;
  });

  const todayItems = filteredItems.filter((it) => it.timelineGroup === 'today');
  const yesterdayItems = filteredItems.filter((it) => it.timelineGroup === 'yesterday');

  const counts: Record<RecentlyViewedCategoryFilter, number> = {
    all: items.length,
    sunscreens: items.filter((i) => i.category === 'sunscreen').length,
    serums: items.filter((i) => i.category === 'serum').length,
    toners: items.filter((i) => i.category === 'toner').length,
    'lip-care': items.filter((i) => i.category === 'lip').length,
  };

  return (
    <div className="lg:hidden min-h-screen bg-[#faf9f6] text-[#181C1A] flex flex-col pb-28">
      <RecentlyViewedMobileHeader onClearHistory={() => setIsClearModalOpen(true)} />

      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#062402] text-white px-4 py-2 rounded-full shadow-xl text-xs font-bold border border-[#ccee9b]/30">
          {toastMessage}
        </div>
      )}

      <main className="flex-1 flex flex-col px-4 pt-2 space-y-4">
        <RecentlyViewedPrivacyBar
          itemCount={items.length}
          onClearHistory={() => setIsClearModalOpen(true)}
        />

        <RecentlyViewedFilterCarousel
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          counts={counts}
        />

        {items.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-[#F2F6F0] flex items-center justify-center text-[#43483f]">
              <History className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-[#181C1A]">No recently viewed products</h3>
            <p className="text-xs text-[#43483f] max-w-xs">
              When you explore authentic Korean formulations, they will appear here automatically.
            </p>
            <Link
              href="/categories"
              className="mt-2 px-6 py-2.5 rounded-full bg-[#062402] text-white text-xs font-bold shadow-sm"
            >
              Explore Catalog
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6 pt-1">
            {/* Today Section */}
            {todayItems.length > 0 && (
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#062402]" />
                    <span className="text-xs font-bold text-[#062402]">Today</span>
                    <span className="text-[11px] text-[#43483f]">• Just Now</span>
                  </div>
                  <span className="text-[11px] text-[#43483f]">{todayItems.length} views</span>
                </div>

                <div className="flex flex-col gap-3">
                  {todayItems.map((item) => (
                    <RecentlyViewedProductCard
                      key={item.id}
                      item={item}
                      onAddToCart={handleAddToCart}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Yesterday Section */}
            {yesterdayItems.length > 0 && (
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4b6723]" />
                    <span className="text-xs font-bold text-[#062402]">Yesterday</span>
                    <span className="text-[11px] text-[#43483f]">• May 25</span>
                  </div>
                  <span className="text-[11px] text-[#43483f]">{yesterdayItems.length} views</span>
                </div>

                <div className="flex flex-col gap-3">
                  {yesterdayItems.map((item) => (
                    <RecentlyViewedProductCard
                      key={item.id}
                      item={item}
                      onAddToCart={handleAddToCart}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Re-Compare Bento Section */}
            <RecentlyViewedReCompareBento />

            {/* Clear All Bottom Trigger */}
            <div className="flex items-center justify-center pt-2 pb-4">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(true)}
                className="flex items-center gap-1.5 text-xs text-[#43483f] hover:text-rose-600 transition-colors px-4 py-2 rounded-full font-medium active:scale-95"
              >
                <History className="w-4 h-4" />
                <span>Clear all {items.length} tracked products</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Sticky Resume Banner */}
      {items.length > 0 && (
        <RecentlyViewedFloatingResumeBar
          lastViewedItem={items[0]}
          onQuickAdd={handleAddToCart}
        />
      )}

      {/* Confirmation Modal */}
      <RecentlyViewedClearHistoryModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleClearConfirm}
        itemCount={items.length}
      />
    </div>
  );
}
