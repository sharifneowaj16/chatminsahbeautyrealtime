'use client';

import React from 'react';
import { MapPin } from 'lucide-react';

interface ShortlistZoneBadgeProps {
  zone: string;
  standLocation?: string;
  compact?: boolean;
}

export const ShortlistZoneBadge: React.FC<ShortlistZoneBadgeProps> = ({
  zone,
  standLocation,
  compact = false,
}) => {
  const normalized = zone.toLowerCase();
  const isPaltan = normalized.includes('paltan');
  const isChawkbazar = normalized.includes('chawkbazar') || normalized.includes('chawk');
  const isElephantRd = normalized.includes('elephant');

  const colorStyles = isPaltan
    ? 'bg-blue-950/70 border-blue-800/60 text-blue-300'
    : isChawkbazar
    ? 'bg-amber-950/70 border-amber-800/60 text-amber-300'
    : isElephantRd
    ? 'bg-emerald-950/70 border-emerald-800/60 text-emerald-300'
    : 'bg-slate-900 border-slate-700 text-slate-300';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono rounded border transition-colors ${colorStyles} ${
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      }`}
      title={standLocation ? `${zone} • ${standLocation}` : zone}
    >
      <MapPin className="w-2.5 h-2.5 shrink-0 opacity-80" />
      <span className="font-semibold">{zone}</span>
      {standLocation && !compact && (
        <span className="text-white/60 text-[10px] pl-0.5">· {standLocation}</span>
      )}
    </span>
  );
};
