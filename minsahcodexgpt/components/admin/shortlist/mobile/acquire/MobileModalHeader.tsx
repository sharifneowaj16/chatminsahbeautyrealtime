'use client';

import React from 'react';
import { X } from 'lucide-react';

interface MobileModalHeaderProps {
  onClose: () => void;
  title?: string;
}

export const MobileModalHeader: React.FC<MobileModalHeaderProps> = ({
  onClose,
  title,
}) => {
  return (
    <div className="w-full shrink-0 select-none">
      {/* Grab Handle Bar */}
      <div
        onClick={onClose}
        className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-pointer"
      >
        <div className="w-12 h-1.5 rounded-full bg-[#273647]" />
      </div>

      {title && (
        <div className="px-4 pb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#1c2b3c] text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
