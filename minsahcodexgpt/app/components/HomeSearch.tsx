'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ArrowRight, Loader2, Mic, Search, Sparkles, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPrice } from '@/utils/currency';
import { buildCatalogSearchPath } from '@/lib/catalog-navigation';

/* ─────────────────────── Types ─────────────────────── */

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
  /** External signal to force collapse (e.g. on scroll) */
  forceCollapsed?: boolean;
}

const fallbackTrendingChips = ['Sunscreen', 'Lip Tint', 'Serum', 'Korean Skincare'];

/* ─────────────────── Utility Fns ───────────────────── */

function getSuggestionText(s: Suggestion): string {
  return s.type === 'product' ? s.productName || s.text : s.text;
}

function getSuggestionHref(s: Suggestion): string {
  if (s.type === 'product' && s.slug) return `/products/${s.slug}`;
  return buildCatalogSearchPath(s.text);
}

function getSuggestionMeta(s: Suggestion): string {
  if (s.type === 'product') return s.price > 0 ? formatPrice(s.price) : 'View product';
  if (s.type === 'trending') return s.count && s.count > 0 ? `${s.count} searches` : 'Popular search';
  return 'Related search';
}

function getSuggestionKindLabel(s: Suggestion): string {
  if (s.type === 'product') return 'Product';
  if (s.type === 'trending') return 'Trending';
  return 'Suggestion';
}

function isImageUrl(src?: string) {
  return Boolean(src && (src.startsWith('/') || src.startsWith('http') || src.startsWith('data:')));
}

/* ═══════════════════════════════════════════════════════
   HomeSearch — Premium Expandable Capsule Search Bar
   ═══════════════════════════════════════════════════════ */

export default function HomeSearch({
  showTrendingChips = true,
  className = '',
  forceCollapsed = false,
}: HomeSearchProps) {
  const router = useRouter();
  const inputId = useId();
  const listboxId = `${inputId}-suggestions`;

  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [trendingSuggestions, setTrendingSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [fallbackMessage, setFallbackMessage] = useState('');

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastRequestedQueryRef = useRef('');

  const hasText = searchQuery.length > 0;
  const normalizedQuery = searchQuery.trim();

  /* When parent says forceCollapsed and there's no text, collapse */
  useEffect(() => {
    if (forceCollapsed && !hasText) {
      setIsExpanded(false);
      setShowSuggestions(false);
    }
  }, [forceCollapsed, hasText]);

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

  const hasSuggestionsPanel =
    isExpanded && showSuggestions && (visibleSuggestions.length > 0 || isLoading || normalizedQuery.length >= 2);

  /* ─── Actions ─── */

  const navigateToSearch = useCallback(
    (query?: string) => {
      const q = (query ?? searchQuery).trim();
      if (!q) return;
      setShowSuggestions(false);
      setActiveIndex(-1);
      router.push(buildCatalogSearchPath(q));
    },
    [searchQuery, router],
  );

  const selectSuggestion = useCallback(
    (suggestion: Suggestion) => {
      setSearchQuery(getSuggestionText(suggestion));
      setShowSuggestions(false);
      setActiveIndex(-1);
      router.push(getSuggestionHref(suggestion));
    },
    [router],
  );

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSuggestions([]);
    setFallbackMessage('');
    setActiveIndex(-1);
  }, []);

  const expandAndFocus = useCallback(() => {
    setIsExpanded(true);
    /* 90ms matches the input stagger delay so focus lands right as input fades in */
    setTimeout(() => inputRef.current?.focus(), 90);
  }, []);

  /* ─── Voice Search ─── */

  const startVoiceSearch = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SR =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SR) {
      inputRef.current?.focus();
      return;
    }

    try {
      const recognition = new SR();
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
          setIsExpanded(true);
          inputRef.current?.focus();
        }
      };
      recognition.start();
    } catch {
      setIsListening(false);
      inputRef.current?.focus();
    }
  }, []);

  /* ─── Trending preload ─── */

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/search/suggestions?trending=true&trendingLimit=6&limit=4', {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as SuggestionResponse;
        setTrendingSuggestions(data.suggestions ?? []);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setTrendingSuggestions([]);
      }
    })();
    return () => controller.abort();
  }, []);

  /* ─── Live suggestions ─── */

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
        if ((error as Error).name !== 'AbortError') setSuggestions([]);
      } finally {
        if (!controller.signal.aborted && lastRequestedQueryRef.current === requestQuery) setIsLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [normalizedQuery]);

  /* ─── Click-outside ─── */

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setActiveIndex(-1);
        if (!searchQuery.trim()) setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchQuery]);

  /* ─── Keyboard ─── */

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setShowSuggestions(true);
      setActiveIndex((c) => Math.min(c + 1, visibleSuggestions.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((c) => Math.max(c - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const active = activeIndex >= 0 ? visibleSuggestions[activeIndex] : undefined;
      active ? selectSuggestion(active) : navigateToSearch();
      return;
    }
    if (event.key === 'Escape') {
      setShowSuggestions(false);
      setActiveIndex(-1);
      if (!searchQuery.trim()) setIsExpanded(false);
    }
  };

  /* ═══════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════ */

  const isOpen = isExpanded && !forceCollapsed;

  return (
    <div ref={searchRef} className={`relative flex flex-col items-start ${className}`}>

      {/* ── Premium Capsule Shell ── */}
      <div
        onClick={() => { if (!isOpen) expandAndFocus(); }}
        style={{
          width: isOpen ? '320px' : '52px',
          maxWidth: '100%',
          transform: 'translateZ(0)',
          willChange: 'width, transform',
          transition: [
            'width 420ms cubic-bezier(0.16, 1, 0.3, 1)',
            'background-color 300ms ease',
            'border-color 300ms ease',
            'box-shadow 350ms ease',
          ].join(', '),
          ...(isOpen
            ? {
                background: 'linear-gradient(180deg, #202329 0%, #1C1F24 100%)',
                boxShadow: '0 12px 30px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.025)',
              }
            : {}),
        }}
        className={`relative flex h-[52px] items-center rounded-full overflow-hidden cursor-pointer select-none ${
          isOpen
            ? 'border border-[#8E6545]'
            : 'bg-white/10 border border-white/15 hover:bg-white/20 hover:border-white/30'
        }`}
      >

        {/* 1 ── Search Icon (Fixed anchor, zero jitter) ── */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!isOpen) {
              expandAndFocus();
            } else if (hasText) {
              navigateToSearch();
            } else {
              inputRef.current?.focus();
            }
          }}
          style={{
            transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), color 200ms ease',
          }}
          className="absolute left-0 top-0 z-20 flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center text-[#D48B38] hover:scale-[1.06] active:scale-90 cursor-pointer"
          aria-label={isOpen ? 'Search' : 'Open Search'}
        >
          <Search size={19} strokeWidth={1.8} aria-hidden="true" />
        </button>

        {/* 2 ── Input (staggered 90ms delay after container starts expanding) ── */}
        <div
          style={{
            width: '320px',
            opacity: isOpen ? 1 : 0,
            transform: isOpen ? 'translateX(0) scale(1)' : 'translateX(-8px) scale(0.985)',
            pointerEvents: isOpen ? 'auto' : 'none',
            transition: isOpen
              ? 'opacity 220ms ease 90ms, transform 320ms cubic-bezier(0.16, 1, 0.3, 1) 90ms'
              : 'opacity 160ms ease 0ms, transform 200ms ease 0ms',
          }}
          className="absolute left-0 top-0 h-[52px] pl-[50px] pr-[48px] flex items-center"
        >
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onFocus={() => {
              setIsExpanded(true);
              setShowSuggestions(true);
            }}
            placeholder="Search beauty products..."
            role="combobox"
            aria-expanded={hasSuggestionsPanel}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
            tabIndex={isOpen ? 0 : -1}
            style={{ outline: 'none', boxShadow: 'none', border: 'none', caretColor: '#D48B38' }}
            className="w-full bg-transparent text-sm font-medium text-white placeholder:text-[#C5B8AC] outline-none border-none shadow-none focus:outline-none focus:ring-0 select-text"
          />
        </div>

        {/* 3 ── Action icons (staggered 120ms delay) ── */}
        <div
          style={{
            opacity: isOpen ? 1 : 0,
            transform: isOpen
              ? 'translateY(-50%) translateX(0) scale(1)'
              : 'translateY(-50%) translateX(6px) scale(0.88)',
            pointerEvents: isOpen ? 'auto' : 'none',
            transition: isOpen
              ? 'opacity 220ms ease 120ms, transform 320ms cubic-bezier(0.16, 1, 0.3, 1) 120ms'
              : 'opacity 160ms ease 0ms, transform 200ms ease 0ms',
          }}
          className="absolute right-1.5 top-1/2 z-20 flex h-9 w-9 items-center justify-center"
        >
          {/* Mic */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              startVoiceSearch();
            }}
            style={{
              opacity: hasText ? 0 : 1,
              transform: hasText ? 'rotate(70deg) scale(0.65)' : 'rotate(0deg) scale(1)',
              pointerEvents: hasText ? 'none' : 'auto',
              transition: 'opacity 180ms ease, transform 300ms cubic-bezier(0.16, 1, 0.3, 1), color 200ms ease, background-color 200ms ease',
            }}
            className={`absolute flex h-8 w-8 items-center justify-center rounded-full text-[#FFE6D2] hover:text-[#D48B38] hover:bg-white/10 ${
              isListening ? 'animate-pulse bg-[#984B29]/50 text-white ring-1 ring-[#E58B24]' : ''
            }`}
            aria-label="Voice search"
          >
            <Mic size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>

          {/* Clear X */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearSearch();
              inputRef.current?.focus();
            }}
            style={{
              opacity: hasText ? 1 : 0,
              transform: hasText ? 'rotate(0deg) scale(1)' : 'rotate(-70deg) scale(0.65)',
              pointerEvents: hasText ? 'auto' : 'none',
              transition: 'opacity 180ms ease, transform 300ms cubic-bezier(0.16, 1, 0.3, 1), color 200ms ease, background-color 200ms ease',
            }}
            className="absolute flex h-8 w-8 items-center justify-center rounded-full text-[#D48B38] hover:text-[#FFE6D2] hover:bg-white/10"
            aria-label="Clear search"
          >
            <X size={17} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Trending Chips ── */}
      {showTrendingChips && isOpen && (
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

      {/* ── Suggestions Dropdown ── */}
      {hasSuggestionsPanel && (
        <div
          className="absolute left-0 top-[58px] z-50 w-full max-w-[320px] sm:max-w-[360px] overflow-hidden rounded-2xl border border-[#8E6545]/40 text-white animate-in fade-in zoom-in-95 duration-150"
          style={{
            background: 'linear-gradient(180deg, #1A1D22 0%, #1E2024 100%)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(142,101,69,0.15)',
          }}
          role="presentation"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3" style={{ background: 'rgba(0,0,0,0.15)' }}>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D48B38]">
                {normalizedQuery.length >= 2 ? 'Search suggestions' : 'Popular right now'}
              </p>
              {fallbackMessage ? (
                <p className="mt-1 line-clamp-1 text-xs text-[#C5B8AC]">Showing related popular results.</p>
              ) : null}
            </div>
            {isLoading ? <Loader2 size={16} className="animate-spin text-[#D48B38]" aria-hidden="true" /> : null}
          </div>

          {isLoading && visibleSuggestions.length === 0 ? (
            <div className="space-y-3 px-4 py-4" aria-live="polite">
              {[0, 1, 2].map((item) => (
                <div key={item} className="flex animate-pulse items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 rounded-full bg-white/10" />
                    <div className="h-3 w-1/3 rounded-full bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleSuggestions.length > 0 ? (
            <ul id={listboxId} role="listbox" aria-label="Search suggestions" className="max-h-[70vh] overflow-y-auto py-1">
              {visibleSuggestions.map((suggestion, index) => {
                const active = index === activeIndex;
                const productImage =
                  suggestion.type === 'product' && isImageUrl(suggestion.image) ? suggestion.image : undefined;
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
                        active ? 'bg-white/15' : 'hover:bg-white/10'
                      }`}
                    >
                      {productImage ? (
                        <span className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-white/10">
                          <Image src={productImage} alt={label} fill sizes="44px" className="object-cover" />
                        </span>
                      ) : (
                        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#D48B38]">
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
                          <span className="truncate text-sm font-bold text-white">{label}</span>
                          <span className="flex-shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-[#D48B38]">
                            {getSuggestionKindLabel(suggestion)}
                          </span>
                        </span>
                        <span className="mt-1 flex items-center gap-2 text-xs font-semibold text-[#FFE6D2]">
                          {getSuggestionMeta(suggestion)}
                          {suggestion.type === 'product' &&
                            suggestion.badges?.slice(0, 2).map((badge) => (
                              <span key={badge} className="rounded-full bg-[#984B29] px-2 py-0.5 text-xs text-white">
                                {badge}
                              </span>
                            ))}
                        </span>
                      </span>

                      <ArrowRight size={15} className="flex-shrink-0 text-[#C5B8AC]" aria-hidden="true" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-5 text-sm" aria-live="polite">
              <p className="font-bold text-white">No products found.</p>
              <p className="mt-1 text-xs text-[#C5B8AC]">Try a shorter keyword or browse popular searches below.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {fallbackTrendingChips.slice(0, 4).map((chip) => (
                  <Button
                    key={chip}
                    type="button"
                    variant="ghost"
                    onClick={() => navigateToSearch(chip)}
                    className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-[#FFE6D2] hover:bg-white/20"
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
              className="w-full justify-between rounded-none border-t border-white/10 px-4 py-3 text-left text-sm text-[#FFE6D2] hover:bg-white/10"
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
