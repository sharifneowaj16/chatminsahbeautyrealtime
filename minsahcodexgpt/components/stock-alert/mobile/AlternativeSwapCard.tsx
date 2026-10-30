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
    <div className="p-4 rounded-[28px] bg-emerald-50/70 border border-emerald-200 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4 text-emerald-700" />
          <span className="text-[11px] text-emerald-950 font-bold uppercase tracking-wider">
            In-Stock Alternative
          </span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-white text-emerald-800 text-[10px] font-bold shadow-xs">
          Ready to Ship
        </span>
      </div>

      <div className="p-2.5 rounded-[22px] bg-white flex items-center justify-between gap-3 shadow-xs border border-[#EADFD5]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-13 h-13 rounded-full bg-[#FAF6F2] overflow-hidden shrink-0 border border-[#EADFD5] flex items-center justify-center">
            <img
              src={alternative.image}
              alt={alternative.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex flex-col min-w-0">
            <h4 className="text-[13px] text-[#2D1F18] font-bold truncate">
              {alternative.title}
            </h4>
            <span className="text-[11px] text-[#7A6E65] truncate">
              {alternative.subtitle}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[14px] text-[#2D1F18] font-bold">
                ৳{alternative.price.toLocaleString('en-US')}
              </span>
              <span className="text-[10px] text-emerald-700 font-bold">
                {alternative.tag}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSwap}
          disabled={isSwapped}
          className={`px-3 py-2 rounded-full text-xs font-bold transition-all active:scale-95 shrink-0 flex items-center gap-1 shadow-xs cursor-pointer ${
            isSwapped
              ? 'bg-emerald-700 text-white cursor-default'
              : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-700 hover:text-white'
          }`}
        >
          {isSwapped ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Added</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>Swap Item</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
