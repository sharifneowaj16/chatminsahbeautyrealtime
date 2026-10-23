'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface WishlistFeedbackToastProps {
  message: string | null;
  onUndo?: () => void;
  showUndo?: boolean;
}

export default function WishlistFeedbackToast({
  message,
  onUndo,
  showUndo,
}: WishlistFeedbackToastProps) {
  if (!message) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#062402] text-white font-bold text-xs shadow-2xl flex items-center gap-3 transition-all duration-300 border border-[#4b6723]/30 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="w-4 h-4 text-[#c7edb5]" />
        <span>{message}</span>
      </div>
      {showUndo && onUndo && (
        <button
          type="button"
          onClick={onUndo}
          className="text-[#ccee9b] font-bold text-xs hover:underline cursor-pointer pl-2 border-l border-white/20 active:scale-95 transition-all"
        >
          Undo
        </button>
      )}
    </div>
  );
}
