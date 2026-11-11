'use client';

import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import HomeSearch from '@/app/components/HomeSearch';
import DynamicSearchWrapper from '@/components/search/DynamicSearchWrapper';
import CategoryRail from '@/components/catalog/CategoryRail';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';
import { useDeliveryLocation } from '@/contexts/DeliveryLocationContext';
import DeliveryFlyout from '@/components/layout/DeliveryFlyout';
import MobileNavDrawer from '@/components/layout/MobileNavDrawer';
import MemberAuthModal from '@/components/auth/MemberAuthModal';
import { DEFAULT_MOBILE_HEADER_CONFIG, type MobileHeaderConfig } from '@/types/navigation-config';
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
  const [mobileHeader, setMobileHeader] = useState<MobileHeaderConfig>(DEFAULT_MOBILE_HEADER_CONFIG);
  const deliveryBtnRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Sync mobile header decluttering config from server / live events
  useEffect(() => {
    fetch('/api/navigation-config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.config?.mobileHeader) {
          setMobileHeader(data.config.mobileHeader);
        }
      })
      .catch(() => {});

    const handleConfigUpdate = (e: any) => {
      if (e?.detail?.mobileHeader) {
        setMobileHeader(e.detail.mobileHeader);
      }
    };
    window.addEventListener('minsah:navigation-config-updated', handleConfigUpdate);
    return () => window.removeEventListener('minsah:navigation-config-updated', handleConfigUpdate);
  }, []);

  // Check if all action icons on mobile top header are toggled off
  const allMobileIconsOff =
    !mobileHeader.showWishlist &&
    !mobileHeader.showCart &&
    !mobileHeader.showAccount &&
    !mobileHeader.showMenu;

  // Dynamically calculate and sync mobile site header height to CSS variable
  // This eliminates hardcoded gaps for CategoryRail regardless of whether mobile icons are ON or OFF
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--site-header-actual-height', `${height}px`);
        document.documentElement.style.setProperty('--minsah-site-header-height', `${height}px`);
      }
    };

    updateHeaderHeight();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && headerRef.current) {
      ro = new ResizeObserver(() => updateHeaderHeight());
      ro.observe(headerRef.current);
    }

    window.addEventListener('resize', updateHeaderHeight);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, [allMobileIconsOff, mobileHeader]);

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
      <header
        ref={headerRef}
        data-all-icons-off={allMobileIconsOff ? 'true' : 'false'}
        className="site-header overflow-x-hidden w-full max-w-full"
        role="banner"
      >
        <style>{`
          @media (max-width: 767px) {
            .site-header [data-mobile-hidden="true"] {
              display: none !important;
            }
          }
        `}</style>
        <div className="header-container overflow-x-hidden w-full max-w-[1440px] mx-auto px-2 sm:px-4 lg:px-8">
          <div className="header-main flex items-center justify-between w-full max-w-full overflow-hidden">
            {/* Left: Brand Logo & Deliver-To */}
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink-0">
              {/* Brand Logo */}
              <Link
                href="/"
                data-mobile-hidden={!mobileHeader.showLogo ? 'true' : undefined}
                className={`brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4F6A2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#062402] rounded-lg ${!mobileHeader.showLogo ? 'hidden md:inline-flex' : ''}`}
                aria-label="Minsah Beauty home"
                onClick={closeMenu}
              >
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
                data-mobile-hidden={!mobileHeader.showDeliverTo ? 'true' : undefined}
                className={`mobile-deliver-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4F6A2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#062402] ${!mobileHeader.showDeliverTo ? 'hidden md:inline-flex' : ''}`}
                type="button"
                aria-label={`Deliver to ${deliveryDisplayCity}, change location`}
                aria-expanded={deliveryOpen}
                aria-haspopup="dialog"
                onClick={() => setDeliveryOpen((v) => !v)}
              >
                <MapPinUserLineIcon size={14} className="text-[#D4F6A2] shrink-0" />
                <span className="truncate max-w-[70px] sm:max-w-[95px] lg:max-w-[160px] text-[11px] sm:text-[12px] font-semibold text-[#EAF7D8]">
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
              <DynamicSearchWrapper>
                <HomeSearch showTrendingChips={false} />
              </DynamicSearchWrapper>
            </div>

            {/* Centralized Search Area: Tablet (768px - 1023px) */}
            <div className="search-area-tablet hidden md:block lg:hidden flex-1 max-w-[340px] mx-2">
              <DynamicSearchWrapper>
                <HomeSearch variant="compact" showTrendingChips={false} />
              </DynamicSearchWrapper>
            </div>

            {/* Dynamic Mobile Search Area: Shifted to Top Row when all mobile action icons are OFF */}
            {allMobileIconsOff && (
              <div className="search-area-mobile flex-1 min-w-0 mx-1.5 sm:mx-2 md:hidden">
                <DynamicSearchWrapper>
                  <button
                    type="button"
                    onClick={() => setMobileSearchOpen(true)}
                    className="mobile-search-trigger-btn w-full !h-[38px] !min-h-[38px] !px-3 !py-0"
                    aria-label="Search 100% genuine products"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <svg
                        width="15"
                        height="15"
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
                      <span className="search-placeholder-text truncate text-xs">
                        Search skincare, makeup...
                      </span>
                    </div>
                    <span className="mobile-search-kbd text-[10px] px-1.5 py-0.5">/</span>
                  </button>
                </DynamicSearchWrapper>
              </div>
            )}

            {/* Right Action Controls */}
            <div className={`header-actions shrink-0 flex items-center gap-1 sm:gap-2 ${allMobileIconsOff ? 'hidden md:flex' : ''}`}>
              {/* Wishlist Link (Desktop & Tablet, plus mobile if toggled) */}
              <Link
                data-mobile-hidden={!mobileHeader.showWishlist ? 'true' : undefined}
                className={`header-control icon-control wishlist relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4F6A2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#062402] ${
                  mobileHeader.showWishlist ? 'inline-flex' : 'hidden md:inline-flex'
                }`}
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

              {/* Cart Drawer Trigger Button */}
              <button
                data-mobile-hidden={!mobileHeader.showCart ? 'true' : undefined}
                className={`header-control cart relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4F6A2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#062402] ${
                  !mobileHeader.showCart ? 'hidden md:inline-flex' : ''
                }`}
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

              {/* Sign In / VIP Club Profile Pill (Desktop/Tablet pill, Mobile 44x44 icon button when showAccount is on) */}
              {!loading && user ? (
                <Link
                  data-mobile-hidden={!mobileHeader.showAccount ? 'true' : undefined}
                  className={`header-control vip-profile-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4F6A2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#062402] ${
                    mobileHeader.showAccount ? 'inline-flex' : 'hidden sm:inline-flex'
                  } max-sm:w-11 max-sm:h-11 max-sm:min-w-[44px] max-sm:min-h-[44px] max-sm:p-0 max-sm:justify-center items-center gap-1.5`}
                  href="/account"
                  aria-label="Minsah VIP Club Profile"
                >
                  <VipCrown2LineIcon size={18} className="text-amber-300 shrink-0" />
                  <span className="hidden sm:inline text-xs font-bold text-[#EAF7D8] truncate max-w-[110px]">
                    {user.firstName || 'VIP Club'}
                  </span>
                </Link>
              ) : (
                <button
                  type="button"
                  data-mobile-hidden={!mobileHeader.showAccount ? 'true' : undefined}
                  onClick={() => setAuthModalOpen(true)}
                  className={`header-control signin focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4F6A2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#062402] ${
                    mobileHeader.showAccount ? 'inline-flex' : 'hidden sm:inline-flex'
                  } max-sm:w-11 max-sm:h-11 max-sm:min-w-[44px] max-sm:min-h-[44px] max-sm:p-0 max-sm:justify-center items-center gap-1.5`}
                  aria-label="Sign in to your account with Phone OTP"
                >
                  <UserLineIcon size={18} className="accent-icon text-[#D4F6A2]" />
                  <span className="hidden lg:inline text-xs font-semibold">Sign In</span>
                </button>
              )}

              {/* Mobile / Tablet Nav Drawer Trigger */}
              <button
                data-mobile-hidden={!mobileHeader.showMenu ? 'true' : undefined}
                className={`header-control icon-control menu-btn ${
                  !mobileHeader.showMenu ? 'hidden' : ''
                }`}
                type="button"
                onClick={() => {
                  console.log('[iOS DEBUG] Hamburger clicked');
                  setMenuOpen((v) => !v);
                }}
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

          {/* Sub-Row: Seamless Full-Width Touch Search Bar (Mobile < 768px) - Only rendered when action icons are active */}
          {!allMobileIconsOff && (
            <div className="mobile-search-subrow md:hidden">
              <DynamicSearchWrapper>
                <button
                  type="button"
                  onClick={() => setMobileSearchOpen(true)}
                  className="mobile-search-trigger-btn w-full"
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
              </DynamicSearchWrapper>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Full-Screen Search View (Native Overlay - Portaled to document.body) */}
      {mobileSearchOpen && (
        <HomeSearch
          isMobileFullScreen={true}
          onCloseMobile={() => setMobileSearchOpen(false)}
          autoFocus={true}
        />
      )}

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
