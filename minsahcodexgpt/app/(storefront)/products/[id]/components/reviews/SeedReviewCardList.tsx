"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Star,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { safeImageUrl } from "@/lib/safe-image";

export interface ReviewItem {
  id: string;
  userName: string;
  country?: string;
  rating: number;
  title?: string;
  content: string;
  verified: boolean;
  createdAt: string;
  photos?: string[];
  helpfulCount?: number;
  verifiedPurchaseNote?: string;
}

export interface SeedReviewCardListProps {
  reviews: ReviewItem[];
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onVoteHelpful?: (reviewId: string) => void;
  className?: string;
}

/**
 * Phase 3: Seed.com Member Review Cards & Buyer Photo Lightbox
 * 
 * Exact Computed CSS:
 * - Card Divider: 1px solid #D8D7CF, padding 24px 0
 * - Reviewer Name: 16px font-weight 600 color #1C3A13
 * - Verified Country: 12px color #666666
 * - Amber Stars: #D18E34
 * - Date: 13px color #777777
 * - Body Text: 15px-16px line-height 24px font-weight 400 color #1C3A13
 * - Customer Photo: 76x76px radius 8px border 1px solid #D8D7CF
 */
export function SeedReviewCardList({
  reviews,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onVoteHelpful,
  className = "",
}: SeedReviewCardListProps) {
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [votedReviewIds, setVotedReviewIds] = useState<Set<string>>(new Set());

  const handleVote = (reviewId: string) => {
    if (votedReviewIds.has(reviewId)) return;
    setVotedReviewIds((prev) => new Set([...prev, reviewId]));
    if (onVoteHelpful) {
      onVoteHelpful(reviewId);
    }
  };

  if (!reviews || reviews.length === 0) {
    return (
      <div className="w-full py-16 text-center border-t border-b border-[#D8D7CF]">
        <p className="text-[16px] font-medium text-[#1C3A13] mb-1">
          No reviews match your current filter criteria.
        </p>
        <p className="text-[13px] text-[#1c3a13]/70">
          Try resetting filters or searching with different keywords.
        </p>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-[1120px] mx-auto ${className}`}>
      
      {/* Reviews List */}
      <div className="divide-y divide-[#D8D7CF]">
        {reviews.map((review) => {
          const formattedDate = review.createdAt
            ? new Date(review.createdAt).toLocaleDateString("en-US", {
                month: "2-digit",
                day: "2-digit",
                year: "2-digit",
              })
            : "08/27/26";

          const isVoted = votedReviewIds.has(review.id);
          const currentHelpful = (review.helpfulCount || 0) + (isVoted ? 1 : 0);

          return (
            <div
              key={review.id}
              className="py-6 sm:py-8 flex flex-col space-y-3 transition-colors hover:bg-black/[0.01]"
            >
              {/* Header Row: Reviewer Info + Rating Stars + Date */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                
                {/* Reviewer Name & Verified Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-[15px] sm:text-[16px] font-bold text-[#1C3A13]">
                    {review.userName}
                  </span>
                  {review.country && (
                    <span className="text-[12px] font-normal text-[#666666] uppercase">
                      {review.country}
                    </span>
                  )}
                  {review.verified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2F6D20] bg-[#2F6D20]/8 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Verified Buyer</span>
                    </span>
                  )}
                </div>

                {/* Rating Stars & Published Date */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                          star <= review.rating
                            ? "fill-[#D18E34] text-[#D18E34]"
                            : "text-[#D8D7CF]"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[12px] sm:text-[13px] font-normal text-[#777777]">
                    {formattedDate}
                  </span>
                </div>

              </div>

              {/* Review Title (if exists) */}
              {review.title && (
                <h4 className="text-[15px] font-bold text-[#1C3A13] tracking-tight">
                  {review.title}
                </h4>
              )}

              {/* Review Body Text: Exact 15px/16px line-height 24px color #1C3A13 */}
              <p className="text-[14.5px] sm:text-[15.5px] font-normal text-[#1C3A13] leading-[24px] tracking-normal whitespace-pre-line antialiased">
                {review.content}
              </p>

              {/* Verified Customer Photos Gallery */}
              {review.photos && review.photos.filter((p) => typeof p === 'string' && p.trim() !== '').length > 0 && (
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {review.photos.filter((p) => typeof p === 'string' && p.trim() !== '').map((photoUrl, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setLightboxPhoto(photoUrl)}
                      className="relative w-[72px] h-[72px] sm:w-[76px] sm:h-[76px] rounded-[8px] overflow-hidden border border-[#D8D7CF] hover:border-[#1C3A13] transition-all group shrink-0"
                    >
                      <Image
                        src={safeImageUrl(photoUrl)}
                        alt={`Customer review photo by ${review.userName}`}
                        fill
                        sizes="76px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Review Footer: Helpful Voting */}
              <div className="flex items-center gap-3 pt-1 text-[12px] text-[#777777]">
                <span>Was this review helpful?</span>
                <button
                  type="button"
                  onClick={() => handleVote(review.id)}
                  className={`inline-flex items-center gap-1 font-semibold px-2 py-1 rounded transition-colors ${
                    isVoted
                      ? "text-[#1C3A13] bg-[#EEEDE6]"
                      : "text-gray-600 hover:text-[#1C3A13] hover:bg-gray-100"
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Yes ({currentHelpful})</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PAGINATION BAR
          ───────────────────────────────────────────────────────────── */}
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between pt-8 pb-4 border-t border-[#D8D7CF]">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="inline-flex items-center gap-1 px-4 py-2 bg-white border border-[#D8D7CF] rounded-[2px] text-[13px] font-bold text-[#1C3A13] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#EEEDE6] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-[13px] font-normal text-[#1C3A13]">
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="inline-flex items-center gap-1 px-4 py-2 bg-white border border-[#D8D7CF] rounded-[2px] text-[13px] font-bold text-[#1C3A13] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#EEEDE6] transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          LIGHTBOX MODAL FOR CUSTOMER PHOTOS
          ───────────────────────────────────────────────────────────── */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxPhoto(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative w-[320px] sm:w-[480px] lg:w-[600px] h-[400px] sm:h-[500px]">
              <Image
                src={safeImageUrl(lightboxPhoto)}
                alt="Enlarged customer photo"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default SeedReviewCardList;
