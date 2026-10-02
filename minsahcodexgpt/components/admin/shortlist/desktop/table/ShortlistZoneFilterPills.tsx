// components/admin/shortlist/desktop/table/ShortlistZoneFilterPills.tsx
'use client';

import React from 'react';
import { WholesaleZone } from '@/app/admin/shortlist/types';

export interface ShortlistZoneFilterPillsProps {
  activeZone: WholesaleZone;
  onZoneChange: (zone: WholesaleZone) => void;
  zoneCounts?: {
    all: number;
    paltan: number;
    chawkbazar: number;
    elephantRd: number;
  };
  totalCount?: number;
  paltanCount?: number;
  chawkbazarCount?: number;
  elephantCount?: number;
}

export const ShortlistZoneFilterPills: React.FC<ShortlistZoneFilterPillsProps> = ({
  activeZone,
  onZoneChange,
  zoneCounts,
  totalCount,
  paltanCount,
  chawkbazarCount,
  elephantCount,
}) => {
  const counts = {
    all: totalCount ?? zoneCounts?.all ?? 0,
    paltan: paltanCount ?? zoneCounts?.paltan ?? 0,
    chawkbazar: chawkbazarCount ?? zoneCounts?.chawkbazar ?? 0,
    elephantRd: elephantCount ?? zoneCounts?.elephantRd ?? 0,
  };

  return (
    <div className="flex items-center gap-1.5 text-xs font-mono select-none">
      <span className="text-slate-400 font-semibold mr-1">Zone:</span>
      <button
        type="button"
        onClick={() => onZoneChange('ALL')}
        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
          activeZone === 'ALL'
            ? 'bg-indigo-600 text-white'
            : 'bg-[#081320] hover:bg-[#112134] text-slate-300 border border-[#17273a]'
        }`}
      >
        All ({counts.all})
      </button>

      <button
        type="button"
        onClick={() => onZoneChange('PALTAN')}
        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
          activeZone === 'PALTAN'
            ? 'bg-indigo-600 text-white'
            : 'bg-[#081320] hover:bg-[#112134] text-slate-300 border border-[#17273a]'
        }`}
      >
        Paltan ({counts.paltan})
      </button>

      <button
        type="button"
        onClick={() => onZoneChange('CHAWKBAZAR')}
        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
          activeZone === 'CHAWKBAZAR'
            ? 'bg-indigo-600 text-white'
            : 'bg-[#081320] hover:bg-[#112134] text-slate-300 border border-[#17273a]'
        }`}
      >
        Chawkbazar ({counts.chawkbazar})
      </button>

      <button
        type="button"
        onClick={() => onZoneChange('ELEPHANT_RD')}
        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
          activeZone === 'ELEPHANT_RD'
            ? 'bg-indigo-600 text-white'
            : 'bg-[#081320] hover:bg-[#112134] text-slate-300 border border-[#17273a]'
        }`}
      >
        Elephant Rd ({counts.elephantRd})
      </button>
    </div>
  );
};
export default ShortlistZoneFilterPills;
