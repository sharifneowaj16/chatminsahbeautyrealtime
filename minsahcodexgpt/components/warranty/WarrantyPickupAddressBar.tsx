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
    <div className="p-3.5 rounded-2xl bg-[#0f1011] border border-[#23252a] flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2.5 min-w-0">
        <MapPin className="w-4 h-4 text-[#828fff] shrink-0" />
        <p className="text-xs text-[#c9cdd4] truncate">
          <span className="font-semibold text-[#f7f8f8]">Pickup:</span> {addressLabel}
        </p>
      </div>
      <button
        type="button"
        onClick={onChangeLocation}
        className="text-xs text-[#828fff] hover:text-white font-semibold hover:underline shrink-0 ml-2 cursor-pointer transition-colors"
      >
        Change
      </button>
    </div>
  );
}