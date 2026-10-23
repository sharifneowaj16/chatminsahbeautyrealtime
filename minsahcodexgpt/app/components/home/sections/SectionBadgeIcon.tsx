'use client';

import { Flame, Sparkles, Target, Star, Trophy, Zap, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type SectionIconType = 'flash-sale' | 'new-arrivals' | 'for-you' | 'recommendations' | 'favourites' | 'custom';

interface SectionBadgeIconProps {
  type: SectionIconType;
  customIcon?: ReactNode;
  size?: number;
  className?: string;
}

const ICON_MAP: Record<Exclude<SectionIconType, 'custom'>, LucideIcon> = {
  'flash-sale': Flame,
  'new-arrivals': Sparkles,
  'for-you': Target,
  'recommendations': Star,
  'favourites': Trophy,
};

export default function SectionBadgeIcon({
  type,
  customIcon,
  size = 13,
  className = '',
}: SectionBadgeIconProps) {
  if (customIcon) {
    return <span className={`inline-flex shrink-0 items-center justify-center ${className}`}>{customIcon}</span>;
  }

  const IconComponent = ICON_MAP[type as keyof typeof ICON_MAP] || Zap;

  return (
    <IconComponent
      size={size}
      strokeWidth={2.4}
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    />
  );
}
