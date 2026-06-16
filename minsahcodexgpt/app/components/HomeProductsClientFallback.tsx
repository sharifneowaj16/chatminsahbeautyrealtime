'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ProductsProvider, useProducts, type Product } from '@/contexts/ProductsContext';
import { formatPrice } from '@/utils/currency';
import { HomeBuyNowAction, HomeOverlayCartAction } from './HomeProductActions';

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const isUrl = src.startsWith('/') || src.startsWith('http') || src.startsWith('data:');

  if (isUrl) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 50vw, 33vw"
      />
    );
  }

  return <span className="text-4xl">{src}</span>;
}

function FallbackProductGrid({ products }: { products: Product[] }) {
  return (
    <section className="bg-minsah-light px-4 py-6 pb-20">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-minsah-dark">New Arrival</h2>
        <Link href="/shop" className="text-sm font-semibold text-minsah-primary">
          View all
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {products.slice(0, 8).map((product) => {
          const hasVariants = Boolean(product.variants?.length);

          return (
            <div key={product.id} className="rounded-2xl bg-white p-3">
              <Link href={`/products/${product.id}`}>
                <div className="relative mb-2">
                  <div className="relative mb-2 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-minsah-accent">
                    <ProductImage src={product.image} alt={product.name} />
                  </div>
                  <HomeOverlayCartAction
                    productId={product.id}
                    productName={product.name}
                    productImage={product.image}
                    price={product.price}
                    stock={product.stock}
                    hasVariants={hasVariants}
                  />
                </div>
                <h3 className="mb-1 line-clamp-2 text-xs font-semibold text-minsah-dark">
                  {product.name}
                </h3>
                <span className="mb-2 block text-sm font-bold text-minsah-primary">
                  {formatPrice(product.price)}
                </span>
              </Link>
              <HomeBuyNowAction
                productId={product.id}
                productName={product.name}
                productImage={product.image}
                price={product.price}
                stock={product.stock}
                hasVariants={hasVariants}
                className="w-full"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HomeProductsFallbackInner() {
  const { products, loading, error } = useProducts();

  if (products.length > 0) {
    return <FallbackProductGrid products={products} />;
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
