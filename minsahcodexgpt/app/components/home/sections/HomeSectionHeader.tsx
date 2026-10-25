'use client';

import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import SectionBadge from './SectionBadge';
import SectionHeadingText from './SectionHeadingText';
import SectionSubtitleText from './SectionSubtitleText';
import SectionActionPill from './SectionActionPill';
import type { SectionIconType } from './SectionBadgeIcon';

interface HomeSectionHeaderProps {
  type?: SectionIconType;
  title?: string;
  subtitle?: string | null;
  badgeLabel?: string;
  badgeIcon?: ReactNode;
  href?: string;
  cta?: string;
  showViewAll?: boolean;
  className?: string;
  showArrows?: boolean;
  hideTitle?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  canScrollPrev?: boolean;
  canScrollNext?: boolean;
}

export default function HomeSectionHeader({
  type = 'custom',
  title,
  subtitle,
  badgeLabel,
  badgeIcon,
  href,
  cta = 'View all',
  showViewAll = true,
  className = '',
  showArrows = false,
  hideTitle = true,
  onPrev,
  onNext,
  canScrollPrev = false,
  canScrollNext = true,
}: HomeSectionHeaderProps) {
  // If carousel arrows are enabled and title is hidden (Fenty Beauty minimal style)
  if (showArrows && hideTitle) {
    return (
      <div className={`mb-1.5 sm:mb-2 flex items-center justify-end ${className}`}>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canScrollPrev}
            aria-label="Previous products"
            className="p-1 text-stone-500 hover:text-stone-900 transition-colors disabled:opacity-20 disabled:pointer-events-none active:scale-90"
          >
            <ArrowLeft className="h-4 w-4 sm:h-[18px] sm:w-[18px] stroke-[1.5]" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canScrollNext}
            aria-label="Next products"
            className="p-1 text-stone-500 hover:text-stone-900 transition-colors disabled:opacity-20 disabled:pointer-events-none active:scale-90"
          >
            <ArrowRight className="h-4 w-4 sm:h-[18px] sm:w-[18px] stroke-[1.5]" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`mb-3 sm:mb-4 flex items-end justify-between gap-3 ${className}`}>
      <div className="min-w-0 max-w-2xl">
        {title && <SectionHeadingText title={title} />}
      </div>

      {showArrows ? (
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canScrollPrev}
            aria-label="Previous products"
            className="p-1 text-stone-500 hover:text-stone-900 transition-colors disabled:opacity-20 disabled:pointer-events-none active:scale-90"
          >
            <ArrowLeft className="h-4 w-4 sm:h-[18px] sm:w-[18px] stroke-[1.5]" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canScrollNext}
            aria-label="Next products"
            className="p-1 text-stone-500 hover:text-stone-900 transition-colors disabled:opacity-20 disabled:pointer-events-none active:scale-90"
          >
            <ArrowRight className="h-4 w-4 sm:h-[18px] sm:w-[18px] stroke-[1.5]" />
          </button>
        </div>
      ) : (
        showViewAll && href && (
          <div className="flex shrink-0 items-center justify-start sm:justify-end pt-1 sm:pt-0">
            <SectionActionPill
              href={href}
              cta={cta}
              title={title || ''}
            />
          </div>
        )
      )}
    </div>
  );
}
