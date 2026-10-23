'use client';

import Image from 'next/image';
import { Star, ShieldCheck } from 'lucide-react';
import { TestimonialReview } from './types';

interface ReviewTestimonialCardProps {
  review: TestimonialReview;
}

export function ReviewTestimonialCard({ review }: ReviewTestimonialCardProps) {
  return (
    <div className="min-w-[280px] w-[280px] shrink-0 rounded-[22px] bg-white p-3.5 shadow-sm border border-[#E2DED8]/70 flex flex-col justify-between gap-2.5 transition-all select-none">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-full ${
                review.initialsBgColor || 'bg-[#28531c]'
              } text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0`}
            >
              {review.initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#1a1c1a] leading-none truncate">
                {review.reviewerName}, {review.reviewerLocation}
              </p>
              <span className="text-[10px] text-[#4b6723] flex items-center gap-0.5 mt-0.5 font-semibold">
                <ShieldCheck className="w-3 h-3 text-[#4b6723]" />
                Verified Buyer • {review.verifiedAgo}
              </span>
            </div>
          </div>

          <div className="flex text-[#4b6723] gap-0.5 shrink-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-3 h-3 fill-[#4b6723]" />
            ))}
          </div>
        </div>

        <p className="text-xs text-[#43483f] italic leading-relaxed line-clamp-3">
          &ldquo;{review.comment}&rdquo;
        </p>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-[#E2DED8]/50 mt-auto">
        <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-[#F8FAF7] border border-[#E2DED8]/40 shrink-0">
          <Image
            src={review.product.image}
            alt={review.product.name}
            fill
            className="object-cover"
            sizes="32px"
          />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[11px] text-[#1a1c1a] truncate block font-bold leading-tight">
            {review.product.name}
          </span>
          <span className="text-[10px] text-[#4b6723] font-medium">
            {review.product.batchNumber}
          </span>
        </div>
      </div>
    </div>
  );
}
