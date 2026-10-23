'use client';

import { QrCode, HelpCircle } from 'lucide-react';

interface ReturnStickyActionBarProps {
  onShowQr: () => void;
  onOpenHelp: () => void;
}

export function ReturnStickyActionBar({
  onShowQr,
  onOpenHelp,
}: ReturnStickyActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 w-full z-40 bg-[#faf9f6]/95 backdrop-blur-xl p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] border-t border-[#E2DED8]">
      <div className="max-w-md mx-auto flex items-center gap-3">
        <button
          type="button"
          onClick={onShowQr}
          className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-[#062402] hover:bg-[#1c3a13] text-white text-xs font-bold tracking-wide shadow-md hover:shadow-lg active:scale-95 transition-all border border-[#ccee9b]/20 cursor-pointer"
        >
          <QrCode className="w-4 h-4 text-[#D4F6A2]" />
          <span>Show Rider QR Slip</span>
        </button>

        <button
          type="button"
          onClick={onOpenHelp}
          className="w-11 h-11 rounded-full bg-[#e9e8e5] hover:bg-[#E8F0E5] text-[#062402] flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-xs cursor-pointer"
          aria-label="Return Support"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
