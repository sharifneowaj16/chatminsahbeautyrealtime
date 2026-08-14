'use client';

import Link from 'next/link';
import { BadgePercent, ShoppingBag, UserRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

export default function HomeHeaderActions() {
  const { items } = useCart();
  const { user, loading } = useAuth();
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const accountHref = !loading && user ? '/account' : '/login';

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/flash-sale"
        aria-label="View active offers"
        className="hidden min-h-11 items-center gap-2 rounded-full bg-white/10 px-3 text-sm font-bold text-minsah-light ring-1 ring-white/15 transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-minsah-accent md:flex"
      >
        <BadgePercent size={18} aria-hidden="true" />
        <span>Offers</span>
      </Link>
      <Link
        href="/cart"
        aria-label={`Cart${itemCount > 0 ? `, ${itemCount} item${itemCount > 1 ? 's' : ''}` : ''}`}
        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/10 text-minsah-light ring-1 ring-white/15 transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-minsah-accent"
      >
        <ShoppingBag size={20} aria-hidden="true" />
        {itemCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold leading-none text-white shadow-sm">
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
      </Link>

      <Link
        href={accountHref}
        aria-label={user ? 'Go to account' : 'Login to your account'}
        className="hidden min-h-11 items-center gap-2 rounded-full bg-minsah-accent px-3 text-sm font-bold text-minsah-dark transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-minsah-accent sm:flex"
      >
        <UserRound size={18} aria-hidden="true" />
        <span>{user ? 'Account' : 'Login'}</span>
      </Link>

      <Link
        href={accountHref}
        aria-label={user ? 'Go to account' : 'Login to your account'}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-minsah-accent text-minsah-dark transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-minsah-accent sm:hidden"
      >
        <UserRound size={19} aria-hidden="true" />
      </Link>
    </div>
  );
}
