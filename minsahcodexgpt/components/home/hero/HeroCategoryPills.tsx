'use client';

import React from 'react';
import Link from 'next/link';
import { Sun, Droplet, Sparkles, Heart } from 'lucide-react';
import type { HeroCategoryPill } from './types';

const DEFAULT_PILLS: HeroCategoryPill[] = [
  { id: 'sun', name: 'Sunscreens', iconName: 'sun', href: '/shop?category=sunscreen' },
  { id: 'serum', name: 'Serums', iconName: 'serum', href: '/shop?category=serum' },
  { id: 'toner', name: 'Toners', iconName: 'toner', href: '/shop?category=toner' },
  { id: 'lip', name: 'Lip Care', iconName: 'lip', href: '/shop?category=lip-care' },
];

function renderPillIcon(iconName: string) {
  switch (iconName) {
    case 'sun':
      return <Sun className="w-3.5 h-3.5 text-amber-500" />;
    case 'serum':
      return <Droplet className="w-3.5 h-3.5 text-sky-500" />;
    case 'toner':
      return <Sparkles className="w-3.5 h-3.5 text-emerald-600" />;
    case 'lip':
      return <Heart className="w-3.5 h-3.5 text-rose-500" />;
    default:
      return <Sparkles className="w-3.5 h-3.5 text-emerald-600" />;
  }
}

export default function HeroCategoryPills({ pills = DEFAULT_PILLS }: { pills?: HeroCategoryPill[] }) {
  if (!pills || pills.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 px-4 pb-1 md:hidden">
      {pills.map((pill) => (
        <Link
          key={pill.id}
          href={pill.href}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-stone-200/80 text-stone-800 text-[12px] font-medium shadow-2xs whitespace-nowrap active:scale-95 transition-transform hover:border-emerald-500 hover:text-emerald-700"
        >
          {renderPillIcon(pill.iconName)}
          <span>{pill.name}</span>
        </Link>
      ))}
    </div>
  );
}
