'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Star } from 'lucide-react';
import { ReviewTestimonialCard } from './ReviewTestimonialCard';
import { ReviewsScrollIndicator } from './ReviewsScrollIndicator';
import { TestimonialReview } from './types';

const DEFAULT_REVIEWS: TestimonialReview[] = [
  {
    id: 'rev-1',
    reviewerName: 'Nusrat M.',
    reviewerLocation: 'Gulshan-2',
    initials: 'NM',
    initialsBgColor: 'bg-[#28531c]',
    verifiedAgo: '2 days ago',
    rating: 5,
    comment:
      'The Anua toner and Laneige mask arrived in under 24 hours in Dhaka! Authenticity QR verified directly with Korea. My skin barrier has never been this calm in summer.',
    product: {
      name: 'Laneige Lip Mask (20g)',
      batchNumber: 'Verified Batch #KR84',
      image: '/images/products/laneige-lip.png',
    },
  },
  {
    id: 'rev-2',
    reviewerName: 'Farhan R.',
    reviewerLocation: 'Banani',
    initials: 'FR',
    initialsBgColor: 'bg-[#4b6723]',
    verifiedAgo: '4 days ago',
    rating: 5,
    comment:
      'Zero white cast in Dhaka’s intense humidity. The Arisol Sun Relief feels like weightless water on skin. Express delivery dispatched spotless with cool packaging!',
    product: {
      name: 'Arisol Sun Relief SPF50',
      batchNumber: 'Verified Batch #AR32',
      image: '/images/products/sun-relief.png',
    },
  },
  {
    id: 'rev-3',
    reviewerName: 'Samira K.',
    reviewerLocation: 'Dhanmondi',
    initials: 'SK',
    initialsBgColor: 'bg-[#28531c]',
    verifiedAgo: '1 week ago',
    rating: 5,
    comment:
      'Reduces active redness within two days. The Heartleaf formula cleared my fungal breakout so fast. Truly Korean direct batches, huge difference from local copies.',
    product: {
      name: 'Anua Heartleaf 77% Toner',
      batchNumber: 'Verified Batch #AN09',
      image: '/images/products/anua-toner.png',
    },
  },
  {
    id: 'rev-4',
    reviewerName: 'Tanzila H.',
    reviewerLocation: 'Uttara-4',
    initials: 'TH',
    initialsBgColor: 'bg-[#4b6723]',
    verifiedAgo: '5 days ago',
    rating: 5,
    comment:
      'The dewy glass glow from Elixir serum lasts through AC room dryness all day long. Customer care answered in minutes on WhatsApp. 10/10 service!',
    product: {
      name: 'Elixir Vital Glow Serum',
      batchNumber: 'Verified Batch #EL51',
      image: '/images/products/elixir-serum.png',
    },
  },
];

interface ReviewsAutoScrollSectionProps {
  reviews?: TestimonialReview[];
}

export function ReviewsAutoScrollSection({
  reviews = DEFAULT_REVIEWS,
}: ReviewsAutoScrollSectionProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateActiveIndex = useCallback(() => {
    if (!carouselRef.current) return;
    const cardWidth = 280 + 12;
    const idx = Math.round(carouselRef.current.scrollLeft / cardWidth) % reviews.length;
    setActiveIndex(idx);
  }, [reviews.length]);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    let isDown = false;
    let startX = 0;
    let scrollStart = 0;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;
    let momentumRafId: number | null = null;
    let isPaused = false;
    let animationFrameId: number;

    const autoScrollSpeed = 0.5;

    function autoScrollLoop() {
      if (!isDown && !isPaused && carousel) {
        carousel.scrollLeft += autoScrollSpeed;
        if (carousel.scrollLeft >= carousel.scrollWidth - carousel.clientWidth - 1) {
          carousel.scrollLeft = 0;
        }
        updateActiveIndex();
      }
      animationFrameId = requestAnimationFrame(autoScrollLoop);
    }

    animationFrameId = requestAnimationFrame(autoScrollLoop);

    const onMouseEnter = () => {
      isPaused = true;
    };
    const onMouseLeave = () => {
      if (!isDown) isPaused = false;
    };

    function handleStart(pageX: number) {
      isDown = true;
      isPaused = true;
      if (momentumRafId) cancelAnimationFrame(momentumRafId);
      startX = pageX;
      scrollStart = carousel?.scrollLeft || 0;
      lastX = pageX;
      lastTime = Date.now();
      velocity = 0;
    }

    function handleMove(pageX: number) {
      if (!isDown || !carousel) return;
      const currentX = pageX;
      const currentTime = Date.now();
      const deltaX = currentX - lastX;
      const deltaTime = Math.max(currentTime - lastTime, 1);
      velocity = deltaX / deltaTime;

      carousel.scrollLeft -= deltaX;
      lastX = currentX;
      lastTime = currentTime;
      updateActiveIndex();
    }

    function handleEnd() {
      if (!isDown || !carousel) return;
      isDown = false;

      let currentVelocity = velocity * 15;
      const friction = 0.94;

      function applyMomentum() {
        if (!carousel) return;
        if (Math.abs(currentVelocity) > 0.4 && !isDown) {
          carousel.scrollLeft -= currentVelocity;
          currentVelocity *= friction;
          updateActiveIndex();
          momentumRafId = requestAnimationFrame(applyMomentum);
        } else {
          isPaused = false;
        }
      }

      if (Math.abs(currentVelocity) > 1) {
        momentumRafId = requestAnimationFrame(applyMomentum);
      } else {
        isPaused = false;
      }
    }

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      handleStart(e.pageX);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (isDown) {
        e.preventDefault();
        handleMove(e.pageX);
      }
    };
    const onMouseUp = () => {
      if (isDown) handleEnd();
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleStart(e.touches[0].pageX);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDown && e.touches.length === 1) {
        handleMove(e.touches[0].pageX);
      }
    };
    const onTouchEnd = () => {
      handleEnd();
    };

    carousel.addEventListener('mouseenter', onMouseEnter);
    carousel.addEventListener('mouseleave', onMouseLeave);
    carousel.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    carousel.addEventListener('touchstart', onTouchStart, { passive: true });
    carousel.addEventListener('touchmove', onTouchMove, { passive: true });
    carousel.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (momentumRafId) cancelAnimationFrame(momentumRafId);
      carousel.removeEventListener('mouseenter', onMouseEnter);
      carousel.removeEventListener('mouseleave', onMouseLeave);
      carousel.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      carousel.removeEventListener('touchstart', onTouchStart);
      carousel.removeEventListener('touchmove', onTouchMove);
      carousel.removeEventListener('touchend', onTouchEnd);
    };
  }, [updateActiveIndex]);

  return (
    <section className="px-4 py-3">
      <div className="rounded-[24px] bg-[#F8FAF7] p-4 shadow-sm border border-[#E2DED8]/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#4b6723] font-bold">
              Real Dhaka Reviews
            </span>
            <h3 className="text-xl text-[#062402] font-bold tracking-tight">
              Customer Reviews
            </h3>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EAF7D8] text-[#516d29] text-xs font-bold shadow-sm">
            <Star className="w-3.5 h-3.5 fill-[#516d29]" />
            <span>4.92 / 5.0</span>
          </div>
        </div>

        {/* Carousel Container */}
        <div
          ref={carouselRef}
          className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth cursor-grab active:cursor-grabbing select-none -mx-1 px-1 py-1"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {reviews.map((rev) => (
            <ReviewTestimonialCard key={rev.id} review={rev} />
          ))}
        </div>

        {/* Indicator Dots */}
        <ReviewsScrollIndicator
          totalCount={reviews.length}
          activeIndex={activeIndex}
        />
      </div>
    </section>
  );
}
