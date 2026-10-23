'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ConfirmLocationButtonProps {
  onConfirm: () => void;
  selectedLocationName: string;
}

export default function ConfirmLocationButton({
  onConfirm,
  selectedLocationName,
}: ConfirmLocationButtonProps) {
  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={onConfirm}
        className="w-full py-3.5 rounded-full bg-[#062402] hover:bg-[#28531c] text-white text-[14px] font-bold active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
      >
        <CheckCircle2 className="w-5 h-5 text-[#D4F6A2]" />
        <span>Confirm Delivery Location ({selectedLocationName})</span>
      </button>
    </div>
  );
}
