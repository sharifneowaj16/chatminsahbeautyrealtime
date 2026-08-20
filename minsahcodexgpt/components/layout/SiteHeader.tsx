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
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  image?: string;
}

const defaultHeaderCategories: HeaderCategoryItem[] = [
  { id: 'cat-for-you', name: 'For You', slug: 'for-you', href: '/#for-you', image: '/images/categories/For_You.svg' },
  { id: 'cat-makeup', name: 'Makeup', slug: 'makeup', href: '/shop?category=Makeup', image: '/images/categories/Makeup.png' },
  { id: 'cat-skincare', name: 'Skincare', slug: 'skincare', href: '/shop?category=Skincare', image: '/images/categories/Skincare.png' },
  { id: 'cat-hair-care', name: 'Hair Care', slug: 'hair-care', href: '/shop?category=Hair%20Care', image: '/images/categories/Hair_Care.png' },
  { id: 'cat-hair-color', name: 'Hair Color', slug: 'hair-color', href: '/shop?category=Hair%20Color', image: '/images/categories/Hair_Color.png' },
  { id: 'cat-lip-care', name: 'Lip Care', slug: 'lip-care', href: '/shop?category=Lip%20Care', image: '/images/categories/Lip_Care.png' },
  { id: 'cat-sunscreen', name: 'Sunscreen', slug: 'sunscreen', href: '/shop?category=Sunscreen', image: '/images/categories/Sunscreen.png' },
  { id: 'cat-serum', name: 'Serum', slug: 'serum', href: '/shop?category=Serum', image: '/images/categories/Serum.png' },
  { id: 'cat-fragrance', name: 'Fragrance', slug: 'fragrance', href: '/shop?category=Fragrance', image: '/images/categories/Fragrance.png' },
  { id: 'cat-bath-body', name: 'Bath & Body', slug: 'bath-body', href: '/shop?category=Bath%20%26%20Body', image: '/images/categories/Bath_&_Body.png' },
  { id: 'cat-new-arrivals', name: 'New Arrivals', slug: 'new-arrivals', href: '/shop?sort=newest', image: '/images/categories/New_Arrivals.png' },
  { id: 'cat-tools', name: 'Tools', slug: 'tools', href: '/shop?category=Tools', image: '/images/categories/Tools.png' },
  { id: 'cat-offers', name: 'Offers', slug: 'offers', href: '/flash-sale', image: '/images/categories/Offers.png' },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const { items } = useCart();
  const { openDrawer } = useCartDrawer();
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [categories, setCategories] = useState<HeaderCategoryItem[]>(defaultHeaderCategories);
  const [activeCategory, setActiveCategory] = useState<string>('For You');

  const [indicatorStyle, setIndicatorStyle] = useState<{ transform: string; width: string }>({
    transform: 'translateX(0px)',
    width: '108px',
  });
  const [activeBgStyle, setActiveBgStyle] = useState<{ transform: string; width: string }>({
    transform: 'translateX(16px)',
    width: '76px',
  });

  const railRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const accountHref = !loading && user ? '/account' : '/login';

  const closeMenu = () => setMenuOpen(false);

  // Load active categories from API
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/categories?activeOnly=true', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.categories?.length) {
          const apiCats: HeaderCategoryItem[] = data.categories.map((c: any) => {
            const slug = c.slug || c.name.toLowerCase().replace(/\s+/g, '-');
            const fileSlug = c.name.replace(/\s+/g, '_');
            return {
              id: c.id || slug,
              name: c.name,
              slug: slug,
              href: c.href || `/shop?category=${encodeURIComponent(c.name)}`,
              image: `/images/categories/${fileSlug}.png`,
            };
          });
          setCategories([
            { id: 'cat-for-you', name: 'For You', slug: 'for-you', href: '/#for-you', image: '/images/categories/For_You.svg' },
            ...apiCats,
          ]);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  // Update active indicator and background positions
  const updateIndicator = useCallback(() => {
    const activeEl = cellRefs.current.get(activeCategory);
    if (activeEl) {
      const left = activeEl.offsetLeft;
      const width = activeEl.offsetWidth;
      const bgWidth = Math.round(width * 0.7);
      const bgOffset = Math.round((width - bgWidth) / 2);
      setIndicatorStyle({
        transform: `translateX(${left}px)`,
        width: `${width}px`,
      });
      setActiveBgStyle({
        transform: `translateX(${left + bgOffset}px)`,
        width: `${bgWidth}px`,
      });
    }
  }, [activeCategory]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator, categories]);

  // Mouse Drag Scroll for Category Rail
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!railRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - railRef.current.offsetLeft);
    setScrollLeft(railRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !railRef.current) return;
    e.preventDefault();
    const x = e.pageX - railRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    railRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => setIsDragging(false);

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

      {/* Category Rail */}
      <nav aria-label="Minsah Beauty categories" className="mb-category-strip">
        <div
          ref={railRef}
          id="mbCategoryRail"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`mb-category-scroll ${isDragging ? 'dragging' : ''}`}
        >
          <div aria-hidden="true" className="mb-active-bg" id="mbActiveBg" style={activeBgStyle} />
          <div aria-hidden="true" className="mb-indicator" id="mbIndicator" style={indicatorStyle} />

          {categories.map((cat) => {
            const isActive = activeCategory === cat.name;
            return (
              <div key={cat.id} className="mb-category-cell">
                <Link
                  ref={(el) => {
                    if (el) cellRefs.current.set(cat.name, el);
                    else cellRefs.current.delete(cat.name);
                  }}
                  href={cat.href}
                  onClick={() => setActiveCategory(cat.name)}
                  aria-current={isActive ? 'page' : undefined}
                  data-category={cat.name}
                  className={`mb-category ${isActive ? 'active' : ''}`}
                >
                  <span aria-hidden="true" className="mb-cat-icon">
                    {cat.slug === 'for-you' || cat.name === 'For You' ? (
                      <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
                        <path
                          className="mb-icon-stroke"
                          d="M9.8 6.7h12.4c1.9 0 3.5 1.45 3.7 3.35l1.55 14.05c.23 2.16-1.45 4.05-3.62 4.05H8.17c-2.17 0-3.85-1.89-3.62-4.05L6.1 10.05A3.74 3.74 0 0 1 9.8 6.7Z"
                        />
                        <path
                          className="mb-icon-accent-soft"
                          d="M10.05 11.65c.35 3.07 2.87 5.4 5.95 5.4 3.09 0 5.61-2.33 5.96-5.4a7.18 7.18 0 0 1-11.91 0Z"
                        />
                        <path
                          className="mb-icon-stroke"
                          d="M10.05 11.65c0 3.23 2.66 5.85 5.95 5.85 3.3 0 5.96-2.62 5.96-5.85"
                        />
                        <circle className="mb-icon-accent" cx="24.6" cy="24.6" r="1.15" />
                      </svg>
                    ) : (
                      <img
                        alt=""
                        aria-hidden="true"
                        src={cat.image || `/images/categories/${cat.slug}.png`}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                  </span>
                  <span className="mb-cat-label">{cat.name}</span>
                </Link>
              </div>
            );
          })}
        </div>
      </nav>

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

