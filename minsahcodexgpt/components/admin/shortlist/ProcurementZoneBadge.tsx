'use client';

import React from 'react';
import { MapPin } from 'lucide-react';

export type WholesaleZone = 'ALL' | 'PALTAN' | 'CHAWKBAZAR' | 'ELEPHANT_RD' | string;

export interface ProcurementZoneBadgeProps {
  zone: WholesaleZone;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

const ZONE_CONFIG: Record<string, { label: string; color: string }> = {
  PALTAN: {
    label: 'Paltan Hub',
    color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  },
  CHAWKBAZAR: {
    label: 'Chawkbazar Market',
    color: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  },
  ELEPHANT_RD: {
    label: 'Elephant Road',
    color: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  },
  ALL: {
    label: 'All Procurement Zones',
    color: 'bg-slate-800 text-slate-300 border-slate-700',
  },
};

export const ProcurementZoneBadge: React.FC<ProcurementZoneBadgeProps> = ({
  zone,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const norm = (zone || 'ALL').toUpperCase();
  const conf = ZONE_CONFIG[norm] || {
    label: zone,
    color: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-md border uppercase tracking-wider ${
        conf.color
      } ${isSm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'} ${className}`}
    >
      {showIcon && <MapPin className={isSm ? 'w-2.5 h-2.5' : 'w-3 h-3'} />}
      <span>{conf.label}</span>
    </span>
  );
};

export default ProcurementZoneBadge;
