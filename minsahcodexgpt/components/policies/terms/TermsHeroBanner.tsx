'use client';

import React from 'react';

export function TermsHeroBanner() {
  return (
    <section className="bg-gradient-to-b from-[#1c3a13] to-[#254d1a] text-white px-5 sm:px-8 pt-7 pb-8 relative overflow-hidden">
      <div className="absolute -right-16 -top-16 w-56 h-56 bg-[#D4F6A2]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-12 bottom-0 w-44 h-44 bg-black/30 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs text-[#D4F6A2] border border-white/10 mb-3">
          <span className="w-2 h-2 rounded-full bg-[#D4F6A2] animate-pulse" />
          <span>Last Updated: October 2024</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2 leading-tight">
          Legal Terms of Use &amp; Customer Agreement
        </h2>
        <p className="text-sm text-white/80 leading-relaxed max-w-xl font-normal">
          Welcome to Minsah Beauty. Please read these terms governing product authenticity, doorstep delivery, safe payments, and consumer rights under Bangladesh Law before purchasing.
        </p>

        {/* Compliance Mini Pills */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2.5 text-center border border-white/10">
            <p className="text-xs font-bold text-[#D4F6A2]">100% Authentic</p>
            <p className="text-[10px] text-white/70">Worldwide Certified</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2.5 text-center border border-white/10">
            <p className="text-xs font-bold text-[#D4F6A2]">14-Day Return</p>
            <p className="text-[10px] text-white/70">Hassle-free Dhaka pickup</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2.5 text-center border border-white/10">
            <p className="text-xs font-bold text-[#D4F6A2]">BD Law Compliant</p>
            <p className="text-[10px] text-white/70">Act No. 26 of 2009</p>
          </div>
        </div>
      </div>
    </section>
  );
}
