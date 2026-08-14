'use client';

import Link from 'next/link';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { useScrollHeader } from '@/hooks/useSwipeAndScrollHeader';
import { useCart } from '@/contexts/CartContext';

interface ProductStickyHeaderProps {
  productName: string;
  price: number;
  variantName?: string | null;
  requiresVariantSelection?: boolean;
  stock?: number;
  inStock?: boolean;
}

export default function ProductStickyHeader({
  productName,
  price,
  variantName,
  requiresVariantSelection = false,
  stock = 0,
  inStock = true,
}: ProductStickyHeaderProps) {
  const showDetails = useScrollHeader(280);
  const { items } = useCart();
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const subtitle = requiresVariantSelection
    ? 'Select an option'
    : variantName
      ? `${variantName} • ৳${price.toLocaleString('bn-BD')}`
      : `৳${price.toLocaleString('bn-BD')}`;

  const stockLabel = requiresVariantSelection
    ? null
    : !inStock
      ? 'Out of stock'
      : stock <= 5
        ? `Only ${stock} left`
        : 'In stock';

  const stockClassName = !inStock
    ? 'bg-minsah-danger/15 text-red-100 ring-1 ring-red-300/30'
    : stock <= 5
      ? 'bg-amber-500/15 text-amber-100 ring-1 ring-amber-300/30'
      : 'bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-300/30';

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-minsah-dark text-minsah-light shadow-sm">
      <div className="mx-auto flex min-h-[3.75rem] max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        <Link
          href="/shop"
          aria-label="Back to shop"
          className="flex min-h-11 flex-shrink-0 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-minsah-light transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-minsah-accent"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          <span className="hidden sm:inline">Back to shop</span>
        </Link>

        <div
          className={`min-w-0 flex-1 overflow-hidden transition-all duration-300 ${
            showDetails ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <p className="truncate text-sm font-bold leading-tight text-minsah-light">{productName}</p>
          <div className="mt-1 flex items-center gap-2 overflow-hidden">
            <p className="truncate text-xs text-minsah-accent/80">{subtitle}</p>
            {stockLabel && (
              <span className={`inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ${stockClassName}`}>
                {stockLabel}
              </span>
            )}
          </div>
        </div>

        <Link
          href="/"
          className={`absolute left-1/2 -translate-x-1/2 rounded-full px-3 py-2 text-sm font-black tracking-tight text-minsah-light transition-all duration-300 focus-visible:ring-2 focus-visible:ring-minsah-accent ${
            showDetails ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
          aria-label="Minsah Beauty home"
          tabIndex={showDetails ? -1 : 0}
        >
          Minsah Beauty
        </Link>

        <Link
          href="/cart"
          aria-label={`Open cart${cartCount > 0 ? `, ${cartCount} item${cartCount > 1 ? 's' : ''}` : ''}`}
          className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-minsah-light transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-minsah-accent"
        >
          <ShoppingCart size={19} aria-hidden="true" />
          {cartCount > 0 && (
            <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-minsah-danger px-1 text-xs font-bold leading-none text-white">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
