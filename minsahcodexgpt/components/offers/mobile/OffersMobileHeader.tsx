'use client';

import { ArrowLeft, Headphones, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function OffersMobileHeader() {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 w-full bg-[#faf9f6]/85 backdrop-blur-xl border-b border-[#E2DED8]/60 shadow-[0_1px_8px_rgba(6,36,2,0.04)] px-4 py-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full text-[#062402] hover:bg-[#F2F6F0] active:scale-95 transition-all"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-base font-bold text-[#062402] tracking-tight truncate px-2 text-center flex-1">
          Offers &amp; Promotions
        </h1>

        <div className="flex items-center gap-1.5">
          <a
            href="https://wa.me/8801700000000?text=Hi%20Minsah%20Beauty,%20I%20have%20a%20question%20about%20current%20promotions"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#062402] hover:bg-[#F2F6F0] active:scale-95 transition-all"
            aria-label="Customer Support"
          >
            <Headphones className="w-5 h-5" />
          </a>
          <div className="w-8 h-8 rounded-full bg-[#062402] flex items-center justify-center shrink-0 text-white">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
