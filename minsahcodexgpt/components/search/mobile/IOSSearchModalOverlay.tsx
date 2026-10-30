"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useCartDrawer } from "@/contexts/CartDrawerContext";
import { IOSSmoothSearchBar } from "./IOSSmoothSearchBar";
import { SearchSpotlightDropdown } from "./SearchSpotlightDropdown";
import { SearchKeyboardNavHandler } from "./SearchKeyboardNavHandler";
import { SearchResultItem } from "./types";

const RECENT_SEARCHES_KEY = "minsah_recent_searches";

interface IOSSearchModalOverlayProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function IOSSearchModalOverlay({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
}: IOSSearchModalOverlayProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const { openDrawer: openCartDrawer } = useCartDrawer();

  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const lastRequestedQueryRef = useRef("");

  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

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

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const updated = [trimmed, ...prev.filter((t) => t.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {}
  };

  // Listen to open/close custom events
  useEffect(() => {
    const handleOpen = () => setInternalOpen(true);
    const handleClose = () => setInternalOpen(false);

    window.addEventListener("minsah:open-search", handleOpen);
    window.addEventListener("minsah:close-search", handleClose);

    return () => {
      window.removeEventListener("minsah:open-search", handleOpen);
      window.removeEventListener("minsah:close-search", handleClose);
    };
  }, []);

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalOpen(false);
    }
    setQuery("");
    setResults([]);
    setIsLoading(false);
  };

  // Live Debounced Product Search from Existing Catalog API
  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      setResults([]);
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
        .then((data) => {
          if (lastRequestedQueryRef.current !== normalizedQuery) return;
          if (data?.suggestions && Array.isArray(data.suggestions)) {
            const mappedResults: SearchResultItem[] = data.suggestions
              .filter((item: any) => item.type === "product")
              .map((item: any) => ({
                id: item.productId || item.id,
                name: item.productName || item.text,
                brand: item.brand || "",
                priceBdt: Number(item.price) || 0,
                originalPriceBdt: item.originalPrice ? Number(item.originalPrice) : undefined,
                rating: 5.0,
                imageUrl: item.image || "/images/categories/Serum.png",
                slug: item.slug,
                category: item.category || "",
              }));
            setResults(mappedResults);
          } else {
            setResults([]);
          }
        })
        .catch(() => {
          if (lastRequestedQueryRef.current === normalizedQuery) {
            setResults([]);
          }
        })
        .finally(() => {
          if (lastRequestedQueryRef.current === normalizedQuery) {
            setIsLoading(false);
          }
        });
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleSelectTag = (selected: string) => {
    setQuery(selected);
    saveRecentSearch(selected);
  };

  const handleProductClick = (item: SearchResultItem) => {
    saveRecentSearch(item.name);
    handleClose();
    if (item.slug) {
      router.push(`/products/${item.slug}`);
    } else {
      router.push(`/products/${item.id}`);
    }
  };

  const handleAddToCart = (e: React.MouseEvent, item: SearchResultItem) => {
    e.stopPropagation();
    addItem({
      id: item.id,
      productId: item.id,
      name: item.name,
      price: item.priceBdt,
      quantity: 1,
      image: item.imageUrl,
    });
    openCartDrawer();
    handleClose();
  };

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-start">
      {/* Keyboard navigation listener */}
      <SearchKeyboardNavHandler isOpen={isModalOpen} onClose={handleClose} />

      {/* Top Search Bar */}
      <IOSSmoothSearchBar
        query={query}
        onChangeQuery={setQuery}
        onClear={() => setQuery("")}
        onCancel={handleClose}
        onSubmit={(e) => {
          e?.preventDefault();
          if (query.trim()) {
            saveRecentSearch(query.trim());
            handleClose();
            router.push(`/shop?q=${encodeURIComponent(query.trim())}`);
          }
        }}
      />

      {/* Backdrop */}
      <div
        className="fixed inset-0 top-16 bg-[#062402]/40 backdrop-blur-xs transition-opacity duration-300 cursor-pointer touch-manipulation"
        onClick={handleClose}
        role="presentation"
      />

      {/* Dropdown Container */}
      <div
        className="relative z-10 max-h-[85vh] overflow-y-auto no-scrollbar"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "manipulation" }}
      >
        {/* Spotlight Trend Tags (shows when query is short) */}
        {!query.trim() && (
          <SearchSpotlightDropdown
            onSelectTag={handleSelectTag}
            recentSearches={recentSearches}
            onClearRecent={clearRecentSearches}
          />
        )}

        {/* Live Search Results (shows when query is typed) */}
        {query.trim().length > 0 && (
          <div className="bg-[#FFFFFF]/98 backdrop-blur-2xl border-b border-[#E2DED8]/60 p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#062402]">
                {isLoading ? "Searching live catalog..." : `Search Results (${results.length})`}
              </span>
              <span className="text-[10px] text-[#4b6723] font-semibold bg-[#EAF7D8] px-2 py-0.5 rounded-full border border-[#4b6723]/20">
                100% Authentic Korean Stock
              </span>
            </div>

            {isLoading ? (
              <div className="py-10 flex flex-col items-center justify-center gap-2 text-stone-500">
                <Loader2 className="w-6 h-6 animate-spin text-[#4b6723]" />
                <span className="text-xs font-medium">Finding matching products...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <span className="material-symbols-outlined text-4xl text-[#43483f]">
                  manage_search
                </span>
                <p className="text-xs font-semibold text-[#181C1A]">
                  No matching products found for &quot;{query}&quot;
                </p>
                <p className="text-[11px] text-[#43483f]">
                  Try searching by product name, category, or brand
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleProductClick(item)}
                    className="p-2.5 rounded-2xl bg-[#F8FAF7] border border-[#E2DED8]/60 flex items-center justify-between gap-3 shadow-xs hover:bg-white active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-12 h-12 rounded-xl bg-white overflow-hidden shrink-0 border border-[#E2DED8]/40">
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        {item.brand && (
                          <span className="text-[10px] font-bold text-[#4b6723] uppercase">
                            {item.brand}
                          </span>
                        )}
                        <h4 className="text-xs font-bold text-[#062402] truncate">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-bold text-[#062402]">
                            ৳{item.priceBdt.toLocaleString()}
                          </span>
                          {item.originalPriceBdt && (
                            <span className="text-[10px] text-[#43483f] line-through">
                              ৳{item.originalPriceBdt.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleAddToCart(e, item)}
                      className="w-8 h-8 rounded-full bg-[#062402] text-white flex items-center justify-center shrink-0 active:scale-90 hover:bg-[#1c3a13] transition-all shadow-xs"
                      aria-label="Add to bag"
                    >
                      <span className="material-symbols-outlined text-[17px]">add</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default IOSSearchModalOverlay;
