'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

  const [navCategories, setNavCategories] = useState<{ id: string; name: string; href: string }[]>([
    { id: 'skincare', name: 'Skincare', href: '/shop?category=Skincare' },
    { id: 'makeup', name: 'Makeup', href: '/shop?category=Makeup' },
    { id: 'hair-care', name: 'Hair Care', href: '/shop?category=Hair%20Care' },
    { id: 'fragrance', name: 'Fragrance', href: '/shop?category=Fragrance' },
    { id: 'bath-body', name: 'Bath & Body', href: '/shop?category=Bath%20%26%20Body' },
    { id: 'lip-care', name: 'Lip Care', href: '/shop?category=Lip%20Care' },
    { id: 'sunscreen', name: 'Sunscreen', href: '/shop?category=Sunscreen' },
    { id: 'serum', name: 'Serum', href: '/shop?category=Serum' },
  ]);

  // Dynamically sync sub-navigation with database categories
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/categories?activeOnly=true', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.categories?.length) {
          setNavCategories(
            data.categories.map((c: any) => ({
              id: c.id,
              name: c.name,
              href: c.href || `/shop?category=${encodeURIComponent(c.name)}`,
            }))
          );
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

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
              <svg
                className="accent-icon"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="delivery-copy">
                <span className="delivery-label">Deliver to:</span>
                <span className="delivery-city">
                  Dhaka
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
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
                  <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
                </svg>
              </Link>

              <Link
                className="header-control signin"
                href={accountHref}
                aria-label={user ? 'Sign in or view account' : 'Sign in to your account'}
              >
                <svg
                  className="accent-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="8" r="5" />
                  <path d="M20 21a8 8 0 0 0-16 0" />
                </svg>
                <span>{user ? 'Account' : 'Sign In'}</span>
              </Link>

              <button
                className="header-control cart"
                type="button"
                onClick={openDrawer}
                aria-label={`Open cart drawer, ${itemCount} items`}
              >
                <svg
                  className="accent-icon"
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
                  <circle cx="8" cy="21" r="1" />
                  <circle cx="19" cy="21" r="1" />
                  <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                </svg>
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
        </div>

        {/* Desktop Navigation */}
        <nav className="desktop-nav" aria-label="Main navigation">
          <div className="nav-container">
            <Link className="flash-link" href="/flash-sale">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
              </svg>
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

            {/* Dynamic Category List (100% Controlled by Admin Database) */}
            <div className="category-list">
              {navCategories.map((cat) => (
                <Link key={cat.id} className="category-link" href={cat.href}>
                  {cat.name}
                </Link>
              ))}
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
                    active ? 'bg-[#cf5178] text-white border-transparent' : 'bg-white/[0.04] text-white hover:bg-white/[0.08]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/wishlist"
              onClick={closeMenu}
              className="flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white hover:bg-white/[0.08] sm:hidden"
            >
              Wishlist
            </Link>
            <Link
              href={accountHref}
              onClick={closeMenu}
              className="flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white hover:bg-white/[0.08] sm:hidden"
            >
              {user ? 'Account' : 'Sign In'}
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}



