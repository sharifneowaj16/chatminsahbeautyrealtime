'use client';

import { MessageCircle, Phone, ArrowLeft, ExternalLink } from 'lucide-react';

interface ConciergeActionButtonsProps {
  onOpenWhatsApp: () => void;
  onBack: () => void;
}

export function ConciergeActionButtons({
  onOpenWhatsApp,
  onBack,
}: ConciergeActionButtonsProps) {
  return (
    <div className="flex flex-col gap-2 mt-1">
      {/* Primary Action Button */}
      <button
        type="button"
        onClick={onOpenWhatsApp}
        className="w-full h-13 py-3.5 rounded-full bg-[#062402] hover:bg-[#28531c] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all border border-[#4b6723]/30"
      >
        <span className="w-6 h-6 rounded-full bg-[#25D366] text-white flex items-center justify-center">
          <MessageCircle className="w-3.5 h-3.5 fill-current" />
        </span>
        <span>Open in WhatsApp (Start Chat)</span>
        <ExternalLink className="w-4 h-4 text-[#ccee9b]" />
      </button>

      {/* Secondary Actions */}
      <div className="grid grid-cols-2 gap-2">
        <a
          href="tel:+8801700646724"
          className="h-11 rounded-full bg-[#efeeeb] hover:bg-[#E8F0E5] text-[#181C1A] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
        >
          <Phone className="w-3.5 h-3.5 text-[#4b6723]" />
          <span>Call Concierge</span>
        </a>

        <button
          type="button"
          onClick={onBack}
          className="h-11 rounded-full bg-[#efeeeb] hover:bg-[#E8F0E5] text-[#5A615D] hover:text-[#181C1A] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Security</span>
        </button>
      </div>
    </div>
  );
}
