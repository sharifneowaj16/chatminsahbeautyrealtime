"use client";

import React, { useState, useMemo } from "react";
import SeedMemberReviewsHeader, {
  RatingDistribution,
} from "./SeedMemberReviewsHeader";
import SeedReviewFilters, { ReviewSortOption } from "./SeedReviewFilters";
import SeedReviewCardList, { ReviewItem } from "./SeedReviewCardList";
import SeedReviewWriteModal, { NewReviewSubmission } from "./SeedReviewWriteModal";

export interface SeedMemberReviewsSectionProps {
  product: {
    id?: string;
    name: string;
    rating?: number;
    reviews?: number | ReviewItem[];
    reviewsCount?: number;
  };
  ratingData?: {
    average: number;
    total: number;
    distribution: Record<number, number>;
  };
  customReviews?: ReviewItem[];
  className?: string;
}

const ITEMS_PER_PAGE = 5;

/**
 * Phase 5: Master Seed-Style Member Reviews Section
 * 
 * Features:
 * - Canvas Background: #EEEDE6 (Seed Signature Cream)
 * - Phase 1: Header + 56px Score + 5-Star Progress Distribution Bars
 * - Phase 2: Search Bar + Topic Chips + Star Rating Filters + Photo Toggle + Sort Dropdown
 * - Phase 3: Review Cards + Customer Photos + Lightbox Modal + Helpful Voting + Pagination
 * - Phase 4: "Write a Review" Modal with Star Selector and Photo Upload
 */
export function SeedMemberReviewsSection({
  product,
  ratingData,
  customReviews,
  className = "",
}: SeedMemberReviewsSectionProps) {
  // Base Reviews Pool (authentic data only)
  const [reviewsPool, setReviewsPool] = useState<ReviewItem[]>(() => {
    if (customReviews && customReviews.length > 0) return customReviews;
    if (Array.isArray(product.reviews) && product.reviews.length > 0) {
      return product.reviews as unknown as ReviewItem[];
    }
    return [];
  });

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [onlyWithPhotos, setOnlyWithPhotos] = useState(false);
  const [sortBy, setSortBy] = useState<ReviewSortOption>("highest_rating");
  const [currentPage, setCurrentPage] = useState(1);
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);

  // Filter & Sort Pipeline
  const filteredAndSortedReviews = useMemo(() => {
    let result = [...reviewsPool];

    // 1. Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.userName.toLowerCase().includes(q) ||
          (r.title && r.title.toLowerCase().includes(q)) ||
          r.content.toLowerCase().includes(q)
      );
    }

    // 2. Topic filter
    if (selectedTopic) {
      const topicLower = selectedTopic.toLowerCase();
      result = result.filter(
        (r) =>
          (r.title && r.title.toLowerCase().includes(topicLower)) ||
          r.content.toLowerCase().includes(topicLower)
      );
    }

    // 3. Star rating filter
    if (selectedRating !== null) {
      result = result.filter((r) => r.rating === selectedRating);
    }

    // 4. Photos only filter
    if (onlyWithPhotos) {
      result = result.filter((r) => r.photos && r.photos.length > 0);
    }

    // 5. Sorting
    result.sort((a, b) => {
      if (sortBy === "highest_rating") return b.rating - a.rating;
      if (sortBy === "lowest_rating") return a.rating - b.rating;
      if (sortBy === "with_photos") {
        const aHas = (a.photos?.length || 0) > 0 ? 1 : 0;
        const bHas = (b.photos?.length || 0) > 0 ? 1 : 0;
        return bHas - aHas;
      }
      if (sortBy === "most_recent") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

    return result;
  }, [reviewsPool, searchQuery, selectedTopic, selectedRating, onlyWithPhotos, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredAndSortedReviews.length / ITEMS_PER_PAGE) || 1;
  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedReviews.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSortedReviews, currentPage]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedTopic(null);
    setSelectedRating(null);
    setOnlyWithPhotos(false);
    setSortBy("highest_rating");
    setCurrentPage(1);
  };

  // Handle new review submission
  const handleNewReviewSubmit = (newRev: NewReviewSubmission) => {
    const created: ReviewItem = {
      id: `rev-${Date.now()}`,
      userName: newRev.userName,
      country: "BD",
      rating: newRev.rating,
      title: newRev.title,
      content: newRev.content,
      verified: true,
      createdAt: new Date().toISOString(),
      photos: newRev.photoUrls,
      helpfulCount: 0,
    };
    setReviewsPool((prev) => [created, ...prev]);
  };

  // Resolved Rating Data
  const averageScore = ratingData?.average ?? product.rating ?? 0;
  const totalReviewsCount = ratingData?.total != null ? ratingData.total : (typeof product.reviews === "number" ? product.reviews : reviewsPool.length);
  const distributionData = ratingData?.distribution || {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  return (
    <section
      id="reviews-section"
      aria-label="Member Reviews"
      className={`w-full bg-[#EEEDE6] py-16 sm:py-24 border-t border-[#D8D7CF] ${className}`}
    >
      <div className="w-full max-w-[1440px] mx-auto px-4 lg:px-8 space-y-8 sm:space-y-12">
        
        {/* Phase 1: Header + 56px Score + 5-Star Distribution Bar Matrix */}
        <SeedMemberReviewsHeader
          title={"Customer\nReviews"}
          averageRating={averageScore}
          totalReviews={totalReviewsCount}
          distribution={distributionData}
        />

        {/* Phase 2: Power Review Filters (Search, Topics, Stars, Sort, Write Review) */}
        {reviewsPool.length > 0 && (
          <SeedReviewFilters
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setCurrentPage(1);
            }}
            selectedTopic={selectedTopic}
            onTopicSelect={(topic) => {
              setSelectedTopic(topic);
              setCurrentPage(1);
            }}
            selectedRating={selectedRating}
            onRatingSelect={(rating) => {
              setSelectedRating(rating);
              setCurrentPage(1);
            }}
            onlyWithPhotos={onlyWithPhotos}
            onTogglePhotosOnly={() => {
              setOnlyWithPhotos(!onlyWithPhotos);
              setCurrentPage(1);
            }}
            sortBy={sortBy}
            onSortChange={(sort) => {
              setSortBy(sort);
              setCurrentPage(1);
            }}
            totalFilteredCount={filteredAndSortedReviews.length}
            onResetFilters={handleResetFilters}
            onOpenWriteReview={() => setIsWriteModalOpen(true)}
          />
        )}

        {/* Phase 3: Review Cards List or Zero State */}
        {reviewsPool.length === 0 ? (
          <div className="rounded-2xl border border-[#1C3A13]/10 bg-white/80 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#1C3A13]/5 text-amber-500 mb-4 text-xl">
              ★
            </div>
            <h3 className="text-lg font-bold text-[#1C3A13] mb-1.5">No reviews yet for this product</h3>
            <p className="text-xs sm:text-sm text-stone-500 mb-6">
              Have you tried this product? Share your thoughts to help other members make the right choice.
            </p>
            <button
              type="button"
              onClick={() => setIsWriteModalOpen(true)}
              className="inline-flex items-center justify-center rounded-full bg-[#1C3A13] hover:bg-[#28521c] text-white px-6 py-2.5 text-xs sm:text-sm font-semibold shadow-xs transition"
            >
              Write the First Review
            </button>
          </div>
        ) : (
          <SeedReviewCardList
            reviews={paginatedReviews}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}

      </div>

      {/* Phase 4: Write a Review Modal */}
      <SeedReviewWriteModal
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        productName={product.name || "this formulation"}
        onSubmitReview={handleNewReviewSubmit}
      />
    </section>
  );
}

export default SeedMemberReviewsSection;
