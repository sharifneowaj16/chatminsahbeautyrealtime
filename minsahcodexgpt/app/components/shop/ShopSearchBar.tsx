'use client';

import { useState, useRef, useEffect, useCallback, useId } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, X, TrendingUp, Package, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { trackShopSearch, trackShopSuggestionClick } from '@/lib/tracking/shop-events';
import { buildCatalogPath, buildCatalogSearchPath } from '@/lib/catalog-navigation';
import CatalogProductImage from '@/components/catalog/CatalogProductImage';

interface ApiSuggestion {
  type: 'product' | 'trending' | 'completion';
  text: string;
  productName?: string;
  slug?: string;
  price?: number;
  image?: string;
}

function groupLabel(type: ApiSuggestion['type']): string {
  switch (type) {
    case 'product':
      return 'Products';
    case 'trending':
      return 'Popular Searches';
    case 'completion':
      return 'Related Searches';
    default:
      return 'Suggestions';
  }
}

function SuggestionImage({ src, alt }: { src?: string; alt: string }) {
  if (!src) {
    return (
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-minsah-surface-subtle">
        <Package size={14} className="text-minsah-text-muted" />
      </div>
    );
  }

  return (
    <span className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded bg-minsah-accent/40">
      <CatalogProductImage src={src} alt={alt} sizes="32px" padding="sm" />
    </span>
  );
}

export default function ShopSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';

  const [inputValue, setInputValue] = useState(initialQ);
  const [suggestions, setSuggestions] = useState<ApiSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchId = useId();
  const listboxId = `${searchId}-shop-search-suggestions`;
  const getOptionId = (index: number) => `${searchId}-shop-search-option-${index}`;

  // Sync input with URL query
  useEffect(() => {
    setInputValue(searchParams.get('q') || '');
  }, [searchParams]);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      if (data.success) setSuggestions(data.suggestions ?? []);
    } catch {
      // Suggestions are progressive enhancement only.
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setActiveIndex(-1);
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 280);
  };

  const executeSearch = (q: string, source = 'shop_search_bar') => {
    const trimmed = q.trim();
    if (!trimmed) return;
    trackShopSearch(trimmed, source);
    setShowSuggestions(false);
    router.push(buildCatalogSearchPath(trimmed, searchParams));
  };

  const activateSuggestion = (suggestion: ApiSuggestion, index: number) => {
    trackShopSuggestionClick(suggestion.productName || suggestion.text, suggestion.type, index + 1);
    setShowSuggestions(false);
    if (suggestion.type === 'product' && suggestion.slug) {
      router.push(`/products/${suggestion.slug}`);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set('q', suggestion.text.trim());
    params.delete('page');
    router.push(buildCatalogPath(params));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, suggestions.length));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          activateSuggestion(suggestions[activeIndex], activeIndex);
        } else {
          executeSearch(inputValue, activeIndex === suggestions.length ? 'shop_search_final_option' : 'shop_search_bar');
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const groupedSuggestions = suggestions.reduce<Record<string, ApiSuggestion[]>>((groups, suggestion) => {
    const label = groupLabel(suggestion.type);
    groups[label] = groups[label] || [];
    groups[label].push(suggestion);
    return groups;
  }, {});

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all focus-within:border-minsah-primary focus-within:ring-2 focus-within:ring-minsah-primary/20">
        <div className="flex-shrink-0 pl-4">
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-minsah-primary border-t-transparent" />
          ) : (
            <Search size={18} className="text-gray-400" aria-hidden="true" />
          )}
        </div>

        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setShowSuggestions(true);
            if (!suggestions.length) fetchSuggestions(inputValue);
          }}
          placeholder="Search serum, sunscreen, lipstick, brand..."
          containerClassName="flex-1"
          className="border-0 bg-transparent px-0 py-3 text-gray-900 placeholder-gray-400 shadow-none focus:outline-none focus:ring-0"
          aria-label="Search beauty products, brands, and categories"
          role="combobox"
          aria-expanded={showSuggestions && suggestions.length > 0}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? getOptionId(activeIndex) : undefined}
        />

        {inputValue && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setInputValue('');
              setSuggestions([]);
              const params = new URLSearchParams(searchParams.toString());
              params.delete('q');
              params.delete('page');
              router.push(buildCatalogPath(params));
            }}
            className="mr-1 shrink-0 text-gray-400 hover:text-gray-600"
            aria-label="Clear shop search"
          >
            <X size={16} aria-hidden="true" />
          </Button>
        )}

        <Button
          type="button"
          variant="primary"
          onClick={() => executeSearch(inputValue)}
          className="shrink-0 rounded-none px-4 py-3 text-sm"
          aria-label="Search shop"
        >
          Search
        </Button>
      </div>

      {showSuggestions && inputValue.trim() && !isLoading && suggestions.length === 0 && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-gray-100 bg-white p-4 text-sm text-minsah-secondary shadow-2xl"
          role="status"
          aria-live="polite"
        >
          No quick suggestions yet. Press Search to look across all products.
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-2xl"
        >
          {Object.entries(groupedSuggestions).map(([label, items]) => (
            <div key={label} role="group" aria-label={label}>
              <div className="border-b border-gray-50 bg-stone-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-minsah-secondary">
                {label}
              </div>
              {items.map((s) => {
                const globalIndex = suggestions.indexOf(s);
                return (
                  <Button
                    id={getOptionId(globalIndex)}
                    role="option"
                    aria-selected={globalIndex === activeIndex}
                    key={`${s.type}-${s.slug || s.text}-${globalIndex}`}
                    type="button"
                    variant="ghost"
                    onClick={() => activateSuggestion(s, globalIndex)}
                    className={`w-full justify-start gap-3 rounded-none border-b border-gray-50 px-4 py-3 text-left last:border-0 hover:bg-minsah-surface-subtle ${
                      globalIndex === activeIndex ? 'bg-minsah-surface-subtle' : ''
                    }`}
                  >
                    {s.type === 'trending' ? (
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-minsah-surface-accent">
                        <TrendingUp size={14} className="text-minsah-action-primary" aria-hidden="true" />
                      </div>
                    ) : s.type === 'completion' ? (
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-minsah-surface-accent">
                        <Sparkles size={14} className="text-minsah-action-primary" aria-hidden="true" />
                      </div>
                    ) : (
                      <SuggestionImage src={s.image} alt={s.productName || s.text} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{s.productName || s.text}</p>
                      {s.price && s.price > 0 && (
                        <p className="text-xs text-gray-500">৳{s.price.toLocaleString('en-BD')}</p>
                      )}
                    </div>
                    {s.type === 'trending' && (
                      <span className="flex-shrink-0 rounded-full bg-minsah-surface-accent px-2 py-0.5 text-xs text-minsah-action-primary">🔥</span>
                    )}
                  </Button>
                );
              })}
            </div>
          ))}
          <Button
            id={getOptionId(suggestions.length)}
            type="button"
            variant="ghost"
            role="option"
            aria-selected={activeIndex === suggestions.length}
            onClick={() => executeSearch(inputValue, 'shop_search_final_option')}
            className={`w-full justify-start rounded-none border-t border-gray-100 px-4 py-3 text-left text-sm text-minsah-action-primary hover:bg-minsah-surface-subtle ${
              activeIndex === suggestions.length ? 'bg-minsah-surface-subtle' : ''
            }`}
          >
            Search &ldquo;{inputValue}&rdquo; in shop →
          </Button>
        </div>
      )}
    </div>
  );
}
