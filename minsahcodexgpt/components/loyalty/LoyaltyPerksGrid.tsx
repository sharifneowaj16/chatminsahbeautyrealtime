'use client';

import React from 'react';
import { Ticket, Package, Rocket } from 'lucide-react';
import { LoyaltyPerkItem } from './types';

const defaultPerks: LoyaltyPerkItem[] = [
  { id: 'perk-voucher-200', title: '৳200 OFF', pointsCost: 400, iconName: 'ticket' },
  { id: 'perk-laneige-mini', title: 'Laneige Lip Mini', pointsCost: 600, iconName: 'package' },
  { id: 'perk-express-shipping', title: 'Dhaka Express', pointsCost: 300, iconName: 'rocket' },
];

interface LoyaltyPerksGridProps {
  onClaimPerk: (perk: LoyaltyPerkItem) => void;
}

export default function LoyaltyPerksGrid({ onClaimPerk }: LoyaltyPerksGridProps) {
  const getIcon = (name: string) => {
    switch (name) {
      case 'ticket':
        return <Ticket className="w-4 h-4 text-[#4b6723]" />;
      case 'package':
        return <Package className="w-4 h-4 text-[#4b6723]" />;
      case 'rocket':
        return <Rocket className="w-4 h-4 text-[#4b6723]" />;
      default:
        return <Ticket className="w-4 h-4 text-[#4b6723]" />;
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 pt-0.5">
      {defaultPerks.map((p) => (
        <div
          key={p.id}
          className="bg-white rounded-xl p-2.5 flex flex-col justify-between border border-[#E2DED8]/60 shadow-xs"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              {getIcon(p.iconName)}
              <span className="text-[10px] text-[#43483f] font-bold">
                {p.pointsCost} Pts
              </span>
            </div>
            <h4 className="text-[12px] text-[#062402] font-bold truncate">
              {p.title}
            </h4>
          </div>
          <button
            type="button"
            onClick={() => onClaimPerk(p)}
            className="mt-2 w-full py-1 rounded-lg bg-[#062402] text-white text-[10px] font-bold active:scale-95 transition-transform cursor-pointer hover:bg-[#1c3a13]"
          >
            Claim
          </button>
        </div>
      ))}
    </div>
  );
}
