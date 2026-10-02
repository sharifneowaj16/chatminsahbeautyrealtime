'use client';

import React from 'react';
import { Building2 } from 'lucide-react';

interface MobileCustomVendorAccordionProps {
  customStallName: string;
  customStallLocation: string;
  customStallPhone: string;
  onNameChange: (val: string) => void;
  onLocationChange: (val: string) => void;
  onPhoneChange: (val: string) => void;
}

export const MobileCustomVendorAccordion: React.FC<MobileCustomVendorAccordionProps> = ({
  customStallName,
  customStallLocation,
  customStallPhone,
  onNameChange,
  onLocationChange,
  onPhoneChange,
}) => {
  return (
    <div className="p-3 rounded-xl bg-[#051424] border border-indigo-500/40 flex flex-col gap-2 font-mono text-xs">
      <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
        <Building2 className="w-3.5 h-3.5" />
        <span>Add New Sourcing Stall</span>
      </div>

      <input
        type="text"
        placeholder="Stall Name (e.g. Al-Madina Cosmetics)"
        value={customStallName}
        onChange={(e) => onNameChange(e.target.value)}
        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d1c2d] border border-[#1f2f45] text-white focus:outline-none focus:border-indigo-500"
      />

      <input
        type="text"
        placeholder="Location / Stand (e.g. Stand 18, Chawkbazar)"
        value={customStallLocation}
        onChange={(e) => onLocationChange(e.target.value)}
        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d1c2d] border border-[#1f2f45] text-white focus:outline-none focus:border-indigo-500"
      />

      <input
        type="text"
        placeholder="Phone Number (optional)"
        value={customStallPhone}
        onChange={(e) => onPhoneChange(e.target.value)}
        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d1c2d] border border-[#1f2f45] text-white focus:outline-none focus:border-indigo-500"
      />
    </div>
  );
};
