'use client';

import React from 'react';
import { Star } from 'lucide-react';

interface ShortlistPriorityStarProps {
  isUrgent: boolean;
  onToggle: (e: React.MouseEvent) => void;
  disabled?: boolean;
}

export const ShortlistPriorityStar: React.FC<ShortlistPriorityStarProps> = ({
  isUrgent,
  onToggle,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title={isUrgent ? 'Urgent Demand (Click to set normal)' : 'Normal Demand (Click to set urgent)'}
      className={`p-1 rounded transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
        isUrgent
          ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/40'
          : 'text-slate-600 hover:text-slate-400 hover:bg-slate-800/50'
      }`}
    >
      <Star
        className={`w-3.5 h-3.5 transition-transform ${
          isUrgent ? 'fill-amber-400 scale-110' : 'fill-transparent'
        }`}
      />
    </button>
  );
};
