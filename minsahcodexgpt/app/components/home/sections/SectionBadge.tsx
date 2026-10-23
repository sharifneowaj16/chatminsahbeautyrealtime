'use client';

import type { ReactNode } from 'react';
import SectionBadgeIcon, { type SectionIconType } from './SectionBadgeIcon';

interface SectionBadgeProps {
  type: SectionIconType;
  label?: string;
  icon?: ReactNode;
  className?: string;
}

const BADGE_STYLES: Record<SectionIconType, { container: string; iconClass: string; defaultLabel: string }> = {
  'flash-sale': {
    container: 'bg-[#FFF3E8] border-orange-200/80 text-orange-700',
    iconClass: 'text-orange-600 animate-pulse',
    defaultLabel: 'LIMITED TIME OFFERS',
  },
  'new-arrivals': {
    container: 'bg-[#EBF7DA] border-[#D4F6A2] text-[#1c3a13]',
    iconClass: 'text-[#1c3a13]',
    defaultLabel: 'JUST LANDED',
  },
  'for-you': {
    container: 'bg-emerald-50 border-emerald-200/80 text-emerald-800',
    iconClass: 'text-emerald-700',
    defaultLabel: 'CURATED FOR YOU',
  },
  'recommendations': {
    container: 'bg-amber-50 border-amber-200/80 text-amber-900',
    iconClass: 'text-amber-600 fill-amber-500',
    defaultLabel: 'TOP RATED SELECTION',
  },
  'favourites': {
    container: 'bg-[#F2F6ED] border-[#D8E6CC] text-[#1c3a13]',
    iconClass: 'text-[#1c3a13]',
    defaultLabel: 'MOST LOVED / BESTSELLERS',
  },
  'custom': {
    container: 'bg-stone-100 border-stone-200 text-stone-800',
    iconClass: 'text-stone-700',
    defaultLabel: 'FEATURED',
  },
};

export default function SectionBadge({
  type,
  label,
  icon,
  className = '',
}: SectionBadgeProps) {
  const style = BADGE_STYLES[type] || BADGE_STYLES['custom'];
  const displayLabel = label || style.defaultLabel;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase transition-colors shadow-2xs select-none ${style.container} ${className}`}
    >
      <SectionBadgeIcon type={type} customIcon={icon} size={12} className={style.iconClass} />
      <span>{displayLabel}</span>
    </span>
  );
}
