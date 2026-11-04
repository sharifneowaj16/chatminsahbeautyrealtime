'use client';

import React from 'react';
import {
  Home,
  ShoppingBag,
  Grid,
  Search,
  Sparkles,
  Clock,
  Heart,
  Bell,
  User,
} from 'lucide-react';
import { NavButtonKey } from '@/types/navigation-config';

interface SafeSvgRendererProps {
  buttonKey: NavButtonKey;
  iconType?: 'system' | 'custom_svg';
  customSvg?: string;
  className?: string;
  active?: boolean;
}

const SYSTEM_ICONS: Record<NavButtonKey, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  home_shop: Home,
  categories: Grid,
  cart_drawer: ShoppingBag,
  search: Search,
  offers: Sparkles,
  recent: Clock,
  wishlist: Heart,
  notifications: Bell,
  account: User,
};

export const SafeSvgRenderer: React.FC<SafeSvgRendererProps> = ({
  buttonKey,
  iconType = 'system',
  customSvg,
  className = 'w-5 h-5',
  active = false,
}) => {
  // If custom SVG is supplied and valid
  if (iconType === 'custom_svg' && customSvg && customSvg.includes('<svg')) {
    // Inject className and currentColor styles
    const enhancedSvg = customSvg
      .replace(/<svg\b([^>]*)>/i, `<svg $1 class="${className}" style="fill: currentColor; stroke: currentColor;">`)
      .replace(/width="[^"]*"/gi, '')
      .replace(/height="[^"]*"/gi, '');

    return (
      <span
        className="inline-flex items-center justify-center shrink-0 [&>svg]:w-full [&>svg]:h-full"
        dangerouslySetInnerHTML={{ __html: enhancedSvg }}
      />
    );
  }

  // Fallback to system icon
  const IconComponent = SYSTEM_ICONS[buttonKey] || Home;
  return (
    <IconComponent
      className={className}
      strokeWidth={active ? 2.25 : 1.75}
      aria-hidden="true"
    />
  );
};

export default SafeSvgRenderer;

