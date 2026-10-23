'use client';

import React from 'react';
import { SlidersHorizontal, Sparkles } from 'lucide-react';
import type { AccountRegionalProfile } from './types';

interface AccountRegionalSkinProfileCardProps {
  regional: AccountRegionalProfile;
  onUpdateSkinDiagnostic?: () => void;
}

export default function AccountRegionalSkinProfileCard({
  regional,
  onUpdateSkinDiagnostic,
}: AccountRegionalSkinProfileCardProps) {
  return (
    <section className="w-full bg-[#F8FAF7] rounded-3xl p-5 shadow-xs space-y-4 border border-[#E2DED8]/60">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#c7edb5] flex items-center justify-center text-[#062402]">
          <SlidersHorizontal className="w-4 h-4" />
        </div>
        <h3 className="text-sm text-[#062402] font-bold">Regional &amp; Skin Profile</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-2xl bg-white border border-[#E2DED8]/50 shadow-2xs">
          <span className="text-[10px] uppercase text-[#5A615D] font-bold">Currency</span>
          <p className="text-sm text-[#062402] font-bold mt-0.5">{regional.currency}</p>
        </div>
        <div className="p-3 rounded-2xl bg-white border border-[#E2DED8]/50 shadow-2xs">
          <span className="text-[10px] uppercase text-[#5A615D] font-bold">Language</span>
          <p className="text-sm text-[#062402] font-bold mt-0.5">{regional.language}</p>
        </div>
      </div>

      <div className="p-3.5 rounded-2xl bg-white flex items-center justify-between border border-[#E2DED8]/50 shadow-2xs">
        <div>
          <div className="flex items-center gap-1 text-[#4b6723]">
            <Sparkles className="w-3 h-3" />
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Custom Skin Diagnostic
            </span>
          </div>
          <p className="text-xs font-bold text-[#062402] mt-0.5">{regional.skinDiagnostic}</p>
        </div>
        <button
          type="button"
          onClick={onUpdateSkinDiagnostic}
          className="h-8 px-3 rounded-full bg-[#F2F6F0] text-[#062402] font-bold text-[11px] hover:bg-[#E8F0E5] transition-colors active:scale-95 shadow-2xs border border-[#E2DED8]"
        >
          Update
        </button>
      </div>
    </section>
  );
}
