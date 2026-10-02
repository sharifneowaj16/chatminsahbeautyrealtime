// components/admin/shortlist/mobile/feed/MobileZoneCarousel.tsx
'use client';

import React from 'react';
import { WholesaleZone } from '@/app/admin/shortlist/types';

export type MobileZoneFilter = WholesaleZone | 'URGENT';

export interface MobileZoneCarouselProps {
  activeZone: MobileZoneFilter;
  onSelectZone: (zone: MobileZoneFilter) => void;
  zoneCounts?: {
    all: number;
    paltan: number;
    chawkbazar: number;
    elephantRd: number;
    urgent: number;
  };
  urgentCount?: number;
  allCount?: number;
  paltanCount?: number;
  chawkbazarCount?: number;
  elephantCount?: number;
}

export const MobileZoneCarousel: React.FC<MobileZoneCarouselProps> = ({
  activeZone,
  onSelectZone,
  zoneCounts,
  urgentCount,
  allCount,
  paltanCount,
  chawkbazarCount,
  elephantCount,
}) => {
  const counts = {
    all: allCount ?? zoneCounts?.all ?? 0,
    paltan: paltanCount ?? zoneCounts?.paltan ?? 0,
    chawkbazar: chawkbazarCount ?? zoneCounts?.chawkbazar ?? 0,
    elephantRd: elephantCount ?? zoneCounts?.elephantRd ?? 0,
    urgent: urgentCount ?? zoneCounts?.urgent ?? 0,
  };

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-3 select-none">
      <button
        type="button"
        onClick={() => onSelectZone('URGENT')}
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold font-mono transition-all active:scale-95 flex items-center gap-1 border cursor-pointer ${
          activeZone === 'URGENT'
            ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
            : 'bg-[#0d1c2d] text-amber-300 border-amber-500/30 hover:bg-[#172a3e]'
        }`}
      >
        <span>⚡ All Urgent ({counts.urgent})</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectZone('ALL')}
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold font-mono transition-all active:scale-95 border cursor-pointer ${
          activeZone === 'ALL'
            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
            : 'bg-[#0d1c2d] text-slate-300 border-[#1f2f45] hover:bg-[#172a3e]'
        }`}
      >
        All SKUs ({counts.all})
      </button>

      <button
        type="button"
        onClick={() => onSelectZone('PALTAN')}
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold font-mono transition-all active:scale-95 border cursor-pointer ${
          activeZone === 'PALTAN'
            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
            : 'bg-[#0d1c2d] text-slate-300 border-[#1f2f45] hover:bg-[#172a3e]'
        }`}
      >
        Paltan ({counts.paltan})
      </button>

      <button
        type="button"
        onClick={() => onSelectZone('CHAWKBAZAR')}
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold font-mono transition-all active:scale-95 border cursor-pointer ${
          activeZone === 'CHAWKBAZAR'
            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
            : 'bg-[#0d1c2d] text-slate-300 border-[#1f2f45] hover:bg-[#172a3e]'
        }`}
      >
        Chawkbazar ({counts.chawkbazar})
      </button>

      <button
        type="button"
        onClick={() => onSelectZone('ELEPHANT_RD')}
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold font-mono transition-all active:scale-95 border cursor-pointer ${
          activeZone === 'ELEPHANT_RD'
            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
            : 'bg-[#0d1c2d] text-slate-300 border-[#1f2f45] hover:bg-[#172a3e]'
        }`}
      >
        Elephant Rd ({counts.elephantRd})
      </button>
    </div>
  );
};
export default MobileZoneCarousel;
