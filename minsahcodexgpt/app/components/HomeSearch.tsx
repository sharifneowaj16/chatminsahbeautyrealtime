'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ArrowRight, Loader2, Mic, Search, Sparkles, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
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

export default function HomeSearch({ showTrendingChips = false, className = '' }: HomeSearchProps) {
  const router = useRouter();
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
  const [isMac, setIsMac] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  const navigateToSearch = useCallback(
    (query?: string) => {
      const q = (query ?? searchQuery).trim();
      if (!q) return;

      setShowSuggestions(false);
      setActiveIndex(-1);
      router.push(buildCatalogSearchPath(q));
    },
    [searchQuery, router]
  );

  const selectSuggestion = useCallback(
    (suggestion: Suggestion) => {
      setSearchQuery(getSuggestionText(suggestion));
      setShowSuggestions(false);
      setActiveIndex(-1);
      router.push(getSuggestionHref(suggestion));
    },
    [router]
  );

  // Detect OS for keyboard shortcut badge
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.userAgent) {
      setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.userAgent));
    }
  }, []);

  // Voice Search with Web Speech API
  const startVoiceSearch = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      inputRef.current?.focus();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setSearchQuery(transcript);
          inputRef.current?.focus();
        }
      };

      recognition.start();
    } catch {
      setIsListening(false);
      inputRef.current?.focus();
    }
  }, []);

  // Global Ctrl+K / ⌘K keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && (event.key === 'k' || event.key === 'K')) {
        event.preventDefault();
        inputRef.current?.focus();
        setShowSuggestions(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

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
    }, 200);

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
    <div ref={searchRef} className={`relative w-full max-w-[540px] ${className}`}>
      {/* Minsah Beauty Structured Search Bar */}
      <div className="search-shell">
        {/* Search Icon Button */}
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
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m21 21-4.34-4.34" />
            <circle cx="11" cy="11" r="8" />
          </svg>
        </button>

        {/* Input */}
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
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}

        {/* High-Contrast Clear [⌘ + K] Badge */}
        <kbd
          onClick={() => {
            inputRef.current?.focus();
            setShowSuggestions(true);
          }}
          className="shortcut cursor-pointer"
          title="Press shortcut to search"
        >
          ⌘ + K
        </kbd>

        {/* Voice Search Button (Always Present) */}
        <button
          type="button"
          onClick={startVoiceSearch}
          className={`voice-btn ${
            isListening ? '!bg-[#E58B24] !text-black ring-2 ring-[#E58B24] scale-105' : ''
          }`}
          aria-label="Voice search"
          title="Voice search"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 19v3" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <rect x="9" y="2" width="6" height="13" rx="3" />
          </svg>
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

      {/* Suggestions Dropdown */}
      {hasSuggestionsPanel && (
        <div
          className="absolute left-0 top-[48px] z-50 w-full overflow-hidden rounded-xl border border-white/15 bg-[#171513] text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          role="presentation"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-3.5 py-2.5 bg-black/25">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#E58B24]">
                {normalizedQuery.length >= 2 ? 'Search suggestions' : 'Popular searches'}
              </p>
              {fallbackMessage ? (
                <p className="mt-0.5 line-clamp-1 text-xs text-white/60">Showing related popular results.</p>
              ) : null}
            </div>
            {isLoading ? <Loader2 size={15} className="animate-spin text-[#E58B24]" aria-hidden="true" /> : null}
          </div>

          {isLoading && visibleSuggestions.length === 0 ? (
            <div className="space-y-2.5 px-3.5 py-3" aria-live="polite">
              {[0, 1, 2].map((item) => (
                <div key={item} className="flex animate-pulse items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-white/10" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-2/3 rounded bg-white/10" />
                    <div className="h-2.5 w-1/3 rounded bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleSuggestions.length > 0 ? (
            <ul id={listboxId} role="listbox" aria-label="Search suggestions" className="max-h-[60vh] overflow-y-auto py-1">
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
                      className={`w-full justify-start gap-3 rounded-none px-3.5 py-2.5 text-left transition-colors ${
                        active ? 'bg-white/[0.12]' : 'hover:bg-white/[0.06]'
                      }`}
                    >
                      {productImage ? (
                        <span className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-white/10">
                          <Image
                            src={productImage}
                            alt={label}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        </span>
                      ) : (
                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06] border border-white/10 text-[#E58B24]">
                          {suggestion.type === 'trending' ? (
                            <TrendingUp size={16} aria-hidden="true" />
                          ) : suggestion.type === 'completion' ? (
                            <Sparkles size={16} aria-hidden="true" />
                          ) : (
                            <Search size={16} aria-hidden="true" />
                          )}
                        </span>
                      )}

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-white">{label}</span>
                          <span className="flex-shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#E58B24]">
                            {getSuggestionKindLabel(suggestion)}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-2 text-xs text-white/70">
                          {getSuggestionMeta(suggestion)}
                          {suggestion.type === 'product' && suggestion.badges?.slice(0, 2).map((badge) => (
                            <span key={badge} className="rounded bg-[#984B29] px-1.5 py-0.2 text-[10px] font-medium text-white">
                              {badge}
                            </span>
                          ))}
                        </span>
                      </span>

                      <ArrowRight size={14} className="flex-shrink-0 text-white/40" aria-hidden="true" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-4 text-sm" aria-live="polite">
              <p className="font-semibold text-white">No products found.</p>
              <p className="mt-1 text-xs text-white/60">Try a shorter keyword or browse popular searches below.</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {fallbackTrendingChips.slice(0, 4).map((chip) => (
                  <Button
                    key={chip}
                    type="button"
                    variant="ghost"
                    onClick={() => navigateToSearch(chip)}
                    className="rounded-lg bg-white/[0.06] border border-white/10 px-2.5 py-1 text-xs text-white/80 hover:bg-white/[0.12]"
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
              className="w-full justify-between rounded-none border-t border-white/10 px-3.5 py-2.5 text-left text-xs font-semibold text-[#E58B24] hover:bg-white/[0.08]"
            >
              <span>See all results for &ldquo;{normalizedQuery}&rdquo;</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
