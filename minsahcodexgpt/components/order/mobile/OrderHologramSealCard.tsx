'use client';

import React from 'react';

interface OrderHologramSealCardProps {
  authCode?: string;
  onDownloadGuarantee?: () => void;
}

export default function OrderHologramSealCard({
  authCode = '#MB-AUTH-9428G',
  onDownloadGuarantee,
}: OrderHologramSealCardProps) {
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#F2F6F0] via-[#e9e8e5] to-[#EAF7D8] p-5 shadow-md border border-[#ccee9b]/50">
      {/* Decorative ambient blur */}
      <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-[#ccee9b]/30 blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#062402] flex items-center justify-center text-[#c7edb5] shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#4b6723] uppercase tracking-wider block">
              Verified Sourced Multi-Brand
            </span>
            <h3 className="text-[17px] font-bold text-[#181C1A] tracking-tight">
              100% Genuine Guarantee
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white/90 px-2.5 py-1 rounded-full text-[#4b6723] text-[11px] font-bold shadow-xs">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Authorized Stock</span>
        </div>
      </div>

      {/* Holographic Tamper Card Showcase */}
      <div className="bg-white/95 backdrop-blur-md rounded-[22px] p-4 shadow-sm mb-4 relative z-10 border border-[#E2DED8]/60">
        <div className="flex items-center gap-3.5">
          {/* Prismatic Hologram Stylized Preview Frame */}
          <div className="relative w-20 h-20 rounded-[18px] flex-shrink-0 bg-gradient-to-tr from-[#e9e8e5] via-[#EAF7D8] to-[#46673a]/20 flex flex-col items-center justify-center p-1.5 shadow-inner overflow-hidden border border-[#ccee9b]">
            <div className="w-full h-full rounded-[14px] bg-white flex flex-col items-center justify-center gap-0.5 shadow-sm">
              <svg className="text-[#062402]" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span className="text-[7px] font-black text-[#4b6723] tracking-widest uppercase">
                MINSAH-AUTH
              </span>
            </div>
          </div>

          {/* Serial Details */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-bold text-[#5A615D] uppercase tracking-wider">
                Authenticity Verification Code
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#4b6723]" />
            </div>
            <span className="text-[16px] font-bold text-[#062402] font-mono tracking-tight truncate">
              {authCode}
            </span>
            <p className="text-[11px] text-[#5A615D] line-clamp-2 mt-0.5 leading-snug">
              Scan upon delivery to verify genuine product seal, authorized batch code, and tamper-evident packaging.
            </p>
          </div>
        </div>

        {/* Trust Bar */}
        <div className="mt-3.5 pt-2.5 bg-[#F2F6F0]/70 rounded-xl px-3 py-2 flex items-center justify-between gap-2 border border-[#E2DED8]/40">
          <div className="flex items-center gap-1.5">
            <svg className="text-[#4b6723]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="text-[11px] font-bold text-[#181C1A]">
              Authorized Distributor Sourced
            </span>
          </div>
          <span className="text-[11px] text-[#5A615D] font-medium">
            100% Genuine Guarantee
          </span>
        </div>
      </div>

      {/* Provenance Action */}
      <button
        type="button"
        onClick={onDownloadGuarantee || (() => alert('Downloading official Minsah Authenticity Certificate (PDF)...'))}
        className="w-full h-11 rounded-full bg-white text-[#062402] hover:bg-[#EAF7D8] text-[12px] font-bold flex items-center justify-center gap-2 shadow-xs transition-colors active:scale-98 border border-[#E2DED8]/60 relative z-10"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>Download Authenticity Guarantee (PDF)</span>
      </button>
    </section>
  );
}
