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
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import HomeSearch from '@/app/components/HomeSearch';
import CategoryRail from '@/components/catalog/CategoryRail';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';
import {
  isPrimaryNavigationItemActive,
  primaryNavigationItems,
} from '@/components/navigation/navigation-config';

export default function SiteHeader() {
  const pathname = usePathname();
  const { items } = useCart();
  const { openDrawer } = useCartDrawer();
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const accountHref = !loading && user ? '/account' : '/login';

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="site-header">
        <div className="header-container">
          <div className="header-main">
            {/* Logo */}
            <Link href="/" className="brand" aria-label="Minsah Beauty home" onClick={closeMenu}>
              <span className="brand-icon">
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
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

            {/* Delivery Location */}
            <button className="header-control delivery" type="button" aria-label="Delivery location">
              <MapPin size={15} className="accent-icon" aria-hidden="true" />
              <span className="delivery-copy">
                <span className="delivery-label">Deliver to:</span>
                <span className="delivery-city">
                  Dhaka
                  <ChevronDown size={11} aria-hidden="true" />
                </span>
              </span>
            </button>

            {/* Search Area */}
            <div className="search-area">
              <HomeSearch showTrendingChips={false} />
            </div>

            {/* Right Action Controls */}
            <div className="header-actions">
              <Link className="header-control icon-control wishlist" href="/wishlist" aria-label="Open wishlist">
                <Heart size={18} aria-hidden="true" />
              </Link>

              <Link
                className="header-control signin"
                href={accountHref}
                aria-label={user ? 'Sign in or view account' : 'Sign in to your account'}
              >
                <UserRound size={16} className="accent-icon" aria-hidden="true" />
                <span>{user ? 'Account' : 'Sign In'}</span>
              </Link>

              <button
                className="header-control cart"
                type="button"
                onClick={openDrawer}
                aria-label={`Open cart drawer, ${itemCount} items`}
              >
                <ShoppingCart size={19} className="accent-icon" aria-hidden="true" />
                {itemCount > 0 && <span className="cart-badge">{itemCount > 99 ? '99+' : itemCount}</span>}
              </button>

              <button
                className="header-control icon-control menu-btn"
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-controls="minsah-mobile-site-menu"
                aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              >
                {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="desktop-nav" aria-label="Main navigation">
          <div className="nav-container">
            <Link className="flash-link" href="/flash-sale">
              <Zap size={13} className="fill-current" aria-hidden="true" />
              <span>Flash Sale</span>
            </Link>

            <Link className={`nav-link ${pathname === '/' ? 'active' : ''}`} href="/">
              Home
            </Link>
            <Link className={`nav-link ${pathname === '/shop' ? 'active' : ''}`} href="/shop">
              Shop
            </Link>
            <Link className={`nav-link ${pathname.startsWith('/categories') ? 'active' : ''}`} href="/categories">
              Categories
            </Link>
            <Link className={`nav-link ${pathname.startsWith('/brands') ? 'active' : ''}`} href="/brands">
              Brands
            </Link>
            <Link className={`nav-link ${pathname === '/flash-sale' ? 'active' : ''}`} href="/flash-sale">
              Offers
            </Link>

            <span className="nav-divider" aria-hidden="true" />

            <div className="category-list">
              <Link className="category-link" href="/shop?category=Skincare">
                Skincare
              </Link>
              <Link className="category-link" href="/shop?category=Makeup">
                Makeup
              </Link>
              <Link className="category-link" href="/shop?category=Hair%20Care">
                Hair Care
              </Link>
              <Link className="category-link" href="/shop?category=Fragrances">
                Fragrances
              </Link>
              <Link className="category-link" href="/shop?category=Bath%20%26%20Body">
                Bath &amp; Body
              </Link>
              <Link className="category-link" href="/shop?category=Nail%20Care">
                Nail Care
              </Link>
              <Link className="category-link" href="/shop?category=Tools%20%26%20Brushes">
                Tools &amp; Brushes
              </Link>
              <Link className="category-link" href="/shop?category=Gift%20Sets">
                Gift Sets
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Category Rail (Modular Component) */}
      <CategoryRail />

      {/* Mobile Drawer Menu */}
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
        </div>
      )}
    </>
  );
}


