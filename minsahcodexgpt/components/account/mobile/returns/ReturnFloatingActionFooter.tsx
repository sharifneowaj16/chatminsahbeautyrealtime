'use client';

import { ArrowRight, MessageCircle } from 'lucide-react';

interface ReturnFloatingActionFooterProps {
  canContinue: boolean;
  onContinue: () => void;
  isLoading?: boolean;
}

export function ReturnFloatingActionFooter({
  canContinue,
  onContinue,
  isLoading = false,
}: ReturnFloatingActionFooterProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-[0_-8px_20px_rgba(0,0,0,0.06)]">
      <div className="max-w-md mx-auto space-y-2.5">
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue || isLoading}
          className={`w-full h-12 px-6 rounded-full font-bold text-xs tracking-wide transition-all duration-200 flex items-center justify-center gap-2 shadow-md ${
            canContinue && !isLoading
              ? 'bg-[#062402] hover:bg-[#1c3a13] text-white active:scale-[0.98] border border-[#ccee9b]/20 cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>{isLoading ? 'Processing...' : 'Continue to Evidence Upload'}</span>
          <ArrowRight className="w-4 h-4 text-[#D4F6A2]" />
        </button>

        <div className="text-center">
          <a
            href="https://wa.me/8801700000000?text=Hi%20Minsah%20Beauty,%20I%20need%20help%20with%20my%20return"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-emerald-600 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Need assistance? Chat with WhatsApp Concierge</span>
          </a>
        </div>
      </div>
    </div>
  );
}
