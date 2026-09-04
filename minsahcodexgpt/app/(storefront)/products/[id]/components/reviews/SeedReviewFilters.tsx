"use client";

import React, { useState } from "react";
import {
  Search,
  X,
  SlidersHorizontal,
  Camera,
  Star,
  ChevronDown,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export type ReviewSortOption =
  | "highest_rating"
  | "lowest_rating"
  | "most_recent"
  | "with_photos";

export interface SeedReviewFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTopic: string | null;
  onTopicSelect: (topic: string | null) => void;
  selectedRating: number | null;
  onRatingSelect: (rating: number | null) => void;
  onlyWithPhotos: boolean;
  onTogglePhotosOnly: () => void;
  sortBy: ReviewSortOption;
  onSortChange: (sort: ReviewSortOption) => void;
  totalFilteredCount?: number;
  onResetFilters: () => void;
  onOpenWriteReview?: () => void;
  customTopics?: string[];
  className?: string;
}

const DEFAULT_POPULAR_TOPICS = [
  "smell",
  "weight",
  "improvement",
  "issues",
  "skin",
  "design",
  "results",
  "price",
  "texture",
  "hydration",
  "glow",
  "absorption",
  "sensitive",
];

const SORT_LABELS: Record<ReviewSortOption, string> = {
  highest_rating: "Highest rating",
  lowest_rating: "Lowest rating",
  most_recent: "Most recent",
  with_photos: "With customer photos",
};

/**
 * Phase 2: Seed.com Power Review Filters
 * 
 * Features:
 * - Search bar with instant real-time clearing.
 * - Exact Seed computed CSS popular topic chips (#FFFFFF bg, #D8D7CF border, #1C3A13 text, active dark fill).
 * - "Show more" / "Show less" topics expander.
 * - 1★ to 5★ quick filter pills.
 * - Customer Photos Only filter chip.
 * - Sort dropdown ("Highest rating", "Most recent", "With photos", etc.).
 * - 1-Click "Write a Review" button trigger.
 * - Active filter tags with 1-click Reset button.
 */
export function SeedReviewFilters({
  searchQuery,
  onSearchChange,
  selectedTopic,
  onTopicSelect,
  selectedRating,
  onRatingSelect,
  onlyWithPhotos,
  onTogglePhotosOnly,
  sortBy,
  onSortChange,
  totalFilteredCount,
  onResetFilters,
  onOpenWriteReview,
  customTopics,
  className = "",
}: SeedReviewFiltersProps) {
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  const topicsList = customTopics && customTopics.length > 0 ? customTopics : DEFAULT_POPULAR_TOPICS;
  const visibleTopics = showAllTopics ? topicsList : topicsList.slice(0, 8);

  const hasActiveFilters = Boolean(
    searchQuery.trim().length > 0 ||
      selectedTopic !== null ||
      selectedRating !== null ||
      onlyWithPhotos ||
      sortBy !== "highest_rating"
  );

  return (
    <div className={`w-full max-w-[1120px] mx-auto space-y-6 ${className}`}>
      
      {/* ─────────────────────────────────────────────────────────────
          1. TOP ROW: SEARCH BAR & WRITE A REVIEW CTA
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        
        {/* Exact Seed Search Bar: 44px height, #FFFFFF bg, #D8D7CF border, 2px radius */}
        <div className="relative flex-1 max-w-[420px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#767676] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search reviews (e.g. glass skin, redness, scent)..."
            className="w-full h-[44px] pl-10 pr-10 bg-white border border-[#D8D7CF] focus:border-[#1C3A13] rounded-[2px] text-[14px] text-[#1C3A13] placeholder-[#767676] outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-100 text-gray-500 hover:text-black flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Right Action: Write a Review Button */}
        {onOpenWriteReview && (
          <button
            type="button"
            onClick={onOpenWriteReview}
            className="h-[44px] px-6 bg-[#1C3A13] hover:bg-[#12280C] text-[#FCFCF7] text-[13.5px] font-bold tracking-wider uppercase rounded-[2px] transition-all flex items-center justify-center gap-2 shadow-xs shrink-0 active:scale-98"
          >
            <span>✍️ Write a Review</span>
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. POPULAR TOPICS CHIPS (Exact Seed.com Spec)
          ───────────────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[15px] sm:text-[16px] font-medium text-[#1C3A13]">
            Popular topics
          </span>
          {typeof totalFilteredCount === "number" && (
            <span className="text-[12px] text-[#1C3A13]/70 font-normal">
              Showing {totalFilteredCount} matching review{totalFilteredCount === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {visibleTopics.map((topic) => {
            const isSelected = selectedTopic === topic;

            return (
              <button
                key={topic}
                type="button"
                onClick={() => onTopicSelect(isSelected ? null : topic)}
                className={`h-[34px] px-3.5 rounded-[2px] text-[13px] font-normal border transition-all ${
                  isSelected
                    ? "bg-[#1C3A13] text-white border-[#1C3A13] shadow-xs"
                    : "bg-white text-[#1C3A13] border-[#D8D7CF] hover:border-[#1C3A13]"
                }`}
              >
                {topic}
              </button>
            );
          })}

          {/* "Show more" / "Show less" text toggle */}
          {topicsList.length > 8 && (
            <button
              type="button"
              onClick={() => setShowAllTopics(!showAllTopics)}
              className="text-[13px] font-bold text-[#1C3A13] underline underline-offset-2 px-2 hover:text-[#2F6D20]"
            >
              {showAllTopics ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. POWER CONTROLS: STAR RATING PILLS + PHOTOS ONLY + SORT BY
          ───────────────────────────────────────────────────────────── */}
      <div className="pt-2 border-t border-[#D8D7CF]/60 flex flex-wrap items-center justify-between gap-4">
        
        {/* Left: Star Filter Pills & Photo Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Star Filter Pills */}
          <div className="flex items-center bg-white border border-[#D8D7CF] rounded-[2px] p-0.5">
            <button
              type="button"
              onClick={() => onRatingSelect(null)}
              className={`px-3 py-1 text-[12px] font-medium rounded-[2px] transition-colors ${
                selectedRating === null
                  ? "bg-[#1C3A13] text-white"
                  : "text-[#1C3A13] hover:bg-gray-100"
              }`}
            >
              All Stars
            </button>

            {[5, 4, 3, 2, 1].map((stars) => (
              <button
                key={stars}
                type="button"
                onClick={() => onRatingSelect(selectedRating === stars ? null : stars)}
                className={`px-2.5 py-1 text-[12px] font-medium rounded-[2px] flex items-center gap-1 transition-colors ${
                  selectedRating === stars
                    ? "bg-[#1C3A13] text-white"
                    : "text-[#1C3A13] hover:bg-gray-100"
                }`}
              >
                <span>{stars}</span>
                <Star
                  className={`w-3 h-3 ${
                    selectedRating === stars
                      ? "fill-white text-white"
                      : "fill-[#D18E34] text-[#D18E34]"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* With Photos Only Chip */}
          <button
            type="button"
            onClick={onTogglePhotosOnly}
            className={`h-[32px] px-3 rounded-[2px] text-[12px] font-medium border flex items-center gap-1.5 transition-all ${
              onlyWithPhotos
                ? "bg-[#1C3A13] text-white border-[#1C3A13]"
                : "bg-white text-[#1C3A13] border-[#D8D7CF] hover:border-[#1C3A13]"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>With Photos Only</span>
          </button>
        </div>

        {/* Right: Sort By Dropdown */}
        <div className="relative">
          <div className="flex items-center gap-1 text-[13.5px] text-[#1C3A13]">
            <span className="text-[#1C3A13]/70 font-normal">Sort by:</span>
            <button
              type="button"
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="font-bold underline underline-offset-4 flex items-center gap-1 hover:text-[#2F6D20] cursor-pointer"
            >
              <span>{SORT_LABELS[sortBy]}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Sort Dropdown Menu */}
          {isSortDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-[#D8D7CF] shadow-lg rounded-[4px] py-1.5 z-30">
              {(Object.keys(SORT_LABELS) as ReviewSortOption[]).map((optionKey) => (
                <button
                  key={optionKey}
                  type="button"
                  onClick={() => {
                    onSortChange(optionKey);
                    setIsSortDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-xs sm:text-[13px] flex items-center justify-between hover:bg-[#EEEDE6] transition-colors ${
                    sortBy === optionKey
                      ? "font-bold text-[#1C3A13] bg-[#EEEDE6]/50"
                      : "font-normal text-gray-700"
                  }`}
                >
                  <span>{SORT_LABELS[optionKey]}</span>
                  {sortBy === optionKey && <Check className="w-3.5 h-3.5 text-[#1C3A13]" />}
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. ACTIVE FILTER TAGS ROW & CLEAR ALL TRIGGER
          ───────────────────────────────────────────────────────────── */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1 bg-[#F8F9F7] p-2.5 rounded-[4px] border border-[#D8D7CF]/60">
          <span className="text-xs font-bold text-[#1C3A13] uppercase tracking-wider">
            Active Filters:
          </span>

          {searchQuery && (
            <span className="inline-flex items-center gap-1 bg-white border border-[#D8D7CF] px-2 py-0.5 rounded text-xs text-[#1C3A13]">
              Keyword: &quot;{searchQuery}&quot;
              <button type="button" onClick={() => onSearchChange("")} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedTopic && (
            <span className="inline-flex items-center gap-1 bg-white border border-[#D8D7CF] px-2 py-0.5 rounded text-xs text-[#1C3A13]">
              Topic: #{selectedTopic}
              <button type="button" onClick={() => onTopicSelect(null)} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedRating !== null && (
            <span className="inline-flex items-center gap-1 bg-white border border-[#D8D7CF] px-2 py-0.5 rounded text-xs text-[#1C3A13]">
              Rating: {selectedRating} ★
              <button type="button" onClick={() => onRatingSelect(null)} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {onlyWithPhotos && (
            <span className="inline-flex items-center gap-1 bg-white border border-[#D8D7CF] px-2 py-0.5 rounded text-xs text-[#1C3A13]">
              📸 Photos Only
              <button type="button" onClick={onTogglePhotosOnly} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={onResetFilters}
            className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-800 underline underline-offset-2"
          >
            <RotateCcw className="w-3 h-3" /> Reset All
          </button>
        </div>
      )}

    </div>
  );
}

export default SeedReviewFilters;
