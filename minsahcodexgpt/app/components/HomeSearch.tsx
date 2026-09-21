'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Loader2,
  Mic,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPrice } from '@/utils/currency';
import { buildCatalogSearchPath } from '@/lib/catalog-navigation';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';

import type {
  CanonicalSuggestion,
  ProductSuggestion,
  TrendingSuggestion,
  CompletionSuggestion,
} from '@/lib/search/types';

type Suggestion = CanonicalSuggestion;

type SuggestionResponse = {
  success?: boolean;
  count?: number;
  suggestions?: Suggestion[];
  fallback?: {
    applied?: boolean;
    message?: string;
  };
};

export interface HomeSearchProps {
  showTrendingChips?: boolean;
  className?: string;
  isMobileFullScreen?: boolean;
  onCloseMobile?: () => void;
  autoFocus?: boolean;
  variant?: 'default' | 'compact';
}

const RECENT_SEARCHES_KEY = 'minsah_recent_searches';
const fallbackTrendingChips = ['Sunscreen', 'Lip Tint', 'Serum', 'Korean Skincare', 'Cleanser', 'Centella'];

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
    return suggestion.count && suggestion.count > 0 ? `${suggestion.count} searches` : 'Popular in BD';
  }

  return 'Related category';
}

function isImageUrl(src?: string) {
  return Boolean(src && (src.startsWith('/') || src.startsWith('http') || src.startsWith('data:')));
}

/**
 * Highlighting helper: bolds and colors matched query characters in real-time
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || !query.trim()) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="font-bold text-emerald-400 underline decoration-emerald-500/40 underline-offset-2">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function HomeSearch({
  showTrendingChips = false,
  className = '',
  isMobileFullScreen = false,
  onCloseMobile,
  autoFocus = false,
  variant = 'default',
}: HomeSearchProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const { openDrawer: openCartDrawer } = useCartDrawer();

  const inputId = useId();
  const listboxId = `${inputId}-suggestions`;
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [trendingSuggestions, setTrendingSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastRequestedQueryRef = useRef('');

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.slice(0, 6));
        }
      }
    } catch {}
  }, []);

  const addRecentSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const removeRecentSearch = useCallback((termToRemove: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRecentSearches((prev) => {
      const next = prev.filter((item) => item !== termToRemove);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const clearRecentSearches = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {}
  }, []);

  // Autofocus when requested (e.g. mobile full-screen view)
  useEffect(() => {
    if (autoFocus || isMobileFullScreen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, isMobileFullScreen]);

  // Lock body scroll when in mobile full screen mode
  useEffect(() => {
    if (isMobileFullScreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileFullScreen]);

  const normalizedQuery = searchQuery.trim();
  const visibleSuggestions = useMemo(() => {
    return normalizedQuery.length >= 2 ? suggestions : trendingSuggestions.slice(0, 8);
  }, [normalizedQuery.length, suggestions, trendingSuggestions]);

  const productSuggestions = useMemo(() => {
    return visibleSuggestions.filter((item): item is ProductSuggestion => item.type === 'product');
  }, [visibleSuggestions]);

  const querySuggestions = useMemo(() => {
    return visibleSuggestions.filter((item) => item.type !== 'product');
  }, [visibleSuggestions]);

  const dynamicTrendingChips = useMemo(() => {
    const terms = trendingSuggestions
      .filter((item) => item.type !== 'product')
      .map((item) => item.text)
      .filter(Boolean);

    return [...new Set([...terms, ...fallbackTrendingChips])].slice(0, 6);
  }, [trendingSuggestions]);

  const hasSuggestionsPanel = showSuggestions && (visibleSuggestions.length > 0 || isLoading || normalizedQuery.length >= 2 || recentSearches.length > 0);

  const navigateToSearch = useCallback(
    (query?: string) => {
      const q = (query ?? searchQuery).trim();
      if (!q) return;

      addRecentSearch(q);
      setShowSuggestions(false);
      setActiveIndex(-1);
      if (onCloseMobile) onCloseMobile();
      router.push(buildCatalogSearchPath(q));
    },
    [searchQuery, router, addRecentSearch, onCloseMobile]
  );

  const selectSuggestion = useCallback(
    (suggestion: Suggestion) => {
      const label = getSuggestionText(suggestion);
      addRecentSearch(label);
      setSearchQuery(label);
      setShowSuggestions(false);
      setActiveIndex(-1);
      if (onCloseMobile) onCloseMobile();
      router.push(getSuggestionHref(suggestion));
    },
    [router, addRecentSearch, onCloseMobile]
  );

  // Quick 1-tap Add to Cart right from suggestion card (with variant and stock guards)
  const handleQuickAddToCart = (e: React.MouseEvent, suggestion: ProductSuggestion) => {
    e.stopPropagation();

    const isOutOfStock = suggestion.inStock === false || (suggestion.stock !== undefined && suggestion.stock <= 0);
    if (isOutOfStock) return;

    const hasVariants = Boolean(
      suggestion.hasVariants ||
      suggestion.badges?.some((b) => b.toLowerCase().includes('option') || b.toLowerCase().includes('shade') || b.toLowerCase().includes('variant'))
    );

    if (hasVariants) {
      if (onCloseMobile) onCloseMobile();
      setShowSuggestions(false);
      router.push(`/products/${suggestion.slug}`);
      return;
    }

    setAddingProductId(suggestion.productId);

    addItem({
      id: suggestion.productId,
      productId: suggestion.productId,
      name: suggestion.productName || suggestion.text,
      price: suggestion.price,
      quantity: 1,
      image: suggestion.image || '/images/categories/Serum.png',
    });

    openCartDrawer();
    setTimeout(() => {
      setAddingProductId(null);
      if (onCloseMobile) onCloseMobile();
    }, 450);
  };

  // Voice Search with Web Speech API
  const startVoiceSearch = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice search is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setSearchQuery(transcript);
          navigateToSearch(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  }, [navigateToSearch]);

  // Keyboard Navigation
  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!visibleSuggestions.length) return;
      setActiveIndex((prev) => (prev + 1 >= visibleSuggestions.length ? 0 : prev + 1));
      setShowSuggestions(true);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!visibleSuggestions.length) return;
      setActiveIndex((prev) => (prev - 1 < 0 ? visibleSuggestions.length - 1 : prev - 1));
      setShowSuggestions(true);
      return;
    }

    if (event.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < visibleSuggestions.length) {
        event.preventDefault();
        selectSuggestion(visibleSuggestions[activeIndex]);
        return;
      }
      if (normalizedQuery) {
        event.preventDefault();
        navigateToSearch(normalizedQuery);
      }
      return;
    }

    if (event.key === 'Escape') {
      setShowSuggestions(false);
      setActiveIndex(-1);
      if (onCloseMobile) onCloseMobile();
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (isMobileFullScreen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileFullScreen]);

  // Global [⌘ + K] / [Ctrl + K] keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setShowSuggestions(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Fetch trending suggestions on mount
  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/search/suggestions?q=&limit=6', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SuggestionResponse | null) => {
        if (data?.suggestions && Array.isArray(data.suggestions)) {
          setTrendingSuggestions(data.suggestions);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  // Fetch live autocomplete suggestions
  useEffect(() => {
    if (normalizedQuery.length < 2) {
      setSuggestions([]);
      setFallbackMessage('');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    lastRequestedQueryRef.current = normalizedQuery;

    const timer = setTimeout(() => {
      fetch(`/api/search/suggestions?q=${encodeURIComponent(normalizedQuery)}&limit=8`, {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: SuggestionResponse | null) => {
          if (lastRequestedQueryRef.current !== normalizedQuery) return;
          if (data?.suggestions && Array.isArray(data.suggestions)) {
            setSuggestions(data.suggestions);
            setFallbackMessage(data.fallback?.applied ? data.fallback.message || '' : '');
          } else {
            setSuggestions([]);
            setFallbackMessage('');
          }
        })
        .catch(() => {
          if (lastRequestedQueryRef.current === normalizedQuery) {
            setSuggestions([]);
            setFallbackMessage('');
          }
        })
        .finally(() => {
          if (lastRequestedQueryRef.current === normalizedQuery) {
            setIsLoading(false);
          }
        });
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery]);

  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setFallbackMessage('');
    setActiveIndex(-1);
  };

  // ============================================================================
  // 1. MOBILE FULL-SCREEN NATIVE SEARCH VIEW (Arogga / Sephora Style)
  // ============================================================================
  if (isMobileFullScreen) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search catalog"
        className="fixed inset-0 z-50 flex flex-col bg-[#121915] text-white animate-in fade-in duration-200"
      >
        {/* Top Header Bar */}
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5 bg-[#141d17]">
          <button
            type="button"
            onClick={onCloseMobile}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition active:scale-95"
            aria-label="Back to page"
          >
            <ArrowLeft size={19} />
          </button>

          {/* Search Input Box */}
          <div className="flex-1 flex items-center h-11 rounded-xl border border-white/15 bg-white/5 px-3 focus-within:border-emerald-500/60 focus-within:bg-[#161412] transition">
            <Search size={16} className="text-white/50 flex-shrink-0 mr-2" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search skincare, serums, makeup..."
              className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="p-1 rounded-full text-white/50 hover:text-white"
                aria-label="Clear text"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Voice Search Button */}
          <button
            type="button"
            onClick={startVoiceSearch}
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 ${
              isListening ? 'bg-amber-500 text-black animate-pulse' : 'bg-white/5 text-amber-300'
            }`}
            aria-label="Voice search"
          >
            <Mic size={17} />
          </button>
        </div>

        {/* Scrollable Body: Zero Keyboard Overlap */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-5">
          {/* Recent Searches (If any) */}
          {recentSearches.length > 0 && normalizedQuery.length < 2 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white/60">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Clock size={13} /> Recent Searches
                </span>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-[11px] font-medium text-white/40 hover:text-rose-400 lowercase transition"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {recentSearches.map((term) => (
                  <span
                    key={term}
                    onClick={() => navigateToSearch(term)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/90 hover:bg-white/10 active:scale-95 cursor-pointer transition"
                  >
                    <span>{term}</span>
                    <button
                      type="button"
                      onClick={(e) => removeRecentSearch(term, e)}
                      className="text-white/40 hover:text-white p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Trending Searches in Bangladesh */}
          {normalizedQuery.length < 2 && (
            <div className="space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <TrendingUp size={13} /> Trending in Bangladesh
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {dynamicTrendingChips.map((chip, idx) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => navigateToSearch(chip)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] active:scale-[0.99] text-left transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-amber-300">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-white/90">{chip}</span>
                    </div>
                    <ArrowRight size={14} className="text-white/30" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live Autocomplete Products While Typing */}
          {normalizedQuery.length >= 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-400">
                <span>Matching Formulations ({productSuggestions.length})</span>
                {isLoading && <Loader2 size={14} className="animate-spin text-emerald-400" />}
              </div>

              {productSuggestions.length > 0 ? (
                <div className="space-y-2">
                  {productSuggestions.map((prod) => {
                    const isAdding = addingProductId === prod.productId;
                    return (
                      <div
                        key={prod.productId}
                        onClick={() => selectSuggestion(prod)}
                        className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] active:scale-[0.99] cursor-pointer transition"
                      >
                        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-white/10 p-1 flex items-center justify-center">
                          <Image
                            src={prod.image || '/images/categories/Serum.png'}
                            alt={prod.productName || prod.text}
                            width={52}
                            height={52}
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white line-clamp-1">
                            {highlightMatch(prod.productName || prod.text, normalizedQuery)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-price font-bold text-emerald-300">
                              {formatPrice(prod.price)}
                            </span>
                            {prod.badges?.[0] && (
                              <span className="rounded-full bg-emerald-400/20 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-200">
                                {prod.badges[0]}
                              </span>
                            )}
                          </div>
                        </div>
                        {(() => {
                          const isOutOfStock = prod.inStock === false || (prod.stock !== undefined && prod.stock <= 0);
                          const hasVariants = Boolean(
                            prod.hasVariants ||
                            prod.badges?.some((b) => b.toLowerCase().includes('option') || b.toLowerCase().includes('shade') || b.toLowerCase().includes('variant'))
                          );

                          if (isOutOfStock) {
                            return (
                              <button
                                type="button"
                                disabled
                                className="flex h-8 items-center rounded-full px-2.5 text-[11px] font-semibold text-white/40 bg-white/5 cursor-not-allowed"
                                aria-label="Out of stock"
                              >
                                Sold Out
                              </button>
                            );
                          }

                          if (hasVariants) {
                            return (
                              <button
                                type="button"
                                onClick={(e) => handleQuickAddToCart(e, prod)}
                                className="flex h-8 items-center gap-1 rounded-full px-3 text-xs font-bold transition-all shadow-sm bg-white/10 text-white hover:bg-emerald-500 hover:text-white active:scale-95"
                                aria-label="Select options"
                              >
                                <span>Options</span>
                                <ArrowRight size={11} />
                              </button>
                            );
                          }

                          return (
                            <button
                              type="button"
                              onClick={(e) => handleQuickAddToCart(e, prod)}
                              className={`flex h-8 items-center gap-1 rounded-full px-3 text-xs font-bold transition-all shadow-sm ${
                                isAdding
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-white/10 text-white hover:bg-emerald-500 hover:text-white active:scale-95'
                              }`}
                            >
                              {isAdding ? <Check size={12} /> : <Plus size={13} />}
                              <span>{isAdding ? 'Added' : 'Add'}</span>
                            </button>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              ) : !isLoading ? (
                <div className="p-6 text-center rounded-2xl bg-white/[0.02] border border-white/5">
                  <p className="text-sm font-semibold text-white">No exact match for &ldquo;{normalizedQuery}&rdquo;</p>
                  <p className="text-xs text-white/60 mt-1">Tap below to search the complete catalog.</p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Sticky Bottom Search CTA */}
        {normalizedQuery.length >= 2 && (
          <div className="border-t border-white/10 p-3 bg-[#141d17]">
            <button
              type="button"
              onClick={() => navigateToSearch()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#D07A60] to-[#4A7C59] text-white font-bold text-sm shadow-lg active:scale-95 transition"
            >
              <span>See all results for &ldquo;{normalizedQuery}&rdquo;</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // 2. DESKTOP SEARCH BAR & 2-COLUMN LUXURY SPLIT OVERLAY
  // ============================================================================
  return (
    <div ref={searchRef} className={`relative w-full ${variant === 'compact' ? 'max-w-full' : 'max-w-[540px]'} ${className}`}>
      {/* Search Input Bar */}
      <div className="search-shell">
        <button
          type="button"
          onClick={() => {
            if (searchQuery.trim()) {
              navigateToSearch();
            } else {
              inputRef.current?.focus();
            }
          }}
          className="search-icon-btn"
          aria-label="Search"
        >
          <Search size={16} />
        </button>

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search products, categories, brands..."
          aria-label="Search products"
          role="combobox"
          aria-expanded={hasSuggestionsPanel}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          className="search-input"
        />

        {/* Clear query button if query exists */}
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              clearSearch();
              inputRef.current?.focus();
            }}
            className="mr-1.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-white/50 transition-all hover:bg-white/10 hover:text-white active:scale-95"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}

        {/* Desktop Shortcut Badge (hidden on mobile, hidden when typing) */}
        {!searchQuery && (
          <kbd
            onClick={() => {
              inputRef.current?.focus();
              setShowSuggestions(true);
            }}
            className="shortcut hidden sm:inline-flex cursor-pointer select-none"
            title="Press ⌘+K or Ctrl+K to search"
          >
            ⌘ + K
          </kbd>
        )}

        {/* Voice Search Button */}
        <button
          type="button"
          onClick={startVoiceSearch}
          className={`voice-btn ${
            isListening ? '!bg-amber-500 !text-black ring-2 ring-amber-500 scale-105' : ''
          }`}
          aria-label="Voice search"
          title="Voice search"
        >
          <Mic size={16} />
        </button>
      </div>

      {/* Trending Search Chips (Optional) */}
      {showTrendingChips && (
        <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1 scrollbar-hide" aria-label="Trending searches">
          {dynamicTrendingChips.map((chip) => (
            <Button
              key={chip}
              type="button"
              variant="ghost"
              onClick={() => navigateToSearch(chip)}
              className="flex-shrink-0 gap-1.5 rounded-lg bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-white/70 border border-white/10 hover:bg-white/[0.12] hover:text-white"
            >
              <TrendingUp size={13} aria-hidden="true" /> {chip}
            </Button>
          ))}
        </div>
      )}

      {/* ================= DESKTOP 2-COLUMN LUXURY SPLIT OVERLAY ================= */}
      {hasSuggestionsPanel && (
        <div
          className="search-desktop-split absolute left-0 top-[48px] z-50 w-full min-w-[340px] md:min-w-[620px] lg:min-w-[660px] overflow-hidden rounded-2xl border border-white/15 bg-[#141d17]/98 backdrop-blur-2xl text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          role="presentation"
        >
          {/* Top Status Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-black/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              {normalizedQuery.length >= 2 ? 'Catalog Live Suggestions' : 'Explore Formulations'}
            </span>
            {isLoading && <Loader2 size={15} className="animate-spin text-emerald-400" aria-hidden="true" />}
          </div>

          {/* 2-Column Split Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-white/10 max-h-[62vh] overflow-y-auto">
            {/* LEFT COLUMN (38%): Recent Searches, Trending Queries & Categories */}
            <div className="md:col-span-5 p-3.5 space-y-4 bg-white/[0.02]">
              {/* Recent Searches (If Any) */}
              {recentSearches.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-white/60">
                    <span className="flex items-center gap-1 text-emerald-300">
                      <Clock size={12} /> Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={clearRecentSearches}
                      className="text-[10px] font-normal text-white/40 hover:text-rose-400 lowercase transition"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {recentSearches.map((term) => (
                      <span
                        key={term}
                        onClick={() => navigateToSearch(term)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/80 hover:bg-white/10 hover:text-white cursor-pointer transition"
                      >
                        <span>{term}</span>
                        <button
                          type="button"
                          onClick={(e) => removeRecentSearch(term, e)}
                          className="text-white/40 hover:text-white"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Queries in Bangladesh */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <TrendingUp size={12} /> Popular Searches
                </p>
                <div className="space-y-1">
                  {dynamicTrendingChips.slice(0, 5).map((chip, idx) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => navigateToSearch(chip)}
                      className="w-full flex items-center justify-between p-1.5 px-2 rounded-lg text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition text-left"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-amber-300">#{idx + 1}</span>
                        <span>{chip}</span>
                      </span>
                      <ArrowRight size={12} className="text-white/30" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Categories */}
              <div className="space-y-1.5 pt-1 border-t border-white/5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Top Categories</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: 'Serums', href: '/shop?category=Serum' },
                    { label: 'Sunscreen', href: '/shop?category=Sunscreen' },
                    { label: 'Lip Care', href: '/shop?category=Lip%20Care' },
                    { label: 'Moisturizer', href: '/shop?category=Skincare' },
                  ].map((cat) => (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => {
                        setShowSuggestions(false);
                        router.push(cat.href);
                      }}
                      className="p-1.5 px-2 rounded-lg bg-white/5 text-[11px] font-medium text-white/70 hover:bg-white/10 hover:text-white transition text-left"
                    >
                      {cat.label} ➔
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (62%): Instant Product Preview Cards with Add to Cart */}
            <div className="md:col-span-7 p-3.5 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                {productSuggestions.length > 0
                  ? `Matching Formulations (${productSuggestions.length})`
                  : 'Instant Results'}
              </p>

              {productSuggestions.length > 0 ? (
                <div className="space-y-2">
                  {productSuggestions.slice(0, 4).map((prod) => {
                    const isAdding = addingProductId === prod.productId;
                    return (
                      <div
                        key={prod.productId}
                        onClick={() => selectSuggestion(prod)}
                        className="group flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/30 hover:bg-white/[0.08] cursor-pointer transition"
                      >
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-white/10 p-1 flex items-center justify-center">
                          <Image
                            src={prod.image || '/images/categories/Serum.png'}
                            alt={prod.productName || prod.text}
                            width={44}
                            height={44}
                            className="h-full w-full object-contain"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white truncate">
                            {highlightMatch(prod.productName || prod.text, normalizedQuery)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-price font-bold text-emerald-300">
                              {formatPrice(prod.price)}
                            </span>
                            {prod.badges?.[0] && (
                              <span className="rounded bg-emerald-400/20 px-1 py-0.2 text-[8.5px] font-semibold text-emerald-200">
                                {prod.badges[0]}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 1-Tap Add to Cart or Option / Out-of-Stock Button */}
                        {(() => {
                          const isOutOfStock = prod.inStock === false || (prod.stock !== undefined && prod.stock <= 0);
                          const hasVariants = Boolean(
                            prod.hasVariants ||
                            prod.badges?.some((b) => b.toLowerCase().includes('option') || b.toLowerCase().includes('shade') || b.toLowerCase().includes('variant'))
                          );

                          if (isOutOfStock) {
                            return (
                              <button
                                type="button"
                                disabled
                                className="flex h-7 items-center rounded-full px-2 text-[10.5px] font-semibold text-white/40 bg-white/5 cursor-not-allowed"
                                aria-label="Out of stock"
                              >
                                Sold Out
                              </button>
                            );
                          }

                          if (hasVariants) {
                            return (
                              <button
                                type="button"
                                onClick={(e) => handleQuickAddToCart(e, prod)}
                                className="flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold transition-all shadow-sm bg-white/10 text-white hover:bg-emerald-500 hover:text-white active:scale-95"
                                aria-label="Select options"
                              >
                                <span>Options</span>
                                <ArrowRight size={10} />
                              </button>
                            );
                          }

                          return (
                            <button
                              type="button"
                              onClick={(e) => handleQuickAddToCart(e, prod)}
                              className={`flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold transition-all shadow-sm ${
                                isAdding
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-white/10 text-white hover:bg-emerald-500 hover:text-white active:scale-95'
                              }`}
                            >
                              {isAdding ? <Check size={11} /> : <Plus size={12} />}
                              <span>{isAdding ? 'Added' : 'Add'}</span>
                            </button>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              ) : querySuggestions.length > 0 ? (
                <div className="space-y-1">
                  {querySuggestions.map((item) => (
                    <button
                      key={item.text}
                      type="button"
                      onClick={() => selectSuggestion(item)}
                      className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium text-white hover:bg-white/10 transition text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Search size={13} className="text-emerald-400" />
                        <span>{highlightMatch(item.text, normalizedQuery)}</span>
                      </span>
                      <ArrowRight size={13} className="text-white/40" />
                    </button>
                  ))}
                </div>
              ) : !isLoading ? (
                <div className="py-8 text-center text-xs text-white/60">
                  <p className="font-semibold text-white">No formulations found.</p>
                  <p className="mt-1 text-[11px]">Press Enter to search the full store catalog.</p>
                </div>
              ) : null}

              {/* Bottom Direct CTA */}
              {normalizedQuery.length >= 2 && (
                <button
                  type="button"
                  onClick={() => navigateToSearch()}
                  className="w-full flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-xs font-semibold text-emerald-300 hover:text-emerald-200 transition"
                >
                  <span>See all results for &ldquo;{normalizedQuery}&rdquo;</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
