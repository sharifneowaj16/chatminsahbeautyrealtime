'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Home, Search, ShoppingCart, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { isMobileNavigationItemActive, mobileNavigationItems } from './navigation-config';

const iconByKey = {
  home: Home,
  search: Search,
  heart: Heart,
  cart: ShoppingCart,
  user: User,
} as const;

export default function BottomNavigation() {
  const pathname = usePathname();
  const { items: cartItems } = useCart();
  const { user, loading } = useAuth();
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const accountHref = !loading && user ? '/account' : '/login';

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-minsah-border-soft bg-white/95 shadow-[0_-8px_30px_rgba(66,28,0,0.10)] backdrop-blur-md minsah-bottom-safe md:hidden"
      aria-label="Primary mobile navigation"
    >
      <div className="mx-auto grid h-[var(--minsah-bottom-nav-height)] max-w-lg grid-cols-5 items-stretch px-1">
        {mobileNavigationItems.map((item) => {
          const Icon = iconByKey[item.icon];
          const href = item.key === 'account' ? accountHref : item.href;
          const active = isMobileNavigationItemActive(pathname, item.key, item.href);
          const countLabel = item.key === 'cart' && totalQuantity > 0
            ? `, ${totalQuantity} item${totalQuantity > 1 ? 's' : ''}`
            : '';
          const label = item.key === 'account' && !user ? 'Login' : item.label;

          return (
            <Link
              key={item.key}
              href={href}
              aria-current={active ? 'page' : undefined}
              aria-label={`${label}${countLabel}`}
              className={`minsah-touch-target relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-minsah-primary ${
                active ? 'text-minsah-primary' : 'text-minsah-secondary hover:text-minsah-primary'
              }`}
            >
              <span className={`relative flex h-7 min-w-10 items-center justify-center rounded-full transition ${active ? 'bg-minsah-accent' : ''}`}>
                <Icon size={21} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
                {item.key === 'cart' && totalQuantity > 0 ? (
                  <span className="absolute -right-0.5 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-minsah-danger px-1 text-xs font-bold leading-none text-white">
                    {totalQuantity > 99 ? '99+' : totalQuantity}
                  </span>
                ) : null}
              </span>
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
