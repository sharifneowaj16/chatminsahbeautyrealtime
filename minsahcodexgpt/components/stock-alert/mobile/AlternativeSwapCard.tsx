'use client';

import { useState } from 'react';
import { RefreshCw, Check, Plus } from 'lucide-react';
import { AlternativeProduct } from './types';

interface AlternativeSwapCardProps {
  alternative: AlternativeProduct;
  onSwap: (alt: AlternativeProduct) => void;
}

export function AlternativeSwapCard({
  alternative,
  onSwap,
}: AlternativeSwapCardProps) {
  const [isSwapped, setIsSwapped] = useState(false);

  const handleSwap = () => {
    setIsSwapped(true);
    onSwap(alternative);
  };

  return (
    <div className="p-4 rounded-[28px] bg-[#EAF7D8]/60 border border-[#ccee9b]/80 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4 text-[#4b6723]" />
          <span className="text-[11px] text-[#1c3a13] font-bold uppercase tracking-wider">
            বিকল্প প্রোডাক্ট দেখুন (In-Stock Ready)
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-white text-[#4b6723] text-[10px] font-bold shadow-xs">
          তাত্ক্ষণিক ডেলিভারি
        </span>
      </div>

      <div className="p-2.5 rounded-[22px] bg-white flex items-center justify-between gap-3 shadow-xs border border-[#E2DED8]/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-13 h-13 rounded-full bg-[#f4f3f1] overflow-hidden shrink-0 border border-[#E2DED8]/60 flex items-center justify-center">
            <img
              src={alternative.image}
              alt={alternative.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex flex-col min-w-0">
            <h4 className="text-[13px] text-[#062402] font-bold truncate">
              {alternative.title}
            </h4>
            <span className="text-[11px] text-[#5A615D] truncate">
              {alternative.subtitle}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[14px] text-[#062402] font-bold">
                ৳{alternative.price.toLocaleString('bn-BD')}
              </span>
              <span className="text-[10px] text-[#4b6723] font-bold">
                {alternative.tag}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSwap}
          disabled={isSwapped}
          className={`px-3 py-2 rounded-full text-xs font-bold transition-all active:scale-95 shrink-0 flex items-center gap-1 shadow-xs ${
            isSwapped
              ? 'bg-[#4b6723] text-white cursor-default'
              : 'bg-[#EAF7D8] text-[#1c3a13] hover:bg-[#4b6723] hover:text-white'
          }`}
        >
          {isSwapped ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>যুক্ত হয়েছে</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>সোয়াপ করুন</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
