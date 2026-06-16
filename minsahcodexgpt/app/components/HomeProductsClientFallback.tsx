'use client';

import { ProductsProvider, useProducts, type Product } from '@/contexts/ProductsContext';
import HomeProductSections from './HomeProductSections';

function HomeProductsFallbackInner() {
  const { products, loading, error } = useProducts();

  if (products.length > 0) {
    return <HomeProductSections products={products} />;
  }

  if (loading) {
    return (
      <div className="min-h-[420px] bg-minsah-light px-4 py-6">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl bg-white p-3">
              <div className="mb-3 aspect-square rounded-xl bg-minsah-accent" />
              <div className="mb-2 h-3 rounded bg-minsah-accent" />
              <div className="h-3 w-2/3 rounded bg-minsah-accent" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    console.error('[home] Client product fallback failed:', error);
  }

  return <div className="min-h-[120px] bg-minsah-light" />;
}

export default function HomeProductsClientFallback({
  initialProducts = [],
}: {
  initialProducts?: Product[];
}) {
  return (
    <ProductsProvider activeOnly limit={48} initialProducts={initialProducts}>
      <HomeProductsFallbackInner />
    </ProductsProvider>
  );
}
