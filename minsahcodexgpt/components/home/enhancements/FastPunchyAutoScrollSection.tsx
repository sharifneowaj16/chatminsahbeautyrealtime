"use client";

import React, { useRef, useEffect, useState } from "react";

interface FastPunchyAutoScrollSectionProps {
  autoScrollInterval?: number;
}

export function FastPunchyAutoScrollSection({
  autoScrollInterval = 2500,
}: FastPunchyAutoScrollSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const maxScroll = container.scrollWidth - container.clientWidth;
      if (container.scrollLeft >= maxScroll - 10) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        container.scrollBy({ left: 220, behavior: "smooth" });
      }
    }, autoScrollInterval);

    return () => clearInterval(interval);
  }, [isPaused, autoScrollInterval]);

  return (
    <section
      className="py-3 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="px-4 flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#4b6723] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4b6723]">
              Direct Import
            </span>
          </div>
          <h3 className="text-lg font-bold text-[#062402]">Flash Deals &amp; Fast Picks</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#4b6723] font-bold bg-[#EAF7D8] px-2 py-0.5 rounded-full border border-[#4b6723]/20">
            Auto-Scroll Active
          </span>
        </div>
      </div>

      {/* Auto Scroll Track */}
      <div
        ref={scrollContainerRef}
        className="flex gap-3 overflow-x-auto px-4 no-scrollbar scroll-smooth snap-x snap-mandatory"
        style={{ scrollBehavior: "smooth" }}
      >
        {/* Deal 1 */}
        <div className="min-w-[210px] w-[210px] shrink-0 snap-start flex flex-col rounded-2xl bg-white p-3 shadow-xs border border-[#E2DED8]/60">
          <div className="relative w-full aspect-square rounded-xl bg-[#F8FAF7] overflow-hidden mb-2">
            <img
              src="https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&q=80"
              alt="Anua 77 Toner"
              className="w-full h-full object-cover"
            />
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#D4F6A2] text-[#062402] text-[9px] font-bold shadow-xs">
              -15%
            </span>
            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-white/95 text-[#062402] text-[9px] font-semibold flex items-center gap-0.5 shadow-xs">
              <span className="material-symbols-outlined text-[11px] text-[#4b6723]">verified</span>
              Authentic Import
            </span>
          </div>
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <p className="text-[10px] text-[#4b6723] font-bold uppercase">Anua Korea</p>
              <h4 className="text-xs font-bold text-[#062402] line-clamp-1">Heartleaf 77% Toner</h4>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-[#E2DED8]/50 mt-2">
              <span className="text-sm font-bold text-[#062402]">৳ 2,100</span>
              <button
                type="button"
                className="w-7 h-7 rounded-full bg-[#062402] text-white flex items-center justify-center active:scale-90"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Deal 2 */}
        <div className="min-w-[210px] w-[210px] shrink-0 snap-start flex flex-col rounded-2xl bg-white p-3 shadow-xs border border-[#E2DED8]/60">
          <div className="relative w-full aspect-square rounded-xl bg-[#F8FAF7] overflow-hidden mb-2">
            <img
              src="https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=300&q=80"
              alt="Laneige Lip Mask"
              className="w-full h-full object-cover"
            />
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#D4F6A2] text-[#062402] text-[9px] font-bold shadow-xs">
              -18%
            </span>
            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-white/95 text-[#062402] text-[9px] font-semibold flex items-center gap-0.5 shadow-xs">
              <span className="material-symbols-outlined text-[11px] text-[#4b6723]">verified</span>
              Authentic Import
            </span>
          </div>
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <p className="text-[10px] text-[#4b6723] font-bold uppercase">Laneige</p>
              <h4 className="text-xs font-bold text-[#062402] line-clamp-1">Lip Sleeping Mask</h4>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-[#E2DED8]/50 mt-2">
              <span className="text-sm font-bold text-[#062402]">৳ 1,720</span>
              <button
                type="button"
                className="w-7 h-7 rounded-full bg-[#062402] text-white flex items-center justify-center active:scale-90"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Deal 3 */}
        <div className="min-w-[210px] w-[210px] shrink-0 snap-start flex flex-col rounded-2xl bg-white p-3 shadow-xs border border-[#E2DED8]/60">
          <div className="relative w-full aspect-square rounded-xl bg-[#F8FAF7] overflow-hidden mb-2">
            <img
              src="https://images.unsplash.com/photo-1608248597359-2c6b4d326efc?auto=format&fit=crop&w=300&q=80"
              alt="COSRX Snail Mucin"
              className="w-full h-full object-cover"
            />
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#D4F6A2] text-[#062402] text-[9px] font-bold shadow-xs">
              -14%
            </span>
            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-white/95 text-[#062402] text-[9px] font-semibold flex items-center gap-0.5 shadow-xs">
              <span className="material-symbols-outlined text-[11px] text-[#4b6723]">verified</span>
              Authentic Import
            </span>
          </div>
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <p className="text-[10px] text-[#4b6723] font-bold uppercase">COSRX</p>
              <h4 className="text-xs font-bold text-[#062402] line-clamp-1">Snail 96 Mucin Power</h4>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-[#E2DED8]/50 mt-2">
              <span className="text-sm font-bold text-[#062402]">৳ 1,890</span>
              <button
                type="button"
                className="w-7 h-7 rounded-full bg-[#062402] text-white flex items-center justify-center active:scale-90"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic 2.5s Punchy Progress Bar */}
      <div className="flex justify-center items-center pt-3 pb-1">
        <div className="w-24 h-1.5 bg-[#E8F0E5] rounded-full overflow-hidden relative">
          <div className="h-full rounded-full bg-[#062402] animate-pulse transition-all duration-300 w-2/3" />
        </div>
      </div>
    </section>
  );
}
