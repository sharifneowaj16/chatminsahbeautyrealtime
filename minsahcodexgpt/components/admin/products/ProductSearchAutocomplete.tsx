'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Package, Loader2, Plus, AlertCircle, X } from 'lucide-react';
import { ProductVariantOption, formatVariantLabel } from './ProductVariantSelector';
import { CurrencyDisplay } from '../finance/CurrencyDisplay';

export interface SearchedProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  image?: string;
  variants?: ProductVariantOption[];
}

export interface ProductSearchAutocompleteProps {
  onSelect: (product: SearchedProduct, variant?: ProductVariantOption) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const ProductSearchAutocomplete: React.FC<ProductSearchAutocompleteProps> = ({
  onSelect,
  placeholder = 'Search by product name, SKU, or scan barcode...',
  disabled = false,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced API search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/products?search=${encodeURIComponent(query.trim())}&limit=8`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          const items: SearchedProduct[] = (data.products || data.data || []).map((p: any) => ({
            id: p.id,
            name: p.name || p.title,
            sku: p.sku || 'N/A',
            price: Number(p.price) || 0,
            stock: Number(p.stock ?? p.inventory ?? 0),
            image: p.images?.[0]?.url || p.image || null,
            variants: (p.variants || []).map((v: any) => ({
              id: v.id,
              name: v.name || v.title,
              sku: v.sku || p.sku,
              price: Number(v.price) || Number(p.price) || 0,
              stock: Number(v.stock ?? v.inventory ?? 0),
              attributes: v.attributes || {},
              image: v.image || null,
            })),
          }));
          setResults(items);
          setIsOpen(items.length > 0);
        }
      } catch (err) {
        console.error('Error searching products:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelectItem = (prod: SearchedProduct, variant?: ProductVariantOption) => {
    onSelect(prod, variant);
    setQuery('');
    setIsOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full h-9 pl-9 pr-9 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30"
        />
        {loading ? (
          <Loader2 className="w-4 h-4 text-rose-500 animate-spin absolute right-3 top-2.5" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto divide-y divide-slate-800">
          {results.map((product) => (
            <div key={product.id} className="p-2.5 hover:bg-slate-800/80 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-white truncate">{product.name}</h5>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="font-mono">SKU: {product.sku}</span>
                      <span>•</span>
                      <span className={product.stock > 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                        {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Base Product Action if no variants */}
                {(!product.variants || product.variants.length === 0) && (
                  <div className="flex items-center gap-3 shrink-0">
                    <CurrencyDisplay amount={product.price} size="sm" className="font-bold" />
                    <button
                      type="button"
                      onClick={() => handleSelectItem(product)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 shadow-sm transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add
                    </button>
                  </div>
                )}
              </div>

              {/* Variant Pills if available */}
              {product.variants && product.variants.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-medium">Variants:</span>
                  {product.variants.map((v) => {
                    const isOOS = v.stock <= 0;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={isOOS}
                        onClick={() => handleSelectItem(product, v)}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] border transition-colors ${
                          isOOS
                            ? 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed line-through'
                            : 'bg-slate-950 text-slate-200 border-slate-700 hover:border-rose-500 hover:text-white'
                        }`}
                      >
                        <span>{formatVariantLabel(v)}</span>
                        <span className="font-mono text-emerald-400">৳{v.price}</span>
                        <span className="text-[10px] text-slate-500">({v.stock})</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductSearchAutocomplete;
