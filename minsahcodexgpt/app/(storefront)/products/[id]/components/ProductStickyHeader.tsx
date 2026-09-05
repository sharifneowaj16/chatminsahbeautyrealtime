'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Menu,
} from 'lucide-react';
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
    }, 250);
  };

  const toggleFlyout = (type: 'shop' | 'categories' | 'offers') => {
    setActiveFlyout((prev) => (prev === type ? null : type));
  };

  const [isScrolled, setIsScrolled] = useState(false);

  // Track scroll position and close flyouts only when user actually scrolls
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      setActiveFlyout(null);
    };

    setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const subtitle = requiresVariantSelection
    ? 'অপশন নির্বাচন করুন'
    : variantName
      ? `${variantName} • ৳${price.toLocaleString('bn-BD')}`
      : `৳${price.toLocaleString('bn-BD')}`;

  const navTextColor = isScrolled ? 'text-[#fcfcf7]' : 'text-[#1c3a13]';
  const navHoverBg = isScrolled ? 'hover:bg-[#fcfcf730]' : 'hover:bg-[#1c3a1310]';
  const activeBtnClass = isScrolled
    ? 'bg-[#fcfcf730] text-[#fcfcf7]'
    : 'bg-[#1c3a1315] text-[#1c3a13]';
  const inactiveBtnClass = `${navTextColor} bg-[#fcfcf71a] ${navHoverBg}`;

  return (
    <>
      <header className="sticky top-2 sm:top-3 z-40 w-full pointer-events-none transition-all duration-300">
        <div className="flex w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 pointer-events-auto">

          {/* ================= SEED.COM PIXEL-PERFECT LEFT FLOATING PILL ================= */}
          <div
            className={`relative flex items-center gap-3 sm:gap-4 rounded-full transition-all duration-300 ${
              isScrolled
                ? 'bg-[#575e5559] backdrop-blur-md border border-white/12 shadow-lg shadow-black/15'
                : 'bg-white border border-[#1c3a13]/8 shadow-sm'
            }`}
            style={{
              paddingTop: '6px',
              paddingBottom: '6px',
              paddingLeft: '16px',
              paddingRight: '16px',
            }}
          >

            {/* Brand Logo - Seed.com Standard */}
            <Link
              href="/"
              className={`flex h-8 items-center text-[18px] sm:text-[19px] font-semibold tracking-[-0.02em] hover:opacity-80 transition-opacity ${navTextColor}`}
              style={{ fontFamily: '"Seed Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
              aria-label="Minsah Beauty Home"
            >
              <span>Minsah</span>
            </Link>

            {/* Desktop Navigation Tabs (Hidden on mobile) */}
            <nav className="hidden md:flex items-center gap-1 sm:gap-1.5" aria-label="Product Page Navigation">

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
                  className={`flex h-8 items-center justify-center rounded-full px-3 text-[14px] font-[350] leading-none transition-all ${
                    activeFlyout === 'shop' ? activeBtnClass : inactiveBtnClass
                  }`}
                >
                  <span>Shop</span>
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
                  className={`flex h-8 items-center justify-center rounded-full px-3 text-[14px] font-[350] leading-none transition-all ${
                    activeFlyout === 'categories' ? activeBtnClass : inactiveBtnClass
                  }`}
                >
                  <span>Categories</span>
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
                  className={`flex h-8 items-center justify-center rounded-full px-3 text-[14px] font-[350] leading-none transition-all ${
                    activeFlyout === 'offers' ? activeBtnClass : inactiveBtnClass
                  }`}
                >
                  <span>Offers</span>
                </button>

                {/* Offers Flyout Drawer */}
                <ProductOffersDrawer
                  isOpen={activeFlyout === 'offers'}
                  onClose={() => setActiveFlyout(null)}
                />
              </div>

            </nav>
          </div>

          {/* ================= SEED.COM PIXEL-PERFECT RIGHT FLOATING PILL (GlassPillContainer) ================= */}
          <div
            className={`flex items-center gap-1.5 sm:gap-2 rounded-full transition-all duration-300 ${
              isScrolled
                ? 'bg-[#575e5559] backdrop-blur-md border border-white/12 shadow-lg shadow-black/15'
                : 'bg-white border border-[#1c3a13]/8 shadow-sm'
            }`}
            style={{
              paddingTop: '6px',
              paddingBottom: '6px',
              paddingLeft: '12px',
              paddingRight: '6px',
            }}
          >

            {/* Search Trigger */}
            <Link
              href="/search"
              aria-label="Search catalog"
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${navTextColor} ${navHoverBg}`}
            >
              <Search size={16} />
            </Link>

            {/* Seed.com Exact Cart Button (No Icon, Text + Superscript Counter, Fully Nested Inside Capsule) */}
            <button
              type="button"
              onClick={openCartDrawer}
              aria-label={`Open shopping cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
              className={`inline-flex h-8 items-center justify-center rounded-full px-3.5 sm:px-4 text-[14px] font-medium leading-none transition-all active:scale-95 shadow-xs ${
                isScrolled
                  ? 'bg-[#fcfcf7] text-[#1c3a13] hover:bg-[#f0f0eb]'
                  : 'bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#28521c]'
              }`}
            >
              <span>Cart</span>
              {cartCount > 0 && (
                <sup className="ml-0.5 text-[10px] font-bold leading-none align-super">
                  &nbsp;{cartCount > 99 ? '99+' : cartCount}
                </sup>
              )}
            </button>

            {/* Mobile Hamburger Menu Icon (Visible on < 768px) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open mobile navigation menu"
              className={`flex md:hidden h-8 w-8 items-center justify-center rounded-full transition ${navTextColor} ${navHoverBg}`}
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
