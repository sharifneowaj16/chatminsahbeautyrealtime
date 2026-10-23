'use client';

import React from 'react';
import type { FlashDealsConfig } from './types';
import { DEFAULT_FLASH_DEALS_CONFIG } from './types';
import FlashDealsCardWrapper from './FlashDealsCardWrapper';
import FlashDealsHeader from './FlashDealsHeader';
import DesktopFlashDealsGrid from './DesktopFlashDealsGrid';
import MobileFlashDealsList from './MobileFlashDealsList';

interface FlashDealsSectionProps {
  config?: FlashDealsConfig | null;
  className?: string;
}

export default function FlashDealsSection({
  config,
  className = '',
}: FlashDealsSectionProps) {
  const activeConfig = config || DEFAULT_FLASH_DEALS_CONFIG;

  if (!activeConfig.isVisible) return null;

  const deals = activeConfig.items || [];
  if (deals.length === 0) return null;

  return (
    <section className={`w-full px-4 lg:px-8 py-3 sm:py-5 ${className}`}>
      <FlashDealsCardWrapper>
        {/* Header with Title, Badge & Live Countdown */}
        <FlashDealsHeader
          badgeText={activeConfig.badgeText}
          title={activeConfig.title}
          subtitle={activeConfig.subtitle}
          timerLabel={activeConfig.timerLabel}
          endsAt={activeConfig.endsAt}
        />

        {/* Desktop View: 5-Column Grid */}
        <DesktopFlashDealsGrid deals={deals} />

        {/* Mobile View: Vertical Scroll List with Custom Scrollbar */}
        <MobileFlashDealsList deals={deals} />
      </FlashDealsCardWrapper>
    </section>
  );
}
