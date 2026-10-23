'use client';

import React, { useState } from 'react';
import { Smartphone, Monitor } from 'lucide-react';
import type { FlashDealsConfig } from '@/components/home/flash-deals/types';
import FlashDealsSection from '@/components/home/flash-deals/FlashDealsSection';

interface FlashDealsLiveSimulatorProps {
  config: FlashDealsConfig;
}

export default function FlashDealsLiveSimulator({ config }: FlashDealsLiveSimulatorProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  return (
    <div className="bg-[#161824] p-5 rounded-2xl border border-[#232636]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#232636]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h4 className="text-xs font-bold text-[#f7f8f8] uppercase tracking-wider">
              Live Flash Deals Simulator
            </h4>
          </div>
          <p className="text-[11px] text-[#8a8f98] mt-0.5">
            Real-time interactive preview of 5-column desktop and vertical mobile views before saving.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-[#0b0c14] p-1 rounded-xl border border-[#232636]">
          <button
            type="button"
            onClick={() => setViewMode('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'desktop'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-[#8a8f98] hover:text-[#f7f8f8]'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'mobile'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-[#8a8f98] hover:text-[#f7f8f8]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile</span>
          </button>
        </div>
      </div>

      {/* Simulator Frame */}
      <div className="w-full flex justify-center py-2 overflow-x-auto bg-[#0b0c14] rounded-2xl p-3 border border-[#232636]/60">
        <div
          className={`transition-all duration-300 ${
            viewMode === 'mobile'
              ? 'w-full max-w-[390px] min-h-[500px] border border-[#232636] rounded-[36px] p-2 bg-[#051424] shadow-2xl'
              : 'w-full max-w-6xl'
          }`}
        >
          {viewMode === 'mobile' && (
            <div className="w-full flex justify-center py-1 mb-2">
              <div className="w-24 h-4 bg-[#161824] rounded-full border border-[#232636]" />
            </div>
          )}

          <FlashDealsSection config={config} />
        </div>
      </div>
    </div>
  );
}
