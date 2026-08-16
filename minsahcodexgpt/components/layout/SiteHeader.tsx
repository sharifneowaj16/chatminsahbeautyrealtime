'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BadgePercent,
  ChevronDown,
  Heart,
  MapPin,
  Menu,
  ShoppingCart,
  Sparkles,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import HomeSearch from '@/app/components/HomeSearch';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';
import {
  isPrimaryNavigationItemActive,
  primaryNavigationItems,
} from '@/components/navigation/navigation-config';
import { Button } from '@/components/ui/Button';

interface HeaderCategoryItem {
  id: string;
  name: string;
  slug: string;
  href: string;
}

const defaultHeaderCategories: HeaderCategoryItem[] = [
  { id: 'cat-skincare', name: 'Skincare', slug: 'skincare', href: '/shop?category=Skincare' },
  { id: 'cat-makeup', name: 'Makeup', slug: 'makeup', href: '/shop?category=Makeup' },
  { id: 'cat-lip-care', name: 'Lip Care', slug: 'lip-care', href: '/shop?category=Lip%20Care' },
  { id: 'cat-sunscreen', name: 'Sunscreen', slug: 'sunscreen', href: '/shop?category=Sunscreen' },
  { id: 'cat-hair-care', name: 'Hair Care', slug: 'hair-care', href: '/shop?category=Hair%20Care' },
  { id: 'cat-serum', name: 'Serum', slug: 'serum', href: '/shop?category=Serum' },
  { id: 'cat-offers', name: 'Offers', slug: 'offers', href: '/flash-sale' },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const { items } = useCart();
  const { openDrawer } = useCartDrawer();
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [categories, setCategories] = useState<HeaderCategoryItem[]>(defaultHeaderCategories);

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const accountHref = !loading && user ? '/account' : '/login';

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/categories?activeOnly=true', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.categories?.length) {
          setCategories(
            data.categories.map((c: any) => ({
              id: c.id || c.slug,
              name: c.name,
              slug: c.slug,
              href: c.href || `/shop?category=${encodeURIComponent(c.name)}`,
            }))
          );
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#141210] text-white shadow-md">
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        {/* ═══════════════════════════════════════
            TOP HEADER BAR (n8n.io Clean Structured Style)
           ═══════════════════════════════════════ */}
        <div className="flex min-h-[64px] flex-wrap items-center justify-between gap-3 py-2.5">
          {/* Logo with n8n.io style smooth color transitions */}
          <Link
            href="/"
            className="group minsah-touch-target flex min-w-0 flex-shrink-0 items-center gap-2.5 transition-all duration-300"
            aria-label="Minsah Beauty home"
            onClick={closeMenu}
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#E58B24] text-black shadow-sm font-black transition-all duration-300 group-hover:scale-105 group-hover:bg-[#FF6D5A] group-hover:text-white">
              <Sparkles size={19} aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-black tracking-tight text-white transition-colors duration-300 group-hover:text-[#FFE6D2] sm:text-lg">
                Minsah
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#E58B24] transition-colors duration-300 group-hover:text-[#FF6D5A]">
                Beauty
              </span>
            </span>
          </Link>

          {/* Deliver To Badge (n8n structured style) */}
          <button
            type="button"
            className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/80 transition-all hover:bg-white/[0.08] hover:border-white/20 focus-visible:ring-2 focus-visible:ring-[#E58B24]"
            aria-label="Delivery location"
          >
            <MapPin size={15} className="flex-shrink-0 text-[#E58B24]" aria-hidden="true" />
            <span className="flex flex-col items-start leading-tight text-left">
              <span className="text-[10px] font-normal text-white/50">Deliver to</span>
              <span className="text-xs font-bold text-white flex items-center gap-1">
                Dhaka <ChevronDown size={11} className="text-white/60" />
              </span>
            </span>
          </button>

          {/* Search Bar */}
          <div className="order-3 w-full md:order-none md:min-w-0 md:flex-1 lg:max-w-[540px] flex items-center justify-center">
            <HomeSearch showTrendingChips={false} />
          </div>

          {/* Right Action Controls */}
          <div className="flex flex-shrink-0 items-center gap-2">
            {/* Wishlist */}
            <Link
              href="/wishlist"
              aria-label="Open wishlist"
              className="hidden sm:flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/80 transition-all hover:bg-white/[0.08] hover:border-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-[#E58B24]"
            >
              <Heart size={18} aria-hidden="true" />
            </Link>

            {/* Sign In / Account (Dynamic based on login status) */}
            <Link
              href={accountHref}
              aria-label={user ? 'Go to account' : 'Sign in to your account'}
              className="hidden sm:flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-xs font-bold text-white transition-all hover:bg-white/[0.08] hover:border-white/20 focus-visible:ring-2 focus-visible:ring-[#E58B24]"
            >
              <UserRound size={16} className="text-[#E58B24]" aria-hidden="true" />
              <span>{user ? 'Account' : 'Sign In'}</span>
            </Link>

            {/* Cart Button (Opens CartDrawer first, ShoppingCart icon, mobile top-left / desktop top-right badge) */}
            <button
              type="button"
              onClick={openDrawer}
              aria-label={`Open cart drawer${itemCount > 0 ? `, ${itemCount} items` : ''}`}
              className="relative flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-white transition-all hover:bg-white/[0.08] hover:border-white/20 focus-visible:ring-2 focus-visible:ring-[#E58B24] cursor-pointer"
            >
              <ShoppingCart size={19} className="text-[#E58B24]" aria-hidden="true" />
              {itemCount > 0 ? (
                <span className="absolute -top-1.5 -left-1.5 sm:-top-1.5 sm:-right-1.5 sm:left-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E58B24] px-1 text-[11px] font-black leading-none text-black shadow-sm">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              ) : (
                <span className="hidden sm:inline text-white/60">0</span>
              )}
            </button>

            {/* Mobile Hamburger Toggle */}
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => setMenuOpen((current) => !current)}
              aria-expanded={menuOpen}
              aria-controls="minsah-mobile-site-menu"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="h-11 w-11 rounded-xl border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-[#E58B24] lg:hidden"
            >
              {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </Button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          SUB-NAVIGATION & CATEGORY BAR (n8n Structured Bar)
         ═══════════════════════════════════════ */}
      <div className="hidden border-t border-white/[0.08] bg-[#0E0D0C] lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white/70 overflow-x-auto scrollbar-hide lg:px-6">
          {/* Flash Sale Badge */}
          <Link
            href="/flash-sale"
            className="flex items-center gap-1.5 rounded-lg bg-[#E58B24]/15 border border-[#E58B24]/30 px-2.5 py-1 text-xs font-bold text-[#E58B24] transition-colors hover:bg-[#E58B24] hover:text-black"
          >
            <Zap size={13} className="fill-current" aria-hidden="true" />
            <span>Flash Sale</span>
          </Link>

          {/* Primary Navigation Links */}
          {primaryNavigationItems.map((item) => {
            const active = isPrimaryNavigationItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-white/15 text-white font-bold'
                    : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          <span className="h-3.5 w-px bg-white/15 mx-1" aria-hidden="true" />

          {/* Category Chips */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {categories.map((cat) => {
              const isActive = pathname === `/categories/${cat.slug}`;
              return (
                <Link
                  key={cat.id}
                  href={cat.href || `/categories/${cat.slug}`}
                  className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-xs transition-colors ${
                    isActive
                      ? 'bg-white/15 text-white font-bold'
                      : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          MOBILE MENU (Hamburger Dropdown)
         ═══════════════════════════════════════ */}
      {menuOpen && (
        <div id="minsah-mobile-site-menu" className="border-t border-white/10 bg-[#141210] lg:hidden">
          <nav className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-4 py-4" aria-label="Mobile navigation">
            {primaryNavigationItems.map((item) => {
              const active = isPrimaryNavigationItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-11 items-center rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold transition ${
                    active ? 'bg-[#E58B24] text-black border-transparent' : 'bg-white/[0.04] text-white hover:bg-white/[0.08]'
                  }`}
                >
                  {item.href === '/flash-sale' && <BadgePercent size={17} className="mr-2" aria-hidden="true" />}
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/wishlist"
              onClick={closeMenu}
              className="flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white hover:bg-white/[0.08] sm:hidden"
            >
              <Heart size={17} className="mr-2 text-[#E58B24]" aria-hidden="true" /> Wishlist
            </Link>
            <Link
              href={accountHref}
              onClick={closeMenu}
              className="flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white hover:bg-white/[0.08] sm:hidden"
            >
              <UserRound size={17} className="mr-2 text-[#E58B24]" aria-hidden="true" /> {user ? 'Account' : 'Sign In'}
            </Link>
          </nav>

          {/* Categories in mobile menu */}
          <div className="border-t border-white/10 px-4 py-3 bg-[#0E0D0C]">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/50">
              Categories
            </p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={cat.href || `/categories/${cat.slug}`}
                  onClick={closeMenu}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/[0.08] hover:text-white"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
