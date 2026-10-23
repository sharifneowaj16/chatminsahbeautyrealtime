'use client';

import type { ReactNode } from 'react';
import SectionBadge from './SectionBadge';
import SectionHeadingText from './SectionHeadingText';
import SectionSubtitleText from './SectionSubtitleText';
import SectionActionPill from './SectionActionPill';
import type { SectionIconType } from './SectionBadgeIcon';

interface HomeSectionHeaderProps {
  type?: SectionIconType;
  title: string;
  subtitle?: string | null;
  badgeLabel?: string;
  badgeIcon?: ReactNode;
  href?: string;
  cta?: string;
  showViewAll?: boolean;
  className?: string;
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
}: HomeSectionHeaderProps) {
  return (
    <div className={`mb-5 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="min-w-0 max-w-2xl space-y-1.5">
        <SectionBadge
          type={type}
          label={badgeLabel}
          icon={badgeIcon}
        />
        <SectionHeadingText title={title} />
        <SectionSubtitleText subtitle={subtitle} />
      </div>

      {showViewAll && href && (
        <div className="flex shrink-0 items-center justify-start sm:justify-end pt-1 sm:pt-0">
          <SectionActionPill
            href={href}
            cta={cta}
            title={title}
          />
        </div>
      )}
    </div>
  );
}
