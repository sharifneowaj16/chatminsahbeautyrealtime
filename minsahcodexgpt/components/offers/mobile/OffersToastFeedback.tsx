'use client';

import { CheckCircle2 } from 'lucide-react';

interface OffersToastFeedbackProps {
  message: string | null;
}

export function OffersToastFeedback({ message }: OffersToastFeedbackProps) {
  if (!message) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#062402] text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-2 border border-[#ccee9b]/30 animate-bounce">
      <CheckCircle2 className="w-4 h-4 text-[#ccee9b] shrink-0" />
      <span className="text-xs font-bold">{message}</span>
    </div>
  );
}
