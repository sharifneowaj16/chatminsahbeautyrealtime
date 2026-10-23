'use client';

interface ReviewsScrollIndicatorProps {
  totalCount: number;
  activeIndex: number;
}

export function ReviewsScrollIndicator({
  totalCount,
  activeIndex,
}: ReviewsScrollIndicatorProps) {
  return (
    <div className="flex justify-center items-center gap-1.5 mt-3 mb-1">
      {Array.from({ length: totalCount }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === activeIndex
              ? 'w-5 bg-[#4b6723]'
              : 'w-1.5 bg-[#c3c8bc]'
          }`}
        />
      ))}
    </div>
  );
}
