"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { IOSSmoothSearchBar } from "./IOSSmoothSearchBar";
import { SearchSpotlightDropdown } from "./SearchSpotlightDropdown";
import { SearchKeyboardNavHandler } from "./SearchKeyboardNavHandler";
import { SearchResultItem } from "./types";

const MOCK_SEARCH_RESULTS: SearchResultItem[] = [
  {
    id: "item-1",
    name: "Anua Heartleaf 77% Soothing Toner",
    brand: "Anua Korea",
    priceBdt: 2100,
    originalPriceBdt: 2400,
    rating: 5.0,
    imageUrl:
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80",
    category: "Toners",
  },
  {
    id: "item-2",
    name: "Laneige Lip Sleeping Mask Berry",
    brand: "Laneige",
    priceBdt: 1720,
    originalPriceBdt: 2100,
    rating: 4.9,
    imageUrl:
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=200&q=80",
    category: "Lip Care",
  },
  {
    id: "item-3",
    name: "COSRX Advanced Snail 96 Mucin Power Essence",
    brand: "COSRX",
    priceBdt: 1890,
    originalPriceBdt: 2200,
    rating: 5.0,
    imageUrl:
      "https://images.unsplash.com/photo-1608248597359-2c6b4d326efc?auto=format&fit=crop&w=200&q=80",
    category: "Essence & Serums",
  },
  {
    id: "item-4",
    name: "Beauty of Joseon Dynasty Cream",
    brand: "Beauty of Joseon",
    priceBdt: 1990,
    originalPriceBdt: 2350,
    rating: 4.8,
    imageUrl:
      "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=200&q=80",
    category: "Moisturizers",
  },
];

interface IOSSearchModalOverlayProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function IOSSearchModalOverlay({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
}: IOSSearchModalOverlayProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState([
    "Anua Toner",
    "Laneige Berry",
    "SPF 50",
  ]);

  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

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
  };

  const handleSelectTag = (selected: string) => {
    setQuery(selected);
    if (!recentSearches.includes(selected)) {
      setRecentSearches([selected, ...recentSearches.slice(0, 4)]);
    }
  };

  const handleAddToCart = (item: SearchResultItem) => {
    window.dispatchEvent(
      new CustomEvent("cart:add-item", {
        detail: {
          id: item.id,
          name: item.name,
          price: item.priceBdt,
          image: item.imageUrl,
          quantity: 1,
        },
      })
    );
    alert(`Added ${item.name} to bag!`);
  };

  if (!isModalOpen) return null;

  const filteredResults = query.trim()
    ? MOCK_SEARCH_RESULTS.filter(
        (item) =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.brand.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-start">
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
          if (query.trim() && !recentSearches.includes(query.trim())) {
            setRecentSearches([query.trim(), ...recentSearches.slice(0, 4)]);
          }
        }}
      />

      {/* Backdrop */}
      <div
        className="fixed inset-0 top-16 bg-[#062402]/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Dropdown Container */}
      <div className="relative z-10 max-h-[85vh] overflow-y-auto no-scrollbar">
        {/* Spotlight Trend Tags (shows when query is short) */}
        {!query.trim() && (
          <SearchSpotlightDropdown
            onSelectTag={handleSelectTag}
            recentSearches={recentSearches}
            onClearRecent={() => setRecentSearches([])}
          />
        )}

        {/* Live Search Results (shows when query is typed) */}
        {query.trim().length > 0 && (
          <div className="bg-[#FFFFFF]/98 backdrop-blur-2xl border-b border-[#E2DED8]/60 p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#062402]">
                Search Results ({filteredResults.length})
              </span>
              <span className="text-[10px] text-[#4b6723] font-semibold bg-[#EAF7D8] px-2 py-0.5 rounded-full border border-[#4b6723]/20">
                100% Authentic Korean Stock
              </span>
            </div>

            {filteredResults.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <span className="material-symbols-outlined text-4xl text-[#43483f]">
                  manage_search
                </span>
                <p className="text-xs font-semibold text-[#181C1A]">
                  No exact matches found for &quot;{query}&quot;
                </p>
                <p className="text-[11px] text-[#43483f]">
                  Try searching for &quot;Anua&quot;, &quot;Laneige&quot;, or &quot;Sunscreen&quot;
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredResults.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-2xl bg-[#F8FAF7] border border-[#E2DED8]/60 flex items-center justify-between gap-3 shadow-xs hover:bg-white transition-colors"
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
                        <span className="text-[10px] font-bold text-[#4b6723] uppercase">
                          {item.brand}
                        </span>
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
                          <span className="text-[10px] text-[#4b6723] font-semibold flex items-center gap-0.5 ml-1">
                            <span className="material-symbols-outlined text-[12px]">star</span>
                            {item.rating}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddToCart(item)}
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
