'use client';

import React, { useState } from 'react';
import { Megaphone, ChevronDown, ChevronUp } from 'lucide-react';

export interface ProductAiFacebookAdAngleProps {
  adAngle: {
    headline: string;
    primaryText: string;
    targetAudience: string;
  } | null;
}

export function ProductAiFacebookAdAngle({ adAngle }: ProductAiFacebookAdAngleProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!adAngle) return null;

  return (
    <div className="mt-3 border border-indigo-500/20 bg-indigo-950/20 rounded-lg overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-indigo-500/10 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Megaphone className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-indigo-300">
            🎯 AI-Generated Facebook Ad Campaign Angle
          </span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-indigo-400" />}
      </button>

      {isOpen && (
        <div className="p-4 border-t border-indigo-500/20 bg-[#161824] space-y-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Ad Headline</span>
            <p className="text-xs font-semibold text-[#F7F8F8] mt-0.5">{adAngle.headline}</p>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Primary Ad Copy Text</span>
            <p className="text-xs text-[#d0d6e0] mt-0.5 leading-relaxed whitespace-pre-line">{adAngle.primaryText}</p>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Recommended Target Audience</span>
            <p className="text-xs text-white/70 mt-0.5">{adAngle.targetAudience}</p>
          </div>
        </div>
      )}
    </div>
  );
}
