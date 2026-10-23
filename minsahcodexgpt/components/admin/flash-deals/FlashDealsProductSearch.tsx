'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Search, Plus, Loader2, PackageCheck, AlertCircle, Sparkles } from 'lucide-react';

import type { ProductVariantItem } from '@/app/(storefront)/products/[id]/components/hero/SeedHeroVariantDropdown';

export interface SearchedProduct {
  id: string;
  name: string;
  sku?: string;
  price: number;
  quantity?: number;
  isActive?: boolean;
  images?: Array<{ url: string }>;
  variants?: ProductVariantItem[];
}

interface FlashDealsProductSearchProps {
  onAddProduct: (product: SearchedProduct) => void;
}

export default function FlashDealsProductSearch({ onAddProduct }: FlashDealsProductSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Try admin search endpoint first
        const res = await fetch(`/api/admin/products/search?q=${encodeURIComponent(query.trim())}`, {
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data.products) ? data.products : []);
          setIsOpen(true);
        } else {
          // Fallback to public products endpoint if needed
          const fallbackRes = await fetch(`/api/products?search=${encodeURIComponent(query.trim())}&limit=10`);
          if (fallbackRes.ok) {
            const fbData = await fallbackRes.json();
            const rawProducts = Array.isArray(fbData.products) ? fbData.products : Array.isArray(fbData) ? fbData : [];
            const mapped: SearchedProduct[] = rawProducts.map((p: any) => ({
              id: p.id,
              name: p.name,
              sku: p.sku || '',
              price: Number(p.price) || 0,
              quantity: p.quantity ?? p.stock ?? 10,
              isActive: p.isActive !== false,
              images: Array.isArray(p.images) ? p.images.map((img: any) => ({ url: typeof img === 'string' ? img : img?.url || '' })) : [{ url: p.imageUrl || '' }],
            }));
            setResults(mapped);
            setIsOpen(true);
          } else {
            setError('Could not fetch products. Please check connection.');
          }
        }
      } catch (err) {
        setError('Error searching products.');
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (product: SearchedProduct) => {
    onAddProduct(product);
    setRecentlyAddedId(product.id);
    setTimeout(() => setRecentlyAddedId(null), 2000);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-[#8a8f98] pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Search products by title, SKU, or keyword to add directly to Flash Deals..."
          className="w-full pl-10 pr-12 py-3 bg-[#0b0c14] border border-[#232636] rounded-xl text-sm text-[#f7f8f8] placeholder-[#8a8f98]/50 focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] outline-none transition-all shadow-inner"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3 text-xs text-[#8a8f98] hover:text-[#f7f8f8] px-1.5 py-0.5 rounded bg-white/[0.06]"
          >
            Clear
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-[#161824] border border-[#232636] rounded-2xl shadow-2xl overflow-hidden max-h-96 overflow-y-auto">
          {isLoading && results.length === 0 && (
            <div className="flex items-center justify-center gap-2 p-6 text-xs text-[#8a8f98]">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Searching store inventory...</span>
            </div>
          )}

          {!isLoading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center p-6 text-center text-[#8a8f98]">
              <AlertCircle className="w-6 h-6 mb-1 text-[#8a8f98]/60" />
              <p className="text-xs font-medium">No products found matching &quot;{query}&quot;</p>
              <p className="text-[11px] text-[#8a8f98]/60 mt-0.5">Try searching with a different name or SKU</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="p-2 space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-bold text-[#8a8f98] uppercase tracking-wider flex items-center justify-between">
                <span>Matching Store Inventory ({results.length})</span>
                <span className="text-emerald-400 font-mono">Click to Add</span>
              </div>

              {results.map((product) => {
                const imgUrl = product.images?.[0]?.url || '/images/hero-image.jpg';
                const isRecentlyAdded = recentlyAddedId === product.id;

                return (
                  <div
                    key={product.id}
                    onClick={() => handleSelect(product)}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer group border border-transparent hover:border-[#232636]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-[#0b0c14] border border-[#232636] shrink-0">
                        <Image
                          src={imgUrl}
                          alt={product.name}
                          fill
                          sizes="44px"
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-[#f7f8f8] truncate group-hover:text-emerald-400 transition-colors">
                          {product.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-[#8a8f98] mt-0.5">
                          <span className="font-mono text-emerald-400 font-medium">৳{Number(product.price).toLocaleString()}</span>
                          {product.sku && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[10px]">{product.sku}</span>
                            </>
                          )}
                          {product.quantity !== undefined && (
                            <>
                              <span>•</span>
                              <span className="text-[10px] text-[#8a8f98]/80">Stock: {product.quantity}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(product);
                      }}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                        isRecentlyAdded
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                      }`}
                    >
                      {isRecentlyAdded ? (
                        <>
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>Added!</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Deals</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
