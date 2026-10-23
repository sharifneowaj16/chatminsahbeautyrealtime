'use client';

import React from 'react';
import { MapPin } from 'lucide-react';

interface WarrantyPickupAddressBarProps {
  addressLabel: string;
  onChangeLocation: () => void;
}

export default function WarrantyPickupAddressBar({
  addressLabel,
  onChangeLocation,
}: WarrantyPickupAddressBarProps) {
  return (
    <div className="p-3 rounded-xl bg-[#F8FAF7] border border-[#E2DED8]/60 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2 min-w-0">
        <MapPin className="w-4 h-4 text-[#4b6723] shrink-0" />
        <p className="text-xs text-[#1a1c1a] truncate">
          <span className="font-bold text-[#062402]">Pickup:</span> {addressLabel}
        </p>
      </div>
      <button
        type="button"
        onClick={onChangeLocation}
        className="text-xs text-[#4b6723] font-bold hover:underline shrink-0 ml-2 cursor-pointer"
      >
        Change
      </button>
    </div>
  );
}
