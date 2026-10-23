'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowUp, ArrowDown, Trash2, Eye, EyeOff, Link as LinkIcon } from 'lucide-react';
import type { HeroSlide } from '@/components/home/hero/types';

interface BannerSlideCardProps {
  slide: HeroSlide;
  index: number;
  totalSlides: number;
  onUpdate: (updated: HeroSlide) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

export default function BannerSlideCard({
  slide,
  index,
  totalSlides,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onDelete,
}: BannerSlideCardProps) {
  return (
    <div className={`p-4 rounded-xl border transition-all ${
      slide.isActive
        ? 'bg-white border-stone-200/90 shadow-2xs dark:bg-stone-900 dark:border-stone-800'
        : 'bg-stone-50 border-dashed border-stone-300 opacity-60 dark:bg-stone-950 dark:border-stone-800'
    }`}>
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Thumbnail Preview */}
        <div className="relative w-full sm:w-44 h-24 sm:h-20 shrink-0 rounded-lg overflow-hidden bg-stone-100 border border-stone-200">
          <Image
            src={slide.imageUrl}
            alt={slide.title || 'Slide preview'}
            fill
            className="object-cover object-center"
            sizes="180px"
          />
          <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold">
            #{index + 1}
          </span>
        </div>

        {/* Inputs */}
        <div className="flex-1 w-full space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-stone-500 mb-0.5">
                Banner Headline / Title
              </label>
              <input
                type="text"
                value={slide.title || ''}
                onChange={(e) => onUpdate({ ...slide, title: e.target.value })}
                placeholder="e.g. 100% Authentic Korean Beauty"
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-stone-500 mb-0.5">
                Target Link (Destination URL)
              </label>
              <div className="relative">
                <LinkIcon className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={slide.linkHref || ''}
                  onChange={(e) => onUpdate({ ...slide, linkHref: e.target.value })}
                  placeholder="e.g. /shop, /flash-sale"
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-stone-200 text-xs bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-stone-500 mb-0.5">
              Subtitle (Optional benefit copy)
            </label>
            <input
              type="text"
              value={slide.subtitle || ''}
              onChange={(e) => onUpdate({ ...slide, subtitle: e.target.value })}
              placeholder="e.g. Fresh batch dispatched directly in 24 hours"
              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs bg-white dark:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex sm:flex-col items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={index === 0}
              title="Move Up"
              className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-30 transition-colors"
            >
              <ArrowUp className="w-4 h-4 text-stone-600" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={index === totalSlides - 1}
              title="Move Down"
              className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-30 transition-colors"
            >
              <ArrowDown className="w-4 h-4 text-stone-600" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onUpdate({ ...slide, isActive: !slide.isActive })}
              title={slide.isActive ? 'Hide slide' : 'Show slide'}
              className={`p-1.5 rounded-lg border transition-colors ${
                slide.isActive
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-stone-200 bg-stone-100 text-stone-500'
              }`}
            >
              {slide.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onDelete}
              title="Delete Slide"
              className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
