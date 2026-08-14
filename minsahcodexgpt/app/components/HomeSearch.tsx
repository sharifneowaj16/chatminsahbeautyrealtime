'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ArrowRight, Loader2, Search, Sparkles, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPrice } from '@/utils/currency';
import { buildCatalogSearchPath } from '@/lib/catalog-navigation';

type ProductSuggestion = {
  type: 'product';
  text: string;
  productId: string;
  productName: string;
  slug: string;
  price: number;
  image?: string;
  badges?: string[];
  source?: string;
};

type TrendingSuggestion = {
  type: 'trending';
  text: string;
  count?: number;
  icon?: string;
  source?: string;
};

type CompletionSuggestion = {
  type: 'completion';
  text: string;
  icon?: string;
  source?: string;
};

type Suggestion = ProductSuggestion | TrendingSuggestion | CompletionSuggestion;

type SuggestionResponse = {
  success?: boolean;
  count?: number;
  suggestions?: Suggestion[];
  fallback?: {
    applied?: boolean;
    message?: string;
  };
};

interface HomeSearchProps {
  showTrendingChips?: boolean;
  className?: string;
}

const fallbackTrendingChips = ['Sunscreen', 'Lip Tint', 'Serum', 'Korean Skincare'];

function getSuggestionText(suggestion: Suggestion): string {
  return suggestion.type === 'product' ? suggestion.productName || suggestion.text : suggestion.text;
}

function getSuggestionHref(suggestion: Suggestion): string {
  if (suggestion.type === 'product' && suggestion.slug) return `/products/${suggestion.slug}`;
  return buildCatalogSearchPath(suggestion.text);
}

function getSuggestionMeta(suggestion: Suggestion): string {
  if (suggestion.type === 'product') {
    if (suggestion.price > 0) return formatPrice(suggestion.price);
    return 'View product';
  }

  if (suggestion.type === 'trending') {
    return suggestion.count && suggestion.count > 0 ? `${suggestion.count} searches` : 'Popular search';
  }

  return 'Related search';
}

function getSuggestionKindLabel(suggestion: Suggestion): string {
  if (suggestion.type === 'product') return 'Product';
  if (suggestion.type === 'trending') return 'Trending';
  return 'Suggestion';
}

function isImageUrl(src?: string) {
  return Boolean(src && (src.startsWith('/') || src.startsWith('http') || src.startsWith('data:')));
}

export default function HomeSearch({ showTrendingChips = true, className = '' }: HomeSearchProps) {
  const router = useRouter();
  const inputId = useId();
  const listboxId = `${inputId}-suggestions`;
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [trendingSuggestions, setTrendingSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [fallbackMessage, setFallbackMessage] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const lastRequestedQueryRef = useRef('');

  const normalizedQuery = searchQuery.trim();
  const visibleSuggestions = useMemo(() => {
    return normalizedQuery.length >= 2 ? suggestions : trendingSuggestions.slice(0, 6);
  }, [normalizedQuery.length, suggestions, trendingSuggestions]);

  const dynamicTrendingChips = useMemo(() => {
    const terms = trendingSuggestions
      .filter((item) => item.type !== 'product')
      .map((item) => item.text)
      .filter(Boolean);

    return [...new Set([...terms, ...fallbackTrendingChips])].slice(0, 6);
  }, [trendingSuggestions]);

  const hasSuggestionsPanel = showSuggestions && (visibleSuggestions.length > 0 || isLoading || normalizedQuery.length >= 2);

  const navigateToSearch = useCallback((query?: string) => {
    const q = (query ?? searchQuery).trim();
    if (!q) return;

    setShowSuggestions(false);
    setActiveIndex(-1);
    router.push(buildCatalogSearchPath(q));
  }, [searchQuery, router]);

  const selectSuggestion = useCallback((suggestion: Suggestion) => {
    setSearchQuery(getSuggestionText(suggestion));
    setShowSuggestions(false);
    setActiveIndex(-1);
    router.push(getSuggestionHref(suggestion));
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTrendingSuggestions() {
      try {
        const res = await fetch('/api/search/suggestions?trending=true&trendingLimit=6&limit=4', {
          signal: controller.signal,
        });
        if (!res.ok) return;

        const data = (await res.json()) as SuggestionResponse;
        setTrendingSuggestions(data.suggestions ?? []);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setTrendingSuggestions([]);
        }
      }
    }

    loadTrendingSuggestions();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const q = normalizedQuery;
    setActiveIndex(-1);
    setFallbackMessage('');

    if (q.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const requestQuery = q;
    lastRequestedQueryRef.current = requestQuery;

    const timer = setTimeout(async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(requestQuery)}&limit=8`, {
          signal: controller.signal,
        });
        if (!res.ok) return;

        const data = (await res.json()) as SuggestionResponse;
        if (controller.signal.aborted || lastRequestedQueryRef.current !== requestQuery) return;

        setSuggestions(data.suggestions ?? []);
        setFallbackMessage(data.fallback?.applied && data.fallback.message ? data.fallback.message : '');
        setShowSuggestions(true);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted && lastRequestedQueryRef.current === requestQuery) {
          setIsLoading(false);
        }
      }
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [normalizedQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setShowSuggestions(true);
      setActiveIndex((current) => Math.min(current + 1, visibleSuggestions.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const activeSuggestion = activeIndex >= 0 ? visibleSuggestions[activeIndex] : undefined;
      if (activeSuggestion) {
        selectSuggestion(activeSuggestion);
      } else {
        navigateToSearch();
      }
      return;
    }

    if (event.key === 'Escape') {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setFallbackMessage('');
    setActiveIndex(-1);
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigateToSearch()}
          className="absolute left-0 top-0 z-10 h-full w-11 rounded-none text-minsah-secondary"
          aria-label="Search"
        >
          <Search size={20} aria-hidden="true" />
        </Button>
        <Input
          id={inputId}
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search for sunscreen, serum, lipstick..."
          role="combobox"
          aria-expanded={hasSuggestionsPanel}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          className="rounded-2xl border-0 bg-white py-3 pl-12 pr-11 text-sm font-medium text-minsah-dark shadow-sm ring-1 ring-white/20 placeholder:text-minsah-secondary/75 focus:outline-none focus:ring-2 focus:ring-minsah-accent md:rounded-full"
        />
        {searchQuery ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full text-minsah-secondary hover:bg-minsah-light hover:text-minsah-dark"
            aria-label="Clear search"
          >
            <X size={16} aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      {showTrendingChips && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide" aria-label="Trending searches">
          {dynamicTrendingChips.map((chip) => (
            <Button
              key={chip}
              type="button"
              variant="ghost"
              onClick={() => navigateToSearch(chip)}
              className="flex-shrink-0 gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-minsah-accent ring-1 ring-white/10 hover:bg-white/20"
            >
              <TrendingUp size={13} aria-hidden="true" /> {chip}
            </Button>
          ))}
        </div>
      )}

      {hasSuggestionsPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-minsah-accent bg-white shadow-xl" role="presentation">
          <div className="flex items-center justify-between border-b border-minsah-accent px-4 py-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-minsah-primary">
                {normalizedQuery.length >= 2 ? 'Search suggestions' : 'Popular right now'}
              </p>
              {fallbackMessage ? (
                <p className="mt-1 line-clamp-1 text-xs text-minsah-secondary">Showing related popular results.</p>
              ) : null}
            </div>
            {isLoading ? <Loader2 size={16} className="animate-spin text-minsah-primary" aria-hidden="true" /> : null}
          </div>

          {isLoading && visibleSuggestions.length === 0 ? (
            <div className="space-y-3 px-4 py-4" aria-live="polite">
              {[0, 1, 2].map((item) => (
                <div key={item} className="flex animate-pulse items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-minsah-light" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 rounded-full bg-minsah-light" />
                    <div className="h-3 w-1/3 rounded-full bg-minsah-light" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleSuggestions.length > 0 ? (
            <ul id={listboxId} role="listbox" aria-label="Search suggestions" className="max-h-[70vh] overflow-y-auto py-1">
              {visibleSuggestions.map((suggestion, index) => {
                const active = index === activeIndex;
                const productImage = suggestion.type === 'product' && isImageUrl(suggestion.image) ? suggestion.image : undefined;
                const label = getSuggestionText(suggestion);

                return (
                  <li
                    key={`${suggestion.type}-${suggestion.type === 'product' ? suggestion.productId : suggestion.text}-${index}`}
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={active}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectSuggestion(suggestion)}
                      className={`w-full justify-start gap-3 rounded-none px-4 py-3 text-left ${
                        active ? 'bg-minsah-accent/70' : 'hover:bg-minsah-accent/50'
                      }`}
                    >
                      {productImage ? (
                        <span className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-minsah-light">
                          <Image
                            src={productImage}
                            alt={label}
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        </span>
                      ) : (
                        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-minsah-light text-minsah-primary">
                          {suggestion.type === 'trending' ? (
                            <TrendingUp size={17} aria-hidden="true" />
                          ) : suggestion.type === 'completion' ? (
                            <Sparkles size={17} aria-hidden="true" />
                          ) : (
                            <Search size={17} aria-hidden="true" />
                          )}
                        </span>
                      )}

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-bold text-minsah-dark">{label}</span>
                          <span className="flex-shrink-0 rounded-full bg-minsah-light px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-minsah-secondary">
                            {getSuggestionKindLabel(suggestion)}
                          </span>
                        </span>
                        <span className="mt-1 flex items-center gap-2 text-xs font-semibold text-minsah-primary">
                          {getSuggestionMeta(suggestion)}
                          {suggestion.type === 'product' && suggestion.badges?.slice(0, 2).map((badge) => (
                            <span key={badge} className="rounded-full bg-minsah-accent px-2 py-0.5 text-xs text-minsah-primary">
                              {badge}
                            </span>
                          ))}
                        </span>
                      </span>

                      <ArrowRight size={15} className="flex-shrink-0 text-minsah-secondary" aria-hidden="true" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-5 text-sm" aria-live="polite">
              <p className="font-bold text-minsah-dark">No products found.</p>
              <p className="mt-1 text-xs text-minsah-secondary">Try a shorter keyword or browse popular searches below.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {fallbackTrendingChips.slice(0, 4).map((chip) => (
                  <Button
                    key={chip}
                    type="button"
                    variant="ghost"
                    onClick={() => navigateToSearch(chip)}
                    className="rounded-full bg-minsah-light px-3 py-1.5 text-xs text-minsah-primary hover:bg-minsah-accent"
                  >
                    {chip}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {normalizedQuery.length >= 2 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigateToSearch()}
              className="w-full justify-between rounded-none border-t border-minsah-accent px-4 py-3 text-left text-sm text-minsah-primary hover:bg-minsah-accent/50"
            >
              <span>See all results for &ldquo;{normalizedQuery}&rdquo;</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
