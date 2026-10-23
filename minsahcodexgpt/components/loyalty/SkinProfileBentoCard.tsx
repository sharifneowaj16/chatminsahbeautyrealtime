'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Smile, Sun, ArrowUpRight } from 'lucide-react';

export default function SkinProfileBentoCard() {
  const [isFragranceFree, setIsFragranceFree] = useState(true);

  return (
    <div className="bg-[#F2F6F0] rounded-2xl p-3.5 shadow-sm border border-[#E2DED8]/60">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <Smile className="w-4 h-4 text-[#4b6723]" />
          <h3 className="text-[14px] text-[#062402] font-bold">
            Skin Profile
          </h3>
          <span className="px-1.5 py-0.2 rounded bg-[#EAF7D8] text-[#1c3a13] text-[9px] font-bold">
            Synced
          </span>
        </div>
        <Link
          href="/account"
          className="text-[11px] text-[#4b6723] font-bold hover:underline flex items-center gap-0.5"
        >
          <span>Edit Profile</span>
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Bento Pills Row */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
        <span className="px-2.5 py-1 rounded-full bg-white text-[#062402] text-[11px] font-semibold border border-[#E2DED8]/60 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4b6723]" />
          Combination &amp; Dehydrated
        </span>
        <span className="px-2.5 py-1 rounded-full bg-[#EAF7D8] text-[#1c3a13] text-[11px] font-semibold">
          Barrier Repair
        </span>
        <span className="px-2.5 py-1 rounded-full bg-[#EAF7D8] text-[#1c3a13] text-[11px] font-semibold">
          Pore Care
        </span>
      </div>

      {/* Switch & Climate Weather Chip Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-xl p-2 flex items-center justify-between border border-[#E2DED8]/60">
          <div className="min-w-0 pr-1">
            <p className="text-[11px] text-[#062402] font-bold truncate">
              Fragrance-Free
            </p>
            <p className="text-[9px] text-[#43483f] truncate">
              Auto-filter active
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={isFragranceFree}
              onChange={() => setIsFragranceFree(!isFragranceFree)}
              className="sr-only peer"
            />
            <div className="w-8 h-4.5 bg-[#e3e2e0] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#062402]" />
          </label>
        </div>

        <div className="bg-white rounded-xl p-2 flex items-center gap-1.5 border border-[#E2DED8]/60">
          <Sun className="w-4 h-4 text-[#4b6723] shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] text-[#062402] font-bold truncate">
              Monsoon Shield
            </p>
            <p className="text-[9px] text-[#4b6723] truncate">
              82% Humidity active
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
