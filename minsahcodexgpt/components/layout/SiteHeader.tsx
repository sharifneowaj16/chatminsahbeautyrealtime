'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BadgePercent, Heart, Menu, ShoppingBag, Sparkles, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import HomeSearch from '@/app/components/HomeSearch';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { isPrimaryNavigationItemActive, primaryNavigationItems } from '@/components/navigation/navigation-config';
import { Button } from '@/components/ui/Button';

export default function SiteHeader() {
  const pathname = usePathname();
  const { items } = useCart();
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const accountHref = !loading && user ? '/account' : '/login';

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 min-h-[var(--minsah-site-header-height)] border-b border-minsah-accent/70 bg-minsah-dark text-minsah-light shadow-lg shadow-minsah-dark/10">
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="flex min-h-[var(--minsah-site-header-height)] flex-wrap items-center gap-3 py-3">
          <Link href="/" className="minsah-touch-target flex min-w-0 items-center gap-2" aria-label="Minsah Beauty home" onClick={closeMenu}>
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-minsah-accent text-minsah-primary shadow-sm">
              <Sparkles size={20} aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-black tracking-tight sm:text-lg">Minsah</span>
              <span className="block text-xs font-medium uppercase tracking-[0.22em] text-minsah-accent/85">Beauty</span>
            </span>
          </Link>

          <nav className="ml-3 hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
            {primaryNavigationItems.map((item) => {
              const active = isPrimaryNavigationItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`minsah-touch-target min-h-11 rounded-full px-3 py-2 text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-minsah-accent ${
                    active
                      ? 'bg-minsah-accent text-minsah-dark'
                      : 'text-minsah-light hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="order-3 w-full md:order-none md:min-w-0 md:flex-1 lg:ml-3 flex items-center justify-center md:justify-start">
            <HomeSearch showTrendingChips={false} />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/wishlist"
              aria-label="Open wishlist"
              className="minsah-icon-control hidden h-11 w-11 items-center justify-center rounded-full bg-white/10 text-minsah-light ring-1 ring-white/15 transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-minsah-accent sm:flex"
            >
              <Heart size={19} aria-hidden="true" />
            </Link>

            <Link
              href="/cart"
              aria-label={`Cart${itemCount > 0 ? `, ${itemCount} item${itemCount > 1 ? 's' : ''}` : ''}`}
              className="minsah-icon-control relative flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-minsah-light ring-1 ring-white/15 transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-minsah-accent"
            >
              <ShoppingBag size={20} aria-hidden="true" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-minsah-danger px-1 text-xs font-bold leading-none text-white shadow-sm">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>

            <Link
              href={accountHref}
              aria-label={user ? 'Go to account' : 'Login to your account'}
              className="minsah-touch-target hidden min-h-11 items-center gap-2 rounded-full bg-minsah-accent px-3 text-sm font-bold text-minsah-dark transition hover:bg-white focus-visible:ring-2 focus-visible:ring-minsah-accent sm:flex"
            >
              <UserRound size={18} aria-hidden="true" />
              <span>{user ? 'Account' : 'Login'}</span>
            </Link>

            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => setMenuOpen((current) => !current)}
              aria-expanded={menuOpen}
              aria-controls="minsah-mobile-site-menu"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="border-transparent bg-minsah-accent text-minsah-dark hover:bg-white focus-visible:ring-2 focus-visible:ring-minsah-accent lg:hidden"
            >
              {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </Button>
          </div>
        </div>

      </div>

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
                    active ? 'bg-minsah-accent text-minsah-dark' : 'bg-white/[0.08] text-minsah-light hover:bg-white/[0.15]'
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
              className="flex min-h-11 items-center rounded-2xl bg-white/[0.08] px-4 py-3 text-sm font-bold text-minsah-light hover:bg-white/[0.15] sm:hidden"
            >
              <Heart size={17} className="mr-2" aria-hidden="true" /> Wishlist
            </Link>
            <Link
              href={accountHref}
              onClick={closeMenu}
              className="flex min-h-11 items-center rounded-2xl bg-minsah-accent px-4 py-3 text-sm font-bold text-minsah-dark sm:hidden"
            >
              <UserRound size={17} className="mr-2" aria-hidden="true" /> {user ? 'Account' : 'Login'}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
