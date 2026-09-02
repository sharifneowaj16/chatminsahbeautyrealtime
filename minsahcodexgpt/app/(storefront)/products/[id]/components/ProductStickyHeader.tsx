'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Search,
  Menu,
  ChevronDown,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { useScrollHeader } from '@/hooks/useSwipeAndScrollHeader';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';
import ProductShopDrawer, { ShopDrawerProduct } from './ProductShopDrawer';
import ProductCategoriesDrawer, { CategoryItem } from './ProductCategoriesDrawer';
import ProductOffersDrawer from './ProductOffersDrawer';
import ProductMobileNavDrawer from './ProductMobileNavDrawer';

interface ProductStickyHeaderProps {
  productName: string;
  price: number;
  variantName?: string | null;
  requiresVariantSelection?: boolean;
  stock?: number;
  inStock?: boolean;
  relatedProducts?: ShopDrawerProduct[];
  categories?: CategoryItem[];
}

export default function ProductStickyHeader({
  productName,
  price,
  variantName,
  requiresVariantSelection = false,
  stock = 0,
  inStock = true,
  relatedProducts = [],
  categories = [],
}: ProductStickyHeaderProps) {
  const showDetails = useScrollHeader(280);
  const { items } = useCart();
  const { openDrawer: openCartDrawer } = useCartDrawer();
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Active flyout state
  const [activeFlyout, setActiveFlyout] = useState<'shop' | 'categories' | 'offers' | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const flyoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Mouse enter/leave handlers for smooth hover flyouts on desktop
  const handleMouseEnter = (type: 'shop' | 'categories' | 'offers') => {
    if (flyoutTimerRef.current) clearTimeout(flyoutTimerRef.current);
    setActiveFlyout(type);
  };

  const handleMouseLeave = () => {
    if (flyoutTimerRef.current) clearTimeout(flyoutTimerRef.current);
    flyoutTimerRef.current = setTimeout(() => {
      setActiveFlyout(null);
    }, 200);
  };

  const toggleFlyout = (type: 'shop' | 'categories' | 'offers') => {
    setActiveFlyout((prev) => (prev === type ? null : type));
  };

  // Close flyouts on scroll if open
  useEffect(() => {
    const handleScroll = () => {
      if (activeFlyout) {
        setActiveFlyout(null);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeFlyout]);

  const subtitle = requiresVariantSelection
    ? 'অপশন নির্বাচন করুন'
    : variantName
      ? `${variantName} • ৳${price.toLocaleString('bn-BD')}`
      : `৳${price.toLocaleString('bn-BD')}`;

  return (
    <>
      <header className="sticky top-2 sm:top-3 z-40 w-full px-3 sm:px-6 pointer-events-none transition-all duration-300">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 pointer-events-auto">
          
          {/* ================= LEFT FLOATING PILL (LOGO + SHOP + CATS + OFFERS) ================= */}
          <div className="relative flex h-[50px] sm:h-[52px] items-center gap-1 sm:gap-2 rounded-full border border-white/60 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl px-3 sm:px-4 shadow-lg shadow-black/5 dark:border-white/10 dark:shadow-black/20 transition-all duration-300">
            
            {/* Brand Logo */}
            <Link
              href="/"
              className="flex items-center gap-1 font-serif text-base sm:text-lg font-bold tracking-tight text-[#1c3a13] dark:text-white px-1 sm:px-2 hover:opacity-80 transition-opacity"
              aria-label="Minsah Beauty Home"
            >
              <span>Minsah</span>
              <span className="text-emerald-600 dark:text-emerald-400">.</span>
            </Link>

            {/* Scrolled Compact Product Info (Subtle crossfade on deep scroll) */}
            {showDetails && (
              <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-black/10 dark:border-white/10 max-w-[200px] overflow-hidden animate-in fade-in-50 duration-200">
                <p className="truncate text-xs font-semibold text-[#1c3a13] dark:text-white">
                  {productName}
                </p>
              </div>
            )}

            {/* Desktop Navigation Tabs (Hidden on mobile) */}
            <nav className="hidden md:flex items-center gap-1 pl-1 border-l border-black/10 dark:border-white/10" aria-label="Product Page Navigation">
              
              {/* 1. Shop Tab (Seed.com flyout dropdown) */}
              <div
                className="relative"
                onMouseEnter={() => handleMouseEnter('shop')}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => toggleFlyout('shop')}
                  aria-expanded={activeFlyout === 'shop'}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeFlyout === 'shop'
                      ? 'bg-[#1c3a13] text-white'
                      : 'text-[#1c3a13] dark:text-white/90 hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                >
                  <span>Shop</span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-200 ${
                      activeFlyout === 'shop' ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* The Shop Flyout Drawer */}
                <ProductShopDrawer
                  isOpen={activeFlyout === 'shop'}
                  onClose={() => setActiveFlyout(null)}
                  products={relatedProducts.length > 0 ? relatedProducts : undefined}
                />
              </div>

              {/* 2. Categories Tab */}
              <div
                className="relative"
                onMouseEnter={() => handleMouseEnter('categories')}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => toggleFlyout('categories')}
                  aria-expanded={activeFlyout === 'categories'}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeFlyout === 'categories'
                      ? 'bg-[#1c3a13] text-white'
                      : 'text-[#1c3a13] dark:text-white/90 hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                >
                  <span>Categories</span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-200 ${
                      activeFlyout === 'categories' ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Categories Flyout Drawer */}
                <ProductCategoriesDrawer
                  isOpen={activeFlyout === 'categories'}
                  onClose={() => setActiveFlyout(null)}
                  categories={categories.length > 0 ? categories : undefined}
                />
              </div>

              {/* 3. Offers Tab */}
              <div
                className="relative"
                onMouseEnter={() => handleMouseEnter('offers')}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => toggleFlyout('offers')}
                  aria-expanded={activeFlyout === 'offers'}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeFlyout === 'offers'
                      ? 'bg-[#1c3a13] text-white'
                      : 'text-[#1c3a13] dark:text-white/90 hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                >
                  <span>Offers</span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-200 ${
                      activeFlyout === 'offers' ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Offers Flyout Drawer */}
                <ProductOffersDrawer
                  isOpen={activeFlyout === 'offers'}
                  onClose={() => setActiveFlyout(null)}
                />
              </div>

            </nav>
          </div>

          {/* ================= RIGHT FLOATING PILL (SEARCH + CART + MOBILE MENU) ================= */}
          <div className="flex h-[50px] sm:h-[52px] items-center gap-1.5 sm:gap-2 rounded-full border border-white/60 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl px-2.5 sm:px-3 shadow-lg shadow-black/5 dark:border-white/10 dark:shadow-black/20">
            
            {/* Search Trigger */}
            <Link
              href="/search"
              aria-label="Search catalog"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#1c3a13] dark:text-white/90 hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              <Search size={16} />
            </Link>

            {/* Cart Button with Live Dynamic Count Badge */}
            <button
              type="button"
              onClick={openCartDrawer}
              aria-label={`Open shopping cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
              className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-[#1c3a13] text-white hover:bg-[#142a0e] active:scale-95 transition-all shadow-sm"
            >
              <ShoppingBag size={17} />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-zinc-900 shadow-xs">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>

            {/* Mobile Hamburger Menu Icon (Visible on < 768px) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open mobile navigation menu"
              className="flex md:hidden h-9 w-9 items-center justify-center rounded-full text-[#1c3a13] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              <Menu size={18} />
            </button>

          </div>

        </div>
      </header>

      {/* Mobile Navigation Drawer Sheet */}
      <ProductMobileNavDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        products={relatedProducts}
        categories={categories}
      />
    </>
  );
}
