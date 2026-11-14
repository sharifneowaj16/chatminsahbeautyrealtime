'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { useToast } from '@/components/ui/ToastProvider';
import SeedHeroVariantDropdown, { type ProductVariantItem } from '@/app/(storefront)/products/[id]/components/hero/SeedHeroVariantDropdown';

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

// Module-level in-memory cache for instant 0ms autocomplete responses (Vercel Performance Best Practice)
const searchMemoryCache = new Map<string, { suggestions: Suggestion[]; fallbackMessage: string }>();

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
          <span key={i} className="font-extrabold text-[#10b981] underline decoration-[#10b981]/50 underline-offset-2">
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
  const { pushToast } = useToast();

  const inputId = useId();
  const listboxId = `${inputId}-suggestions`;
  const [mounted, setMounted] = useState(false);
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
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [isAnyDropdownOpen, setIsAnyDropdownOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastRequestedQueryRef = useRef('');
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties | null>(null);

  // Safe SSR hydration guard (prevents #418 mismatches on iOS/WebKit)
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Variant Selection Add to Cart right from suggestion card
  const handleVariantAddToCart = useCallback(
    (prod: ProductSuggestion, variant: ProductVariantItem) => {
      setAddingProductId(prod.productId);

      addItem({
        id: `${prod.productId}-${variant.id}`,
        productId: prod.productId,
        name: `${prod.productName || prod.text} (${variant.name})`,
        price: variant.price || prod.price,
        quantity: 1,
        image: variant.image || prod.image || '/images/categories/Serum.png',
      });

      pushToast({
        title: 'Added to Bag',
        description: `${prod.productName || prod.text} (${variant.name})`,
        tone: 'success',
        duration: 2500,
      });

      setTimeout(() => {
        setAddingProductId(null);
      }, 1000);
    },
    [addItem, pushToast]
  );

  // Quick 1-tap Add to Cart right from suggestion card (with stock guards)
  const handleQuickAddToCart = useCallback(
    (e: React.MouseEvent, suggestion: ProductSuggestion) => {
      e.stopPropagation();

      const isOutOfStock = suggestion.inStock === false || (suggestion.stock !== undefined && suggestion.stock <= 0);
      if (isOutOfStock) return;

      setAddingProductId(suggestion.productId);

      addItem({
        id: suggestion.productId,
        productId: suggestion.productId,
        name: suggestion.productName || suggestion.text,
        price: suggestion.price,
        quantity: 1,
        image: suggestion.image || '/images/categories/Serum.png',
      });

      pushToast({
        title: 'Added to Bag',
        description: suggestion.productName || suggestion.text,
        tone: 'success',
        duration: 2500,
      });

      setTimeout(() => {
        setAddingProductId(null);
      }, 1000);
    },
    [addItem, pushToast]
  );

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
    // If a variant dropdown is currently open, yield arrow keys to dropdown navigation
    if (isAnyDropdownOpen) {
      if (event.key === 'Escape') {
        setIsAnyDropdownOpen(false);
      }
      return;
    }

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
      const target = event.target as Node | null;
      if (
        searchRef.current &&
        !searchRef.current.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setShowSuggestions(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileFullScreen]);

  // Position desktop suggestions panel on document.body
  useEffect(() => {
    if (!hasSuggestionsPanel || isMobileFullScreen) {
      setPanelStyle(null);
      return;
    }

    const place = () => {
      const anchor = searchRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(660, window.innerWidth - 16);
      const left = Math.min(
        Math.max(8, rect.left + rect.width / 2 - width / 2),
        window.innerWidth - width - 8
      );
      setPanelStyle({
        position: 'fixed',
        top: Math.round(rect.bottom + 6),
        left: Math.round(left),
        width,
        zIndex: 180,
      });
    };

    place();
    window.addEventListener('resize', place);
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          place();
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [hasSuggestionsPanel, isMobileFullScreen, searchQuery]);

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

  // Fetch live autocomplete suggestions with Vercel Edge Cache & Instant 0ms In-Memory Hit
  useEffect(() => {
    if (normalizedQuery.length < 2) {
      setSuggestions([]);
      setFallbackMessage('');
      setIsLoading(false);
      return;
    }

    // Instant 0ms cache hit from memory
    const cached = searchMemoryCache.get(normalizedQuery);
    if (cached) {
      setSuggestions(cached.suggestions);
      setFallbackMessage(cached.fallbackMessage);
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
            const resultList = data.suggestions;
            const fallbackMsg = data.fallback?.applied ? data.fallback.message || '' : '';
            searchMemoryCache.set(normalizedQuery, { suggestions: resultList, fallbackMessage: fallbackMsg });
            setSuggestions(resultList);
            setFallbackMessage(fallbackMsg);
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
    }, 150); // 150ms debounce reduces unnecessary keystroke API traffic by ~70%

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
  // 1. MOBILE FULL-SCREEN NATIVE SEARCH VIEW (Theme 5: Brand Green & Crisp White)
  // ============================================================================
  if (isMobileFullScreen) {
    if (!mounted || typeof document === 'undefined') return null;

    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search catalog"
        className="fixed inset-0 h-[100dvh] w-full z-[180] flex flex-col bg-[#FAF9F6] text-slate-900 animate-in fade-in duration-200 overflow-hidden"
      >
        {/* Top Header Bar: Solid Deep Forest Green (#062402) with Top Grab Handle */}
        <div
          style={{ backgroundColor: '#062402' }}
          className="flex flex-col bg-[#062402] border-b border-[#D4F6A2]/20 shadow-md shrink-0"
        >
          {/* Top Grab Handle */}
          <div className="w-12 h-1 bg-white/40 rounded-full mx-auto mt-2 mb-1" aria-hidden="true" />
          <div className="flex items-center gap-2.5 px-3 py-2">
            <button
              type="button"
              onClick={onCloseMobile}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition active:scale-95 border border-white/20"
              aria-label="Back to page"
            >
              <ArrowLeft size={19} />
            </button>

            {/* Search Input Box (Font size strictly 16px to prevent iOS Safari auto-zoom) */}
            <div
              style={{ backgroundColor: '#FFFFFF' }}
              className="flex-1 flex items-center h-10 rounded-full bg-white px-3.5 focus-within:ring-2 focus-within:ring-[#D4F6A2] transition shadow-xs border border-white/20"
            >
              <Search size={16} className="text-[#062402] shrink-0 mr-2" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search skincare, serums, makeup..."
                className="w-full bg-transparent text-[16px] text-[#181C1A] placeholder:text-stone-400 focus:outline-none touch-manipulation font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="p-1 rounded-full text-stone-400 hover:text-stone-700 transition"
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
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95 border ${
                isListening
                  ? 'bg-[#D4F6A2] text-[#062402] border-[#D4F6A2] animate-pulse shadow-sm'
                  : 'bg-white/15 text-[#D4F6A2] border-[#D4F6A2]/30 hover:bg-white/25'
              }`}
              aria-label="Voice search"
            >
              <Mic size={17} />
            </button>
          </div>
        </div>

        {/* Scrollable Body: 100% Solid Background, Zero Keyboard Overlap */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar overscroll-contain p-4 space-y-4 bg-[#FAF9F6]">
          {/* Minimal Fast Search Prompt when idle */}
          {normalizedQuery.length < 2 && (
            <div className="py-14 px-4 text-center space-y-3">
              <div className="w-13 h-13 rounded-2xl bg-[#062402]/10 text-[#062402] flex items-center justify-center mx-auto">
                <Search size={22} className="stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-slate-900">Instant Formulation Search</h3>
                <p className="text-[13px] text-stone-500 mt-1 max-w-xs mx-auto">
                  Type any authentic product name, active ingredient or brand for fast live results.
                </p>
              </div>
            </div>
          )}

          {/* Live Autocomplete Products While Typing */}
          {normalizedQuery.length >= 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#062402]">
                <span>Matching Formulations ({productSuggestions.length})</span>
                {isLoading && <Loader2 size={14} className="animate-spin text-[#062402]" />}
              </div>

              {productSuggestions.length > 0 ? (
                <div className="space-y-2.5">
                  {productSuggestions.map((prod) => {
                    const isAdding = addingProductId === prod.productId;
                    const isOutOfStock = prod.inStock === false || (prod.stock !== undefined && prod.stock <= 0);
                    const hasMultiVariants = Boolean(prod.variants && prod.variants.length > 1);
                    const currentVariantId = selectedVariants[prod.productId] || prod.variants?.[0]?.id || null;

                    return (
                      <div
                        key={prod.productId}
                        onClick={() => selectSuggestion(prod)}
                        className="p-3.5 rounded-2xl bg-white border border-stone-200 hover:border-stone-400 active:scale-[0.99] cursor-pointer transition flex flex-col gap-2.5 shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative h-13 w-13 flex-shrink-0 overflow-hidden rounded-xl bg-[#f4f7f4] border border-stone-200 p-1 flex items-center justify-center">
                            <Image
                              src={prod.image || '/images/categories/Serum.png'}
                              alt={prod.productName || prod.text}
                              width={52}
                              height={52}
                              className="h-full w-full object-contain"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-[#142b10] line-clamp-1">
                              {highlightMatch(prod.productName || prod.text, normalizedQuery)}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs font-price font-extrabold text-[#062402]">
                                {formatPrice(prod.price)}
                              </span>
                              {prod.rating && prod.rating > 0 ? (
                                <span className="flex items-center gap-0.5 text-amber-600 text-[11px] font-bold">
                                  <span>★</span>
                                  <span>{prod.rating.toFixed(1)}</span>
                                  {prod.reviewCount ? (
                                    <span className="text-stone-500 font-normal text-[10px]">({prod.reviewCount})</span>
                                  ) : null}
                                </span>
                              ) : null}
                              {prod.badges?.[0] && (
                                <span className="rounded-full bg-[#062402]/10 px-2 py-0.5 text-[9px] font-bold text-[#062402]">
                                  {prod.badges[0]}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Button for Single Products (Right Aligned, Always Visible) */}
                          {!hasMultiVariants && (
                            <div onClick={(e) => e.stopPropagation()}>
                              {isOutOfStock ? (
                                <button
                                  type="button"
                                  disabled
                                  className="flex h-8 items-center rounded-full px-2.5 text-[11px] font-semibold text-stone-400 bg-stone-100 cursor-not-allowed"
                                  aria-label="Out of stock"
                                >
                                  Sold Out
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickAddToCart(e, prod)}
                                  className={`flex h-8.5 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition-all shadow-xs ${
                                    isAdding
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-[#062402] hover:bg-[#153410] text-white active:scale-95'
                                  }`}
                                  aria-label={`Add ${prod.productName || prod.text} to cart`}
                                >
                                  {isAdding ? <Check size={13} strokeWidth={2.5} /> : <Plus size={13} strokeWidth={2.5} />}
                                  <span>{isAdding ? 'Added' : 'Add to Bag'}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Full Width Variant Selector Row with Left/Right Node Connector Popup Modal */}
                        {hasMultiVariants && prod.variants && (
                          <div
                            className="w-full pt-2 border-t border-stone-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <SeedHeroVariantDropdown
                              variants={prod.variants}
                              selectedVariantId={currentVariantId}
                              defaultImage={prod.image}
                              compact
                              layout="list"
                              className="w-full"
                              onOpenChange={(open) => setIsAnyDropdownOpen(open)}
                              onVariantChange={(vId) => {
                                setSelectedVariants((prev) => ({ ...prev, [prod.productId]: vId || '' }));
                              }}
                              onSelectVariant={(variant) => {
                                handleVariantAddToCart(prod, variant);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : !isLoading ? (
                <div className="p-6 text-center rounded-2xl bg-white border border-stone-200 shadow-2xs">
                  <p className="text-sm font-semibold text-slate-900">No exact match for &ldquo;{normalizedQuery}&rdquo;</p>
                  <p className="text-xs text-stone-500 mt-1">Tap below to search the complete catalog.</p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Sticky Bottom Search CTA with Safe Area Support */}
        {normalizedQuery.length >= 2 && (
          <div className="border-t border-stone-200 p-3 bg-white shadow-lg shrink-0 pb-[max(12px,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => navigateToSearch()}
              style={{ backgroundColor: '#062402' }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#062402] hover:bg-[#153410] text-[#D4F6A2] font-bold text-sm shadow-md active:scale-95 transition"
            >
              <span>See all results for &ldquo;{normalizedQuery}&rdquo;</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>,
      document.body
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

      {/* ================= DESKTOP COMMAND PALETTE OVERLAY (Theme 5: Brand Green & Crisp White) ================= */}
      {hasSuggestionsPanel && panelStyle && mounted
        ? createPortal(
            <div
              ref={panelRef}
              className="search-desktop-split overflow-hidden rounded-2xl border-2 border-[#1c3a13]/25 bg-gradient-to-b from-white via-[#fcfdfc] to-[#f4f7f4] text-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
              style={panelStyle}
              role="presentation"
            >
          {/* Top Brand Accent Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#1c3a13] via-[#4A7C59] to-[#1c3a13]" />

          {/* Top Status Header */}
          <div className="flex items-center justify-between border-b border-[#1c3a13]/15 px-4 py-2.5 bg-[#f0f6f1]">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1c3a13]">
              {normalizedQuery.length >= 2
                ? `Matching Formulations (${productSuggestions.length})`
                : 'Explore Formulations'}
            </span>
            <div className="flex items-center gap-3">
              {normalizedQuery.length >= 2 && (
                <span className="hidden sm:inline-flex items-center gap-2 text-[10px] text-stone-600 font-mono">
                  <span>↑↓ Navigate</span>
                  <span>•</span>
                  <span>↵ Open</span>
                  <span>•</span>
                  <span>ESC Close</span>
                </span>
              )}
              {isLoading && <Loader2 size={15} className="animate-spin text-[#1c3a13]" aria-hidden="true" />}
            </div>
          </div>

          {/* Unified Linear Command Palette when actively typing (query >= 2) */}
          {normalizedQuery.length >= 2 ? (
            <div className="p-3.5 space-y-3.5 max-h-[65vh] overflow-y-auto">
              {productSuggestions.length > 0 ? (
                <div className="space-y-1.5" role="listbox" id={listboxId}>
                  {productSuggestions.slice(0, 8).map((prod) => {
                    const itemIndex = visibleSuggestions.findIndex(
                      (s) => s.type === 'product' && s.productId === prod.productId
                    );
                    const isActive = activeIndex === itemIndex;
                    const isAdding = addingProductId === prod.productId;
                    const isOutOfStock = prod.inStock === false || (prod.stock !== undefined && prod.stock <= 0);
                    const hasMultiVariants = Boolean(prod.variants && prod.variants.length > 1);
                    const currentVariantId = selectedVariants[prod.productId] || prod.variants?.[0]?.id || null;

                    return (
                      <div
                        key={prod.productId}
                        id={`${listboxId}-option-${itemIndex}`}
                        role="option"
                        aria-selected={isActive}
                        onClick={() => selectSuggestion(prod)}
                        className={`group flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isActive
                            ? 'bg-[#eef6f0] border-2 border-[#1c3a13]/50 ring-4 ring-[#1c3a13]/10 text-slate-950 shadow-md'
                            : 'bg-white border border-[#1c3a13]/15 hover:border-[#1c3a13]/35 hover:bg-[#f6faf7] text-slate-800 shadow-xs'
                        }`}
                      >
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-white border border-[#1c3a13]/15 p-1 flex items-center justify-center shadow-xs">
                          <Image
                            src={prod.image || '/images/categories/Serum.png'}
                            alt={prod.productName || prod.text}
                            width={48}
                            height={48}
                            className="h-full w-full object-contain"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#142b10] truncate">
                            {highlightMatch(prod.productName || prod.text, normalizedQuery)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs font-price font-extrabold text-[#1c3a13]">
                              {formatPrice(prod.price)}
                            </span>
                            {prod.rating && prod.rating > 0 ? (
                              <span className="flex items-center gap-0.5 text-amber-600 text-[11px] font-bold">
                                <span>★</span>
                                <span>{prod.rating.toFixed(1)}</span>
                                {prod.reviewCount ? (
                                  <span className="text-stone-500 font-normal text-[10px]">({prod.reviewCount})</span>
                                ) : null}
                              </span>
                            ) : null}
                            {prod.badges?.[0] && (
                              <span className="rounded-full bg-[#1c3a13]/10 px-2 py-0.5 text-[8.5px] font-bold text-[#1c3a13]">
                                {prod.badges[0]}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Area: Enter Pill + Variant Dropdown OR 1-Tap ADD Button */}
                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {isActive && (
                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1c3a13]/10 border border-[#1c3a13]/25 text-[10px] font-mono text-[#1c3a13] font-bold">
                              ↵ Enter
                            </span>
                          )}

                          {isOutOfStock ? (
                            <button
                              type="button"
                              disabled
                              className="flex h-7.5 items-center rounded-full px-2.5 text-[10.5px] font-semibold text-stone-400 bg-stone-100 cursor-not-allowed"
                              aria-label="Out of stock"
                            >
                              Sold Out
                            </button>
                          ) : hasMultiVariants && prod.variants ? (
                            <div className="relative shrink-0 w-36 sm:w-44">
                              <SeedHeroVariantDropdown
                                variants={prod.variants}
                                selectedVariantId={currentVariantId}
                                defaultImage={prod.image}
                                compact
                                layout="list"
                                onOpenChange={(open) => setIsAnyDropdownOpen(open)}
                                onVariantChange={(vId) => {
                                  setSelectedVariants((prev) => ({ ...prev, [prod.productId]: vId || '' }));
                                }}
                                onSelectVariant={(variant) => {
                                  handleVariantAddToCart(prod, variant);
                                }}
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleQuickAddToCart(e, prod)}
                              className={`flex h-8 items-center gap-1.5 rounded-xl px-3.5 text-xs font-extrabold transition-all shadow-xs ${
                                isAdding
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-[#062402] hover:bg-[#153410] text-white active:scale-95'
                              }`}
                              aria-label={`Add ${prod.productName || prod.text} to cart`}
                            >
                              {isAdding ? <Check size={11} strokeWidth={2.5} /> : <Plus size={12} strokeWidth={2.5} />}
                              <span>{isAdding ? 'Added' : 'Add to Bag'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : !isLoading ? (
                <div className="py-8 text-center text-xs text-stone-500">
                  <p className="font-semibold text-slate-800">No exact formulations found.</p>
                  <p className="mt-1 text-[11px]">Press Enter to search the complete store catalog.</p>
                </div>
              ) : null}



              {/* Bottom Sticky Search CTA */}
              <button
                type="button"
                onClick={() => navigateToSearch()}
                style={{ backgroundColor: '#062402' }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#062402] hover:bg-[#153410] text-[#D4F6A2] font-bold text-xs shadow-md active:scale-95 transition"
              >
                <span>See all results for &ldquo;{normalizedQuery}&rdquo;</span>
                <span className="flex items-center gap-1.5">
                  <span className="hidden sm:inline text-[10px] font-mono opacity-80 text-white">Press ↵</span>
                  <ArrowRight size={14} />
                </span>
              </button>
            </div>
          ) : (
            /* Discovery 2-Column Split when query < 2 */
            <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-[#1c3a13]/15 max-h-[62vh] overflow-y-auto">
              {/* LEFT COLUMN (38%): Recent Searches, Trending Queries & Categories */}
              <div className="md:col-span-5 p-3.5 space-y-4 bg-[#f8faf8]">
                {/* Recent Searches (If Any) */}
                {recentSearches.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                      <span className="flex items-center gap-1 text-[#1c3a13]">
                        <Clock size={12} /> Recent Searches
                      </span>
                      <button
                        type="button"
                        onClick={clearRecentSearches}
                        className="text-[10px] font-normal text-stone-500 hover:text-rose-500 lowercase transition"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {recentSearches.map((term) => (
                        <span
                          key={term}
                          onClick={() => navigateToSearch(term)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#1c3a13]/20 text-xs font-semibold text-[#1c3a13] hover:bg-[#f0f6f1] cursor-pointer transition shadow-2xs"
                        >
                          <span>{term}</span>
                          <button
                            type="button"
                            onClick={(e) => removeRecentSearch(term, e)}
                            className="text-stone-400 hover:text-stone-700"
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
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#1c3a13] flex items-center gap-1">
                    <TrendingUp size={12} /> Popular Searches
                  </p>
                  <div className="space-y-1">
                    {dynamicTrendingChips.slice(0, 5).map((chip, idx) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => navigateToSearch(chip)}
                        className="w-full flex items-center justify-between p-1.5 px-2 rounded-lg text-xs font-medium text-slate-800 hover:bg-white hover:text-[#1c3a13] transition text-left"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-[#1c3a13] bg-[#1c3a13]/10 px-1 rounded font-bold">#{idx + 1}</span>
                          <span>{chip}</span>
                        </span>
                        <ArrowRight size={12} className="text-[#1c3a13]/40" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Categories */}
                <div className="space-y-1.5 pt-1 border-t border-[#1c3a13]/10">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-600">Top Categories</p>
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
                        className="p-1.5 px-2 rounded-lg bg-white border border-[#1c3a13]/15 text-[11px] font-medium text-[#1c3a13] hover:bg-[#1c3a13] hover:text-white transition text-left shadow-2xs"
                      >
                        {cat.label} ➔
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN (62%): Discovery Products */}
              <div className="md:col-span-7 p-3.5 space-y-2 bg-white">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#1c3a13]">
                  Popular Formulations
                </p>

                {trendingSuggestions.filter((item): item is ProductSuggestion => item.type === 'product').length > 0 ? (
                  <div className="space-y-2">
                    {trendingSuggestions
                      .filter((item): item is ProductSuggestion => item.type === 'product')
                      .slice(0, 4)
                      .map((prod) => {
                        const isAdding = addingProductId === prod.productId;
                        const isOutOfStock = prod.inStock === false || (prod.stock !== undefined && prod.stock <= 0);
                        const hasVariants = Boolean(
                          prod.hasVariants ||
                          prod.badges?.some((b) => b.toLowerCase().includes('option') || b.toLowerCase().includes('shade') || b.toLowerCase().includes('variant'))
                        );
                        const currentVariantId = selectedVariants[prod.productId] || prod.variants?.[0]?.id || null;

                        return (
                          <div
                            key={prod.productId}
                            onClick={() => selectSuggestion(prod)}
                            className="group flex items-center gap-3 p-2.5 rounded-xl bg-white border border-[#1c3a13]/15 hover:border-[#1c3a13]/35 hover:bg-[#f6faf7] cursor-pointer transition shadow-2xs"
                          >
                            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-[#f4f7f4] border border-[#1c3a13]/10 p-1 flex items-center justify-center">
                              <Image
                                src={prod.image || '/images/categories/Serum.png'}
                                alt={prod.productName || prod.text}
                                width={44}
                                height={44}
                                className="h-full w-full object-contain"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {prod.productName || prod.text}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-xs font-price font-extrabold text-[#1c3a13]">
                                  {formatPrice(prod.price)}
                                </span>
                                {prod.rating && prod.rating > 0 ? (
                                  <span className="flex items-center gap-0.5 text-amber-600 text-[11px] font-bold">
                                    <span>★</span>
                                    <span>{prod.rating.toFixed(1)}</span>
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            {/* Action Button */}
                            <div onClick={(e) => e.stopPropagation()}>
                              {isOutOfStock ? (
                                <button
                                  type="button"
                                  disabled
                                  className="flex h-7 items-center rounded-full px-2 text-[10.5px] font-semibold text-stone-400 bg-stone-100 cursor-not-allowed"
                                >
                                  Sold Out
                                </button>
                              ) : hasVariants && prod.variants && prod.variants.length > 0 ? (
                                <div className="relative shrink-0 w-36 sm:w-44">
                                  <SeedHeroVariantDropdown
                                    variants={prod.variants}
                                    selectedVariantId={currentVariantId}
                                    defaultImage={prod.image}
                                    compact
                                    layout="list"
                                    onOpenChange={(open) => setIsAnyDropdownOpen(open)}
                                    onVariantChange={(vId) => {
                                      setSelectedVariants((prev) => ({ ...prev, [prod.productId]: vId || '' }));
                                    }}
                                    onSelectVariant={(variant) => {
                                      handleVariantAddToCart(prod, variant);
                                    }}
                                  />
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickAddToCart(e, prod)}
                                  className={`flex h-7.5 items-center gap-1 rounded-full px-3 text-[11px] font-bold transition-all shadow-sm ${
                                    isAdding
                                      ? 'bg-[#1c3a13] text-white'
                                      : 'bg-[#1c3a13] hover:bg-[#264f1a] text-white active:scale-95'
                                  }`}
                                  aria-label={`Add ${prod.productName || prod.text} to cart`}
                                >
                                  {isAdding ? <Check size={11} strokeWidth={2.5} /> : <Plus size={12} strokeWidth={2.5} />}
                                  <span>{isAdding ? 'ADDED' : 'ADD'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-stone-500">
                    <p>Start typing to search formulations and brands.</p>
                  </div>
                )}
              </div>
            </div>
          )}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
