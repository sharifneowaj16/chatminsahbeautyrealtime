'use client';

import React from 'react';
import FlashDealsTitleGroup from './FlashDealsTitleGroup';
import FlashDealsCountdownPill from './FlashDealsCountdownPill';

interface FlashDealsHeaderProps {
  badgeText?: string;
  title?: string;
  subtitle?: string;
  timerLabel?: string;
  endsAt?: string | Date;
  className?: string;
}

export default function FlashDealsHeader({
  badgeText = 'HIGH DEMAND BATCH DROP',
  title = 'Flash Deals',
  subtitle = 'Strict direct import cost subsidies. Strictly 1 unit per client.',
  timerLabel = 'OFFER CLOSES:',
  endsAt,
  className = '',
}: FlashDealsHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-2 border-b border-emerald-900/40 ${className}`}
    >
      <FlashDealsTitleGroup
        badgeText={badgeText}
        title={title}
        subtitle={subtitle}
      />

      <div className="flex shrink-0 items-center justify-start sm:justify-end">
        <FlashDealsCountdownPill
          endsAt={endsAt}
          label={timerLabel}
        />
      </div>
    </div>
  );
}
