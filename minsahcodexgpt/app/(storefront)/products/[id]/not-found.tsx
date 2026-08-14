import Link from 'next/link';
import { ArrowLeft, Package } from 'lucide-react';

export default function ProductNotFound() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center bg-minsah-surface-page px-4 text-center" aria-labelledby="product-not-found-title">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-minsah-surface-accent" aria-hidden="true">
        <Package size={32} className="text-minsah-text-muted" />
      </div>
      <h1 id="product-not-found-title" className="mb-2 text-2xl font-bold text-minsah-text-primary">Product not found</h1>
      <p className="mb-8 max-w-xs text-sm text-minsah-text-muted">
        The product may have been removed or is no longer available.
      </p>
      <Link
        href="/shop"
        className="minsah-control inline-flex min-h-11 items-center gap-2 rounded-full bg-minsah-action-primary px-6 py-3 text-sm font-semibold text-minsah-text-inverse hover:bg-minsah-action-primary-hover"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to shop
      </Link>
    </section>
  );
}
