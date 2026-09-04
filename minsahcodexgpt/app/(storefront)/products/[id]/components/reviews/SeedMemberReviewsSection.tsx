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

const DEFAULT_VERIFIED_REVIEWS: ReviewItem[] = [
  {
    id: "rev-1",
    userName: "Joslyn",
    country: "US",
    rating: 5,
    title: "A staple in my morning & night routine",
    content: "This formulation has become an absolute staple in my skincare ritual. It keeps my skin barrier completely calm, hydrated, and eliminates redness after cleansing. I stay consistent and it makes my face feel light, clear, and glowing.",
    verified: true,
    createdAt: "2026-08-27T10:00:00Z",
    photos: [
      "https://images.unsplash.com/photo-1608248597359-009941a54167?auto=format&fit=crop&w=600&q=80",
    ],
    helpfulCount: 38,
  },
  {
    id: "rev-2",
    userName: "Mei-Ling",
    country: "SG",
    rating: 5,
    title: "Remarkable difference in pore clarity & texture",
    content: "Within 2 weeks, the excess sebum on my T-zone was completely stabilized. No breakouts, zero irritation for my sensitive barrier. The texture is lightweight yet deeply replenishing.",
    verified: true,
    createdAt: "2026-08-22T14:30:00Z",
    helpfulCount: 24,
  },
  {
    id: "rev-3",
    userName: "Elena",
    country: "UK",
    rating: 5,
    title: "The glass-skin radiance is 100% real",
    content: "I was skeptical about the 4-week timeline, but it truly delivered that lit-from-within clarity. Fine dryness lines around my smile area have softened noticeably. Reordering my 3rd refill bottle now.",
    verified: true,
    createdAt: "2026-08-15T09:15:00Z",
    photos: [
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80",
    ],
    helpfulCount: 19,
  },
  {
    id: "rev-4",
    userName: "Sophia R.",
    country: "AU",
    rating: 4,
    title: "Great calming effects on sensitive redness",
    content: "Soothed my reactive winter flakiness within the first 7 days. Mild and non-sticky. Only giving 4 stars because shipping took a couple extra days, but product quality is 10/10.",
    verified: true,
    createdAt: "2026-08-08T18:20:00Z",
    helpfulCount: 11,
  },
  {
    id: "rev-5",
    userName: "Aisha M.",
    country: "AE",
    rating: 5,
    title: "Holy grail for barrier repair and hydration",
    content: "Safe for sensitive skin. Layers seamlessly under sunscreen and makeup without any pilling. My skin feels resilient and smooth all day long.",
    verified: true,
    createdAt: "2026-07-29T11:45:00Z",
    helpfulCount: 15,
  },
];

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
  // Base Reviews Pool
  const [reviewsPool, setReviewsPool] = useState<ReviewItem[]>(() => {
    if (customReviews && customReviews.length > 0) return customReviews;
    if (Array.isArray(product.reviews) && product.reviews.length > 0) {
      return product.reviews as unknown as ReviewItem[];
    }
    return DEFAULT_VERIFIED_REVIEWS;
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
  const averageScore = ratingData?.average || product.rating || 4.8;
  const totalReviewsCount = ratingData?.total || (typeof product.reviews === "number" ? product.reviews : reviewsPool.length) || 15307;
  const distributionData = ratingData?.distribution || {
    5: 13486,
    4: 1256,
    3: 338,
    2: 102,
    1: 125,
  };

  return (
    <section
      id="reviews-section"
      aria-label="Member Reviews"
      className={`w-full bg-[#EEEDE6] py-16 sm:py-24 border-t border-[#D8D7CF] ${className}`}
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
        
        {/* Phase 1: Header + 56px Score + 5-Star Distribution Bar Matrix */}
        <SeedMemberReviewsHeader
          title={"Member\nReviews"}
          averageRating={averageScore}
          totalReviews={totalReviewsCount}
          distribution={distributionData}
        />

        {/* Phase 2: Power Review Filters (Search, Topics, Stars, Sort, Write Review) */}
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

        {/* Phase 3: Review Cards List + Lightbox + Pagination */}
        <SeedReviewCardList
          reviews={paginatedReviews}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

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
