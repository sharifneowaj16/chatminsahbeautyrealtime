'use client';

import React from 'react';
import { MapPin, Zap } from 'lucide-react';
import { DeliveryZoneItem } from './types';

const defaultZones: DeliveryZoneItem[] = [
  { id: 'banani', name: 'Banani', deliveryTime: '24h Express', hub: 'Banani Central Hub', isExpressAvailable: true },
  { id: 'gulshan', name: 'Gulshan-1 & 2', deliveryTime: '24h Express', hub: 'Banani Hub', isExpressAvailable: true },
  { id: 'dhanmondi', name: 'Dhanmondi', deliveryTime: '24-48h', hub: 'Dhaka West Hub', isExpressAvailable: true },
  { id: 'uttara', name: 'Uttara (Sec 1-14)', deliveryTime: '24h Express', hub: 'Airport Hub', isExpressAvailable: true },
  { id: 'mirpur', name: 'Mirpur & DOHS', deliveryTime: '24-48h', hub: 'Mirpur Hub', isExpressAvailable: true },
  { id: 'bashundhara', name: 'Bashundhara R/A', deliveryTime: '24h Express', hub: 'East Hub', isExpressAvailable: true },
  { id: 'motijheel', name: 'Motijheel & Old Dhaka', deliveryTime: '24-48h', hub: 'South Hub', isExpressAvailable: false },
  { id: 'chattogram', name: 'Chattogram Metro', deliveryTime: '48-72h', hub: 'CTG Station', isExpressAvailable: false },
];

interface QuickDhakaZonePillsProps {
  selectedZoneName: string;
  onSelectZone: (zone: DeliveryZoneItem) => void;
}

export default function QuickDhakaZonePills({
  selectedZoneName,
  onSelectZone,
}: QuickDhakaZonePillsProps) {
  return (
    <div className="flex flex-col gap-2 pt-1">
      <span className="text-[11px] uppercase tracking-wider font-bold text-[#5A615D] flex items-center gap-1 px-1">
        <MapPin className="w-3.5 h-3.5 text-[#4b6723]" />
        Quick Dhaka Hub Zones
      </span>

      <div className="grid grid-cols-2 gap-2">
        {defaultZones.map((zone) => {
          const isSelected = selectedZoneName.toLowerCase().includes(zone.name.toLowerCase().split(' ')[0]);
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => onSelectZone(zone)}
              className={`p-2.5 rounded-xl text-left transition-all flex flex-col gap-0.5 cursor-pointer shadow-2xs ${
                isSelected
                  ? 'border-2 border-[#4b6723] bg-[#EAF7D8]/60 text-[#062402]'
                  : 'border border-[#E2DED8]/60 bg-[#F8FAF7] hover:border-[#4b6723] text-[#1a1c1a]'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold truncate">
                  {zone.name}
                </span>
                {zone.isExpressAvailable && (
                  <Zap className="w-3 h-3 text-[#4b6723] shrink-0" />
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#5A615D]">
                <span>{zone.deliveryTime}</span>
                <span className="text-[9px] text-[#4b6723] font-semibold">
                  {zone.hub.split(' ')[0]}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
