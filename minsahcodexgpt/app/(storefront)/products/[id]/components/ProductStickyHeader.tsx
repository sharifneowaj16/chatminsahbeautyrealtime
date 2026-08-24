'use client';

import Link from 'next/link';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { useScrollHeader } from '@/hooks/useSwipeAndScrollHeader';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';

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
  const { openDrawer } = useCartDrawer();
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const subtitle = requiresVariantSelection
    ? 'অপশন নির্বাচন করুন'
    : variantName
      ? `${variantName} • ৳${price.toLocaleString('bn-BD')}`
      : `৳${price.toLocaleString('bn-BD')}`;

  const stockLabel = requiresVariantSelection
    ? null
    : !inStock
      ? 'স্টক শেষ'
      : stock <= 5
        ? `মাত্র ${stock}টি বাকি`
        : 'স্টকে আছে';

  const stockClassName = !inStock
    ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
    : stock <= 5
      ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
      : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200';

  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 border-b border-minsah-border-subtle/80 bg-minsah-surface-page/95 backdrop-blur-md ${showDetails ? 'shadow-sm' : ''}`}>
      <div className="mx-auto flex min-h-[3.5rem] max-w-6xl items-center justify-between gap-3 px-4 py-2">
        <Link
          href="/shop"
          aria-label="Back to shop"
          className="flex min-h-10 flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-minsah-text-muted transition hover:bg-minsah-surface-subtle hover:text-minsah-text-primary"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span className="hidden sm:inline">শপে ফিরে যান</span>
        </Link>

        <div
          className={`min-w-0 flex-1 overflow-hidden transition-all duration-300 ${
            showDetails ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <p className="truncate text-sm font-bold leading-tight text-minsah-text-primary">{productName}</p>
          <div className="mt-0.5 flex items-center gap-2 overflow-hidden">
            <p className="truncate text-xs font-medium text-minsah-action-primary">{subtitle}</p>
            {stockLabel && (
              <span className={`inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${stockClassName}`}>
                {stockLabel}
              </span>
            )}
          </div>
        </div>

        <Link
          href="/"
          className={`absolute left-1/2 -translate-x-1/2 rounded-full px-3 py-1.5 text-sm font-bold tracking-tight text-minsah-text-primary transition-all duration-300 ${
            showDetails ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
          aria-label="Minsah Beauty home"
          tabIndex={showDetails ? -1 : 0}
        >
          Minsah Beauty
        </Link>

        <button
          type="button"
          onClick={() => openDrawer()}
          aria-label={`Open cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
          className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-minsah-text-primary transition hover:bg-minsah-surface-subtle focus-visible:ring-2 focus-visible:ring-minsah-focus"
        >
          <ShoppingBag size={19} aria-hidden="true" />
          {cartCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-minsah-action-primary px-1 text-[10px] font-bold leading-none text-white shadow-xs">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
