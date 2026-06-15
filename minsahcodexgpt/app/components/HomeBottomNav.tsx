import Link from 'next/link';
import { Heart, Home as HomeIcon, Search, ShoppingCart, User } from 'lucide-react';
import CartNavBadge from './CartNavBadge';

export default function HomeBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-minsah-accent shadow-lg z-50">
      <div className="flex items-center justify-around py-3">
        <Link href="/" className="flex flex-col items-center gap-1 text-minsah-primary">
          <HomeIcon size={24} />
          <span className="text-xs font-semibold">Home</span>
        </Link>
        <Link href="/search" className="flex flex-col items-center gap-1 text-minsah-secondary hover:text-minsah-primary transition">
          <Search size={24} />
          <span className="text-xs">Search</span>
        </Link>
        <Link href="/wishlist" className="flex flex-col items-center gap-1 text-minsah-secondary hover:text-minsah-primary transition">
          <Heart size={24} />
          <span className="text-xs">Wishlist</span>
        </Link>
        <Link href="/cart" className="flex flex-col items-center gap-1 text-minsah-secondary hover:text-minsah-primary transition relative">
          <ShoppingCart size={24} />
          <CartNavBadge />
          <span className="text-xs">Cart</span>
        </Link>
        <Link href="/login" className="flex flex-col items-center gap-1 text-minsah-secondary hover:text-minsah-primary transition">
          <User size={24} />
          <span className="text-xs">Account</span>
        </Link>
      </div>
    </nav>
  );
}
