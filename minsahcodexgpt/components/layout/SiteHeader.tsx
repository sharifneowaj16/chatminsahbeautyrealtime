'use client';

import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import HomeSearch from '@/app/components/HomeSearch';
import CategoryRail from '@/components/catalog/CategoryRail';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';
import { useDeliveryLocation } from '@/contexts/DeliveryLocationContext';
import DeliveryFlyout from '@/components/layout/DeliveryFlyout';
import MobileNavDrawer from '@/components/layout/MobileNavDrawer';
import MemberAuthModal from '@/components/auth/MemberAuthModal';
import {
  MapPinUserLineIcon,
  HeartLineIcon,
  UserLineIcon,
  VipCrown2LineIcon,
  ShoppingBag4LineIcon,
} from '@/components/ui/icons/RemixIcons';

const DEFAULT_NAV_CATEGORIES = [
  { id: 'skincare', name: 'Skincare', href: '/shop?category=Skincare' },
  { id: 'makeup', name: 'Makeup', href: '/shop?category=Makeup' },
  { id: 'hair-care', name: 'Hair Care', href: '/shop?category=Hair%20Care' },
  { id: 'fragrance', name: 'Fragrance', href: '/shop?category=Fragrance' },
  { id: 'bath-body', name: 'Bath & Body', href: '/shop?category=Bath%20%26%20Body' },
  { id: 'lip-care', name: 'Lip Care', href: '/shop?category=Lip%20Care' },
  { id: 'sunscreen', name: 'Sunscreen', href: '/shop?category=Sunscreen' },
  { id: 'serum', name: 'Serum', href: '/shop?category=Serum' },
];

let cachedNavCategories: { id: string; name: string; href: string }[] | null = null;

export default function SiteHeader() {
  const { items } = useCart();
  const { openDrawer } = useCartDrawer();
  const { user, loading } = useAuth();
  const { savedLocation } = useDeliveryLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [wishlistCount, setWishlistCount] = useState<number>(0);
  const deliveryBtnRef = useRef<HTMLButtonElement>(null);

  // Derive display label from saved location
  const deliveryDisplayCity = savedLocation?.area || savedLocation?.city || 'Dhaka';

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  const [navCategories, setNavCategories] = useState<{ id: string; name: string; href: string }[]>(
    () => cachedNavCategories || DEFAULT_NAV_CATEGORIES
  );

  // Sync sub-navigation categories with API (cached to eliminate fetch waterfalls on client route changes)
  useEffect(() => {
    if (cachedNavCategories && cachedNavCategories.length > 0) return;

    const controller = new AbortController();
    fetch('/api/categories?activeOnly=true', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.categories?.length) {
          const mapped = data.categories.map((c: { id: string; name: string; href?: string }) => ({
            id: c.id,
            name: c.name,
            href: c.href || `/shop?category=${encodeURIComponent(c.name)}`,
          }));
          cachedNavCategories = mapped;
          setNavCategories(mapped);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  // Sync wishlist item count & listen for live changes
  useEffect(() => {
    const syncWishlist = () => {
      try {
        const raw = localStorage.getItem('minsah_wishlist_count');
        if (raw !== null) {
          setWishlistCount(Number(raw) || 0);
        }
      } catch {}
    };

    syncWishlist();
    window.addEventListener('minsah:wishlist-update', syncWishlist);
    window.addEventListener('storage', syncWishlist);

    return () => {
      window.removeEventListener('minsah:wishlist-update', syncWishlist);
      window.removeEventListener('storage', syncWishlist);
    };
  }, []);

  // Global keyboard shortcut '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '') &&
        !(document.activeElement as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        // Check if on mobile: open mobile search overlay
        if (window.innerWidth < 768) {
          setMobileSearchOpen(true);
        } else {
          const searchInput = document.querySelector<HTMLInputElement>(
            '.search-area input[type="text"], .search-area input[type="search"], .search-area-tablet input'
          );
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="site-header" role="banner">
        <div className="header-container">
          <div className="header-main">
            {/* Left: Brand Logo & Deliver-To */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Brand Logo */}
              <Link href="/" className="brand" aria-label="Minsah Beauty home" onClick={closeMenu}>
                <span className="brand-icon">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
                    <path d="M20 2v4" />
                    <path d="M22 4h-4" />
                    <circle cx="4" cy="20" r="2" />
                  </svg>
                </span>
                <span className="brand-copy">
                  <span className="brand-name">Minsah</span>
                  <span className="brand-tag">Beauty</span>
                </span>
              </Link>

              {/* Deliver To: Location Selector Pill */}
              <button
                ref={deliveryBtnRef}
                className="mobile-deliver-chip"
                type="button"
                aria-label={`Deliver to ${deliveryDisplayCity}, change location`}
                aria-expanded={deliveryOpen}
                aria-haspopup="dialog"
                onClick={() => setDeliveryOpen((v) => !v)}
              >
                <MapPinUserLineIcon size={14} className="text-[#D4F6A2] shrink-0" />
                <span className="truncate max-w-[95px] text-[12px] font-semibold text-[#EAF7D8]">
                  {deliveryDisplayCity}
                </span>
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#D4F6A2]/80 shrink-0"
                  aria-hidden="true"
                  style={{
                    transition: 'transform 0.2s ease',
                    transform: deliveryOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>

            {/* Centralized Search Area: Desktop (1024px+) */}
            <div className="search-area hidden lg:block">
              <HomeSearch showTrendingChips={false} />
            </div>

            {/* Centralized Search Area: Tablet (768px - 1023px) */}
            <div className="search-area-tablet hidden md:block lg:hidden flex-1 max-w-[340px] mx-2">
              <HomeSearch variant="compact" showTrendingChips={false} />
            </div>

            {/* Right Action Controls */}
            <div className="header-actions">
              {/* Wishlist Link (Desktop & Tablet) */}
              <Link
                className="header-control icon-control wishlist relative hidden md:inline-flex"
                href="/wishlist"
                aria-label="Open wishlist"
              >
                <HeartLineIcon size={19} className="text-[#EAF7D8]" />
                {wishlistCount > 0 && (
                  <span className="wishlist-badge">
                    {wishlistCount > 99 ? '99+' : wishlistCount}
                  </span>
                )}
              </Link>

              {/* Sign In / VIP Club Profile Pill */}
              {!loading && user ? (
                <Link
                  className="header-control vip-profile-pill hidden sm:inline-flex items-center gap-1.5"
                  href="/account"
                  aria-label="Minsah VIP Club Profile"
                >
                  <VipCrown2LineIcon size={16} className="text-amber-300 shrink-0" />
                  <span className="text-xs font-bold text-[#EAF7D8] truncate max-w-[110px]">
                    {user.firstName || 'VIP Club'}
                  </span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="header-control signin hidden sm:inline-flex items-center gap-1.5"
                  aria-label="Sign in to your account with Phone OTP"
                >
                  <UserLineIcon size={17} className="accent-icon text-[#D4F6A2]" />
                  <span className="hidden lg:inline text-xs font-semibold">Sign In</span>
                </button>
              )}

              {/* Cart Drawer Trigger Button */}
              <button
                className="header-control cart relative"
                type="button"
                onClick={openDrawer}
                aria-label={`Open cart drawer, ${itemCount} items`}
              >
                <ShoppingBag4LineIcon size={19} className="accent-icon text-[#D4F6A2]" />
                {itemCount > 0 && (
                  <span className="cart-badge">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </button>

              {/* Mobile / Tablet Nav Drawer Trigger */}
              <button
                className="header-control icon-control menu-btn"
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-controls="minsah-mobile-site-menu"
                aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 5h16" />
                  <path d="M4 12h16" />
                  <path d="M4 19h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Sub-Row: Seamless Full-Width Touch Search Bar (Mobile < 768px) */}
          <div className="mobile-search-subrow md:hidden">
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              className="mobile-search-trigger-btn"
              aria-label="Search 100% genuine products"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#D4F6A2] shrink-0"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <span className="search-placeholder-text">
                  Search genuine skincare, makeup & more...
                </span>
              </div>
              <span className="mobile-search-kbd">/</span>
            </button>
          </div>
        </div>

        {/* Mobile Full-Screen Search View (Native Overlay) */}
        {mobileSearchOpen && (
          <HomeSearch
            isMobileFullScreen={true}
            onCloseMobile={() => setMobileSearchOpen(false)}
            autoFocus={true}
          />
        )}
      </header>

      {/* Deliver To: Location Selector Modal / Flyout */}
      <DeliveryFlyout
        open={deliveryOpen}
        onClose={() => setDeliveryOpen(false)}
        anchorRef={deliveryBtnRef}
      />

      {/* Phone-First SMS OTP Modal */}
      <MemberAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setAuthModalOpen(false)}
      />

      {/* Category Rail (Modular Component with auto-hide on down-scroll) */}
      <CategoryRail />

      {/* Mobile Navigation Drawer Sheet */}
      <MobileNavDrawer
        isOpen={menuOpen}
        onClose={closeMenu}
        deliveryDisplayCity={deliveryDisplayCity}
        onOpenDelivery={() => setDeliveryOpen(true)}
        onOpenAuth={() => {
          closeMenu();
          setAuthModalOpen(true);
        }}
        categories={navCategories}
        user={user}
      />
    </>
  );
}
