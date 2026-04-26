'use client';

import Link from 'next/link';
import { Home as HomeIcon, Search, Heart, ShoppingCart, User } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

interface MobileBottomNavProps {
  active?: 'home' | 'shop' | 'search' | 'wishlist' | 'cart' | 'account';
}

export default function MobileBottomNav({ active }: MobileBottomNavProps) {
  const { items } = useCart();

  const getItemClass = (key: MobileBottomNavProps['active']) =>
    `flex flex-col items-center gap-1 transition ${
      active === key ? 'text-minsah-primary' : 'text-minsah-secondary hover:text-minsah-primary'
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-minsah-accent shadow-lg z-50">
      <div className="flex items-center justify-around py-3">
        <Link href="/" className={getItemClass('home')}>
          <HomeIcon size={24} />
          <span className="text-xs font-semibold">Home</span>
        </Link>
        <Link href="/search" className={getItemClass(active === 'shop' ? 'shop' : 'search')}>
          <Search size={24} />
          <span className="text-xs">Search</span>
        </Link>
        <Link href="/wishlist" className={getItemClass('wishlist')}>
          <Heart size={24} />
          <span className="text-xs">Wishlist</span>
        </Link>
        <Link href="/cart" className={`${getItemClass('cart')} relative`}>
          <ShoppingCart size={24} />
          {items.length > 0 && (
            <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {items.length}
            </span>
          )}
          <span className="text-xs">Cart</span>
        </Link>
        <Link href="/login" className={getItemClass('account')}>
          <User size={24} />
          <span className="text-xs">Account</span>
        </Link>
      </div>
    </nav>
  );
}
