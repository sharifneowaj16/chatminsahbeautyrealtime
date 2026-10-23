'use client';

import React from 'react';
import Link from 'next/link';
import type { PLPProduct } from './types';

interface PLPEditorialSpotlightProps {
  product?: PLPProduct;
  onAddToCart?: (product: PLPProduct) => void;
}

const DEFAULT_SPOTLIGHT: PLPProduct = {
  id: 'spotlight-anua-77',
  slug: 'anua-heartleaf-77-soothing-toner',
  brand: 'ANUA',
  title: 'Heartleaf 77% Soothing Toner',
  subtitle: 'Sensitive Skin',
  rating: 4.9,
  reviewCount: 420,
  price: 2100,
  regularPrice: 2700,
  discountPercent: 22,
  image: 'https://lh3.googleusercontent.com/aida/AEtjO1V0ZK1hxPEA6N0RA-ZeyM_5_z7LqtmnEw7R9tI5d_6EBgl9FSLXorl0uyYQmSSEsit1LJ51mJGJa9oJF-DzA2ppEweGIA0GFvcAZw8BAJEjKuaPtSjOxXO3iqDaJdxtmcUUQbnsvs6RVtXDhvaZcy0R0G0Z0mN_MPKnemvAv6hlw2nFp6j-9ykbJsF8YjcM1CPNxXz9tkHfh0SE8pcOJoGI6x2IuVAPwLceyesr5kvCPGa74tj_Z2z0Cw',
  hubBadge: '100% Genuine Sealed',
};

export default function PLPEditorialSpotlight({
  product = DEFAULT_SPOTLIGHT,
  onAddToCart,
}: PLPEditorialSpotlightProps) {
  return (
    <section className="px-4 pb-6 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <svg className="text-[#4b6723]" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <h4 className="text-[16px] font-bold text-[#181C1A]">Weekly Dermat Spotlight</h4>
        </div>
        <Link
          href={`/products/${product.slug || product.id}`}
          className="text-[12px] text-[#4b6723] font-bold hover:underline"
        >
          Full Protocol
        </Link>
      </div>

      <article className="w-full bg-[#F2F6F0] rounded-[24px] p-3 flex gap-3 shadow-sm hover:shadow-md transition-shadow relative border border-[#E2DED8]/60">
        <Link
          href={`/products/${product.slug || product.id}`}
          className="w-28 h-32 rounded-[20px] overflow-hidden bg-white shrink-0 relative block"
        >
          {product.image ? (
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#EAF7D8] flex items-center justify-center text-[#4b6723] text-xs font-bold">
              ANUA
            </div>
          )}
          <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-[#EAF7D8] text-[#1c3a13] text-[9px] font-bold">
            Top Calming
          </span>
        </Link>

        <div className="flex flex-col justify-between flex-1 min-w-0">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] text-[#4b6723] font-bold uppercase tracking-wider">
                {product.brand}
              </span>
              <span className="w-1 h-1 rounded-full bg-[#5A615D] opacity-40" />
              <span className="text-[10px] text-[#5A615D]">Sensitive Skin</span>
            </div>
            <Link href={`/products/${product.slug || product.id}`}>
              <h5 className="text-[13px] font-bold text-[#181C1A] truncate hover:underline">
                {product.title}
              </h5>
            </Link>
            <p className="text-[11px] text-[#5A615D] line-clamp-2 mt-0.5 leading-snug">
              Formulated with natural Houttuynia Cordata extract to soothe redness, tighten pores, and balance pH without irritation.
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[16px] text-[#062402] font-bold">
                ৳{product.price.toLocaleString('en-US')}
              </span>
              {product.regularPrice && (
                <span className="text-[11px] text-[#5A615D] line-through opacity-70">
                  ৳{product.regularPrice.toLocaleString('en-US')}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onAddToCart && onAddToCart(product)}
              className="px-3 py-1.5 rounded-full bg-[#1c3a13] text-[#D4F6A2] text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-transform shadow-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span>+ Add</span>
            </button>
          </div>
        </div>
      </article>
    </section>
  );
}
