"use client";

import React from "react";
import { PopularSearchTag } from "./types";

interface SearchSpotlightDropdownProps {
  onSelectTag: (query: string) => void;
  recentSearches?: string[];
  onClearRecent?: () => void;
}

const DEFAULT_POPULAR_TAGS: PopularSearchTag[] = [
  { id: "1", label: "Anua Toner", icon: "history", query: "Anua Heartleaf 77 Toner" },
  { id: "2", label: "Laneige Lip Mask", icon: "history", query: "Laneige Lip Sleeping Mask" },
  { id: "3", label: "Centella SPF50", icon: "wb_sunny", query: "Centella Soothing Sunscreen SPF50" },
  { id: "4", label: "COSRX Snail 96", icon: "spa", query: "COSRX Advanced Snail 96 Mucin" },
  { id: "5", label: "Dynasty Cream", icon: "auto_awesome", query: "Beauty of Joseon Dynasty Cream" },
  { id: "6", label: "Dokdo Cleanser", icon: "clean_hands", query: "Round Lab 1025 Dokdo Cleanser" },
];

export function SearchSpotlightDropdown({
  onSelectTag,
  recentSearches = ["Anua Toner", "Laneige Berry", "SPF 50"],
  onClearRecent,
}: SearchSpotlightDropdownProps) {
  return (
    <div className="bg-[#FFFFFF]/98 backdrop-blur-2xl border-b border-[#E2DED8]/60 shadow-xl select-none animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="px-4 py-3.5 flex flex-col gap-3">
        {/* Popular Searches Header */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#43483f] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#4b6723]">
              trending_up
            </span>
            Popular Searches
          </span>
          <span className="text-[10px] text-[#4b6723] font-semibold bg-[#EAF7D8] px-2 py-0.5 rounded-full border border-[#4b6723]/20">
            Verified Authentic Batches
          </span>
        </div>

        {/* Popular Search Tags Carousel / Grid */}
        <div className="flex flex-wrap gap-1.5 pb-1">
          {DEFAULT_POPULAR_TAGS.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => onSelectTag(tag.query)}
              className="px-3 py-1.5 rounded-full bg-[#efeeeb] hover:bg-[#EAF7D8] hover:text-[#1c3a13] text-[#1a1c1a] text-xs font-medium transition-all active:scale-95 flex items-center gap-1 shadow-2xs border border-[#E2DED8]/40"
            >
              <span className="material-symbols-outlined text-[13px] text-[#4b6723]">
                {tag.icon}
              </span>
              <span>{tag.label}</span>
            </button>
          ))}
        </div>

        {/* Recent Searches Section */}
        {recentSearches.length > 0 && (
          <div className="pt-2 border-t border-[#E2DED8]/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#43483f] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">history</span>
                Recent Searches
              </span>
              {onClearRecent && (
                <button
                  type="button"
                  onClick={onClearRecent}
                  className="text-[10px] text-[#ba1a1a] hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="space-y-1">
              {recentSearches.map((term, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectTag(term)}
                  className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-[#efeeeb] text-xs text-[#1a1c1a] flex items-center justify-between group transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[15px] text-[#43483f]">
                      search
                    </span>
                    {term}
                  </span>
                  <span className="material-symbols-outlined text-[14px] text-[#43483f] opacity-0 group-hover:opacity-100 transition-opacity">
                    north_west
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
