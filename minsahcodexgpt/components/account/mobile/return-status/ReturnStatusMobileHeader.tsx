'use client';

import { ArrowLeft, Headphones, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ReturnStatusMobileHeaderProps {
  returnNumber: string;
  onOpenSupport?: () => void;
}

export function ReturnStatusMobileHeader({
  returnNumber,
  onOpenSupport,
}: ReturnStatusMobileHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 bg-[#faf9f6]/90 backdrop-blur-xl border-b border-[#E2DED8] px-4 py-3 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#1a1c1a] hover:bg-[#f4f3f1] transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col min-w-0">
            <h1 className="text-base font-bold text-[#1a1c1a] tracking-tight truncate">
              Return Status
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#ccee9b] text-[#516d29] text-[10px] font-bold uppercase tracking-wider">
                #{returnNumber}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSupport}
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#062402] hover:bg-[#f4f3f1] transition-colors"
            aria-label="Customer Concierge Support"
          >
            <Headphones className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-[#062402] flex items-center justify-center text-white text-xs font-semibold">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
