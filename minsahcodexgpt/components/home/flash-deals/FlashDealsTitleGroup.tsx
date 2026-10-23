'use client';

import React from 'react';
import FlashDealsBadge from './FlashDealsBadge';

interface FlashDealsTitleGroupProps {
  badgeText?: string;
  title?: string;
  subtitle?: string;
  className?: string;
}

export default function FlashDealsTitleGroup({
  badgeText = 'HIGH DEMAND BATCH DROP',
  title = 'Flash Deals',
  subtitle = 'Strict direct import cost subsidies. Strictly 1 unit per client.',
  className = '',
}: FlashDealsTitleGroupProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Badge */}
      <FlashDealsBadge label={badgeText} />

      {/* Title */}
      <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight">
        {title}
      </h2>

      {/* Subtitle */}
      {subtitle && (
        <p className="hidden sm:block text-xs lg:text-sm text-emerald-100/70 max-w-xl font-normal leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
