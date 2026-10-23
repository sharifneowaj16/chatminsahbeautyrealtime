"use client";

import React, { useRef, useState } from "react";

export function NewInAutoIOSScrollSection() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [indicatorOffset, setIndicatorOffset] = useState(0);

  const handleScroll = () => {
    const el = carouselRef.current;
    if (!el) return;
    const scrollMax = el.scrollWidth - el.clientWidth;
    if (scrollMax > 0) {
      const scrollPercent = el.scrollLeft / scrollMax;
      // Track length 80px, indicator 24px -> max translation 56px
      setIndicatorOffset(scrollPercent * 56);
    }
  };

  return (
    <section className="py-4 select-none">
      <div className="px-4 flex items-center justify-between mb-2.5">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#4b6723] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4b6723]">
              Direct Import
            </span>
          </div>
          <h3 className="text-xl font-bold text-[#062402]">New In</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/catalog";
          }}
          className="inline-flex items-center gap-0.5 text-[#4b6723] text-xs hover:underline font-bold"
        >
          See All (42) <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </button>
      </div>

      {/* Snap Track with Momentum Scroll */}
      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto px-4 no-scrollbar snap-x snap-mandatory"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/* Item 1 */}
        <article className="min-w-[210px] w-[210px] shrink-0 snap-start flex flex-col rounded-3xl bg-white p-3 shadow-xs border border-[#E2DED8]/60">
          <div className="relative w-full aspect-square rounded-2xl bg-[#F8FAF7] overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&q=80"
              alt="Anua Toner"
              className="w-full h-full object-cover"
            />
            <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-[#D4F6A2] text-[#062402] text-[10px] font-bold shadow-xs">
              -12%
            </span>
            <div className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-md text-[#062402] text-[10px] font-semibold flex items-center gap-1 shadow-xs">
              <span className="material-symbols-outlined text-[12px] text-[#4b6723]">water_drop</span>
              pH Calming
            </div>
          </div>
          <div className="pt-2.5 flex flex-col flex-1 justify-between gap-2">
            <div>
              <div className="flex items-center gap-1 text-[11px] text-[#43483f] mb-0.5">
                <span className="material-symbols-outlined text-[13px] text-[#4b6723]">star</span>
                <span className="font-bold text-[#181C1A]">5.0</span>
                <span className="opacity-70">(512)</span>
              </div>
              <h4 className="text-xs font-bold text-[#181C1A] line-clamp-1">
                Anua Heartleaf 77% Toner
              </h4>
              <p className="text-[10px] text-[#43483f] truncate">Acne-safe formula 250ml</p>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#E2DED8]/40">
              <div>
                <span className="text-[10px] text-[#43483f] line-through block leading-none">
                  ৳ 2,400
                </span>
                <span className="text-sm font-bold text-[#062402]">৳ 2,100</span>
              </div>
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-[#062402] text-white flex items-center justify-center active:scale-90 transition-transform shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
          </div>
        </article>

        {/* Item 2 */}
        <article className="min-w-[210px] w-[210px] shrink-0 snap-start flex flex-col rounded-3xl bg-white p-3 shadow-xs border border-[#E2DED8]/60">
          <div className="relative w-full aspect-square rounded-2xl bg-[#F8FAF7] overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=300&q=80"
              alt="Laneige Lip Mask"
              className="w-full h-full object-cover"
            />
            <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-[#D4F6A2] text-[#062402] text-[10px] font-bold shadow-xs">
              -18%
            </span>
            <div className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-md text-[#062402] text-[10px] font-semibold flex items-center gap-1 shadow-xs">
              <span className="material-symbols-outlined text-[12px] text-[#4b6723]">favorite</span>
              Authentic Import
            </div>
          </div>
          <div className="pt-2.5 flex flex-col flex-1 justify-between gap-2">
            <div>
              <div className="flex items-center gap-1 text-[11px] text-[#43483f] mb-0.5">
                <span className="material-symbols-outlined text-[13px] text-[#4b6723]">star</span>
                <span className="font-bold text-[#181C1A]">4.9</span>
                <span className="opacity-70">(340)</span>
              </div>
              <h4 className="text-xs font-bold text-[#181C1A] line-clamp-1">
                Laneige Lip Mask Berry
              </h4>
              <p className="text-[10px] text-[#43483f] truncate">Berry Complex 20g</p>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#E2DED8]/40">
              <div>
                <span className="text-[10px] text-[#43483f] line-through block leading-none">
                  ৳ 2,100
                </span>
                <span className="text-sm font-bold text-[#062402]">৳ 1,720</span>
              </div>
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-[#062402] text-white flex items-center justify-center active:scale-90 transition-transform shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
          </div>
        </article>

        {/* Item 3 */}
        <article className="min-w-[210px] w-[210px] shrink-0 snap-start flex flex-col rounded-3xl bg-white p-3 shadow-xs border border-[#E2DED8]/60">
          <div className="relative w-full aspect-square rounded-2xl bg-[#F8FAF7] overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1608248597359-2c6b4d326efc?auto=format&fit=crop&w=300&q=80"
              alt="Snail Mucin"
              className="w-full h-full object-cover"
            />
            <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-[#D4F6A2] text-[#062402] text-[10px] font-bold shadow-xs">
              -14%
            </span>
            <div className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-md text-[#062402] text-[10px] font-semibold flex items-center gap-1 shadow-xs">
              <span className="material-symbols-outlined text-[12px] text-[#4b6723]">spa</span>
              Snail Barrier
            </div>
          </div>
          <div className="pt-2.5 flex flex-col flex-1 justify-between gap-2">
            <div>
              <div className="flex items-center gap-1 text-[11px] text-[#43483f] mb-0.5">
                <span className="material-symbols-outlined text-[13px] text-[#4b6723]">star</span>
                <span className="font-bold text-[#181C1A]">5.0</span>
                <span className="opacity-70">(890)</span>
              </div>
              <h4 className="text-xs font-bold text-[#181C1A] line-clamp-1">
                COSRX Snail 96 Mucin
              </h4>
              <p className="text-[10px] text-[#43483f] truncate">Repairing Essence 100ml</p>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#E2DED8]/40">
              <div>
                <span className="text-[10px] text-[#43483f] line-through block leading-none">
                  ৳ 2,200
                </span>
                <span className="text-sm font-bold text-[#062402]">৳ 1,890</span>
              </div>
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-[#062402] text-white flex items-center justify-center active:scale-90 transition-transform shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
          </div>
        </article>
      </div>

      {/* iOS Progress Indicator Tracker Line */}
      <div aria-hidden="true" className="flex items-center justify-center pt-3 pb-0.5">
        <div className="w-20 h-1.5 bg-[#E2DED8] rounded-full overflow-hidden relative shadow-inner">
          <div
            className="h-full w-6 bg-[#062402] rounded-full transition-transform duration-100 ease-out"
            style={{ transform: `translateX(${indicatorOffset}px)` }}
          />
        </div>
      </div>
    </section>
  );
}
