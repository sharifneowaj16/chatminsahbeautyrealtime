'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BadgePercent,
  Heart,
  MapPin,
  Menu,
  ShoppingBag,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import HomeSearch from '@/app/components/HomeSearch';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useCategories } from '@/contexts/CategoriesContext';
import {
  isPrimaryNavigationItemActive,
  primaryNavigationItems,
} from '@/components/navigation/navigation-config';
import { Button } from '@/components/ui/Button';
import { useScrollHeader } from '@/hooks/useSwipeAndScrollHeader';

/* ═══════════════════════════════════════════════════════════
   SiteHeader — 3-Row Premium Header
   Row 1: Logo | Deliver to | Search | ❤️ | 👤 Login | 🛒 Cart
   Row 2: Primary Navbar (Home · Shop · Categories · Brands · Offers)
   Row 3: Category chips (scrollable)
   ═══════════════════════════════════════════════════════════ */

export default function SiteHeader() {
  const pathname = usePathname();
  const { items } = useCart();
  const { user, loading } = useAuth();
  const { getActiveCategories, loading: categoriesLoading } = useCategories();
  const [menuOpen, setMenuOpen] = useState(false);

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const accountHref = !loading && user ? '/account' : '/login';

  /* Scroll-based search collapse: collapse search bar when scrolled past 100px */
  const isScrolled = useScrollHeader(100);

  const closeMenu = () => setMenuOpen(false);

  /* Active categories for the category chip bar */
  const activeCategories = getActiveCategories();

  return (
    <header className="sticky top-0 z-50 border-b border-[#8E6545]/40 bg-minsah-dark text-minsah-light shadow-lg shadow-minsah-dark/10">
      <div className="mx-auto max-w-7xl px-4 lg:px-6">

        {/* ═══════════════════════════════════════
            ROW 1 — Main Action Bar
            Logo | Deliver to | Search | Fav | Login | Cart
           ═══════════════════════════════════════ */}
        <div className="flex h-[60px] items-center gap-2 sm:gap-3">

          {/* ─── Logo ─── */}
          <Link
            href="/"
            className="minsah-touch-target flex min-w-0 flex-shrink-0 items-center gap-2"
            aria-label="Minsah Beauty home"
            onClick={closeMenu}
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-minsah-accent text-minsah-primary shadow-sm">
              <Sparkles size={18} aria-hidden="true" />
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-base font-black tracking-tight">Minsah</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.22em] text-minsah-accent/85">
                Beauty
              </span>
            </span>
          </Link>

          {/* ─── Deliver to ─── */}
          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#C5B8AC] transition hover:bg-white/10 hover:text-white md:flex"
            aria-label="Select delivery location"
          >
            <MapPin size={14} className="flex-shrink-0 text-[#D48B38]" aria-hidden="true" />
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[10px] font-medium text-[#8C7E74]">Deliver to</span>
              <span className="text-xs font-bold text-[#FFE6D2]">Dhaka</span>
            </span>
          </button>

          {/* ─── Search (Expandable Pill) ─── */}
          <div className="flex flex-1 items-center justify-center md:justify-start lg:mx-4">
            <HomeSearch showTrendingChips={false} forceCollapsed={isScrolled} />
          </div>

          {/* ─── Right Actions: Fav | Login | Cart | Menu ─── */}
          <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">

            {/* Wishlist */}
            <Link
              href="/wishlist"
              aria-label="Open wishlist"
              className="minsah-icon-control hidden h-10 w-10 items-center justify-center rounded-full bg-white/[0.07] text-[#C5B8AC] ring-1 ring-white/10 transition hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-minsah-accent sm:flex"
            >
              <Heart size={18} aria-hidden="true" />
            </Link>

            {/* Login / Account */}
            <Link
              href={accountHref}
              aria-label={user ? 'Go to account' : 'Login to your account'}
              className="minsah-touch-target hidden min-h-10 items-center gap-1.5 rounded-full bg-minsah-accent px-3 text-sm font-bold text-minsah-dark transition hover:bg-white focus-visible:ring-2 focus-visible:ring-minsah-accent sm:flex"
            >
              <UserRound size={16} aria-hidden="true" />
              <span>{user ? 'Account' : 'Login'}</span>
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              aria-label={`Cart${itemCount > 0 ? `, ${itemCount} item${itemCount > 1 ? 's' : ''}` : ''}`}
              className="minsah-icon-control relative flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.07] text-[#C5B8AC] ring-1 ring-white/10 transition hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-minsah-accent"
            >
              <ShoppingBag size={18} aria-hidden="true" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-minsah-danger px-1 text-[10px] font-bold leading-none text-white shadow-sm">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>

            {/* Mobile Hamburger */}
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => setMenuOpen((c) => !c)}
              aria-expanded={menuOpen}
              aria-controls="minsah-mobile-site-menu"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="h-10 w-10 border-transparent bg-minsah-accent text-minsah-dark hover:bg-white focus-visible:ring-2 focus-visible:ring-minsah-accent lg:hidden"
            >
              {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </Button>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            ROW 2 — Primary Navigation Bar
           ═══════════════════════════════════════ */}
        <nav
          className="hidden items-center gap-0.5 border-t border-white/[0.06] py-1 lg:flex"
          aria-label="Primary navigation"
        >
          {primaryNavigationItems.map((item) => {
            const active = isPrimaryNavigationItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors focus-visible:ring-2 focus-visible:ring-minsah-accent ${
                  active
                    ? 'bg-minsah-accent text-minsah-dark'
                    : 'text-[#C5B8AC] hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* ═══════════════════════════════════════
            ROW 3 — Category Chips (scrollable)
           ═══════════════════════════════════════ */}
        {!categoriesLoading && activeCategories.length > 0 && (
          <div
            className="hidden items-center gap-1.5 overflow-x-auto border-t border-white/[0.05] py-1.5 scrollbar-hide lg:flex"
            aria-label="Category shortcuts"
          >
            {activeCategories.map((cat) => {
              const isActive = pathname === `/categories/${cat.slug}` || pathname === `/shop?category=${encodeURIComponent(cat.name)}`;
              return (
                <Link
                  key={cat.id}
                  href={cat.href || `/categories/${cat.slug}`}
                  className={`flex-shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#984B29] text-white'
                      : 'bg-white/[0.05] text-[#8C7E74] hover:bg-white/[0.10] hover:text-[#FFE6D2]'
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════
          MOBILE MENU (Hamburger Dropdown)
         ═══════════════════════════════════════ */}
      {menuOpen && (
        <div id="minsah-mobile-site-menu" className="border-t border-white/10 bg-minsah-dark lg:hidden">
          <nav className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-4 py-4" aria-label="Mobile navigation">
            {primaryNavigationItems.map((item) => {
              const active = isPrimaryNavigationItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-11 items-center rounded-2xl px-4 py-3 text-sm font-bold transition ${
                    active
                      ? 'bg-minsah-accent text-minsah-dark'
                      : 'bg-white/[0.08] text-minsah-light hover:bg-white/[0.15]'
                  }`}
                >
                  {item.href === '/flash-sale' && (
                    <BadgePercent size={17} className="mr-2" aria-hidden="true" />
                  )}
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/wishlist"
              onClick={closeMenu}
              className="flex min-h-11 items-center rounded-2xl bg-white/[0.08] px-4 py-3 text-sm font-bold text-minsah-light hover:bg-white/[0.15] sm:hidden"
            >
              <Heart size={17} className="mr-2" aria-hidden="true" /> Wishlist
            </Link>
            <Link
              href={accountHref}
              onClick={closeMenu}
              className="flex min-h-11 items-center rounded-2xl bg-minsah-accent px-4 py-3 text-sm font-bold text-minsah-dark sm:hidden"
            >
              <UserRound size={17} className="mr-2" aria-hidden="true" />{' '}
              {user ? 'Account' : 'Login'}
            </Link>
          </nav>

          {/* Mobile category chips inside menu */}
          {!categoriesLoading && activeCategories.length > 0 && (
            <div className="border-t border-white/[0.06] px-4 py-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8C7E74]">
                Categories
              </p>
              <div className="flex flex-wrap gap-1.5">
                {activeCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={cat.href || `/categories/${cat.slug}`}
                    onClick={closeMenu}
                    className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-[#C5B8AC] transition hover:bg-white/[0.12] hover:text-white"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
