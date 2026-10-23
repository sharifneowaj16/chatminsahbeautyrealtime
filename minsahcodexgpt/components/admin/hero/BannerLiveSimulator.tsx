'use client';

import React, { useState } from 'react';
import { Smartphone, Monitor } from 'lucide-react';
import type { HeroSlide } from '@/components/home/hero/types';
import MobileHeroSlider from '@/components/home/hero/MobileHeroSlider';
import DesktopHeroSlider from '@/components/home/hero/DesktopHeroSlider';

interface BannerLiveSimulatorProps {
  slides: HeroSlide[];
}

export default function BannerLiveSimulator({ slides }: BannerLiveSimulatorProps) {
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');
  const activeSlides = slides.filter((s) => s.isActive);

  return (
    <div className="bg-stone-100 dark:bg-stone-900/60 p-4 rounded-2xl border border-stone-200/80">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-200">
        <div>
          <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
            Live Carousel Simulator (3-Second Auto Slide)
          </h4>
          <p className="text-[11px] text-stone-500">
            Preview 2% peek and smooth auto-sliding with current active slides.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-white dark:bg-stone-800 p-1 rounded-lg border border-stone-200">
          <button
            type="button"
            onClick={() => setViewMode('mobile')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'mobile'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('desktop')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'desktop'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </button>
        </div>
      </div>

      {activeSlides.length === 0 ? (
        <div className="py-8 text-center text-xs text-stone-400">
          No active slides to preview. Add or enable at least one slide above.
        </div>
      ) : (
        <div className="overflow-hidden flex justify-center py-2">
          {viewMode === 'mobile' ? (
            <div className="w-[390px] border border-stone-300 rounded-[28px] p-2 bg-white dark:bg-stone-950 shadow-md">
              <MobileHeroSlider slides={activeSlides} intervalMs={3000} />
            </div>
          ) : (
            <div className="w-full bg-white dark:bg-stone-950 p-3 rounded-xl border border-stone-300 shadow-md">
              {/* Force desktop slider visibility in desktop simulator */}
              <div className="block">
                <DesktopHeroSlider slides={activeSlides} intervalMs={3000} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
