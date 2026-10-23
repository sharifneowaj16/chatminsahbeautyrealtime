'use client';

import React, { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle2, AlertCircle, Plus, Eye, RefreshCw } from 'lucide-react';
import type { HeroSlide, HomeHeroConfig } from '@/types/admin';
import { defaultHomeHeroConfig } from '@/lib/homeData';
import BannerUploadDropzone from './BannerUploadDropzone';
import BannerSlideCard from './BannerSlideCard';
import BannerLiveSimulator from './BannerLiveSimulator';

export default function AdminHeroSlidesManager() {
  const [heroConfig, setHeroConfig] = useState<HomeHeroConfig>(defaultHomeHeroConfig);
  const [slides, setSlides] = useState<HeroSlide[]>(defaultHomeHeroConfig.slides || []);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load config on mount
  useEffect(() => {
    let isMounted = true;
    async function loadConfig() {
      try {
        const res = await fetch('/api/admin/site-config?key=homeHero');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data) {
            setHeroConfig(data);
            if (Array.isArray(data.slides) && data.slides.length > 0) {
              setSlides(data.slides);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load hero configuration', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  // Add new slide from upload
  const handleAddSlide = (imageUrl: string) => {
    const newSlide: HeroSlide = {
      id: `slide-${Date.now()}`,
      imageUrl,
      title: '',
      subtitle: '',
      linkHref: '/shop',
      order: slides.length + 1,
      isActive: true,
    };
    setSlides((prev) => [...prev, newSlide]);
    setSaveStatus(null);
  };

  // Update existing slide
  const handleUpdateSlide = (index: number, updated: HeroSlide) => {
    setSlides((prev) => {
      const copy = [...prev];
      copy[index] = updated;
      return copy;
    });
    setSaveStatus(null);
  };

  // Move slide up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setSlides((prev) => {
      const copy = [...prev];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy.map((s, idx) => ({ ...s, order: idx + 1 }));
    });
    setSaveStatus(null);
  };

  // Move slide down
  const handleMoveDown = (index: number) => {
    if (index === slides.length - 1) return;
    setSlides((prev) => {
      const copy = [...prev];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy.map((s, idx) => ({ ...s, order: idx + 1 }));
    });
    setSaveStatus(null);
  };

  // Delete slide
  const handleDeleteSlide = (index: number) => {
    setSlides((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.map((s, idx) => ({ ...s, order: idx + 1 }));
    });
    setSaveStatus(null);
  };

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const updatedConfig: HomeHeroConfig = {
        ...heroConfig,
        slides,
        imageUrl: slides.find((s) => s.isActive)?.imageUrl || heroConfig.imageUrl || '',
      };

      const res = await fetch('/api/admin/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'homeHero',
          value: updatedConfig,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save hero banner slides');
      }

      setHeroConfig(updatedConfig);
      setSaveStatus({
        type: 'success',
        message: 'Hero banner slides saved successfully! Homepage updated.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error saving slides';
      setSaveStatus({ type: 'error', message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-stone-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
        <span>Loading hero banner slides...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
            Hero Banners & Smooth 3s Slider
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage homepage auto-sliding hero banners with 10% peek preview for mobile and desktop.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm active:scale-95 transition-all disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Saving...' : 'Save & Publish'}</span>
        </button>
      </div>

      {/* Save Notification */}
      {saveStatus && (
        <div
          className={`flex items-center gap-2 p-3.5 rounded-xl text-xs font-medium border ${
            saveStatus.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {saveStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{saveStatus.message}</span>
        </div>
      )}

      {/* 1. Easy Upload Dropzone */}
      <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 shadow-2xs">
        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-2 flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-emerald-600" />
          <span>Upload New Hero Banner</span>
        </h3>
        <BannerUploadDropzone onUploadSuccess={handleAddSlide} />
      </div>

      {/* 2. Slide Cards List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            Active Slide Stack ({slides.length} slides)
          </h3>
          <span className="text-xs text-stone-500">
            Auto-scroll interval: 3 seconds • 10% next slide preview
          </span>
        </div>

        {slides.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-400 border border-dashed rounded-xl">
            No slides configured yet. Upload a banner above to get started.
          </div>
        ) : (
          <div className="space-y-2.5">
            {slides.map((slide, idx) => (
              <BannerSlideCard
                key={slide.id || `slide-card-${idx}`}
                slide={slide}
                index={idx}
                totalSlides={slides.length}
                onUpdate={(updated) => handleUpdateSlide(idx, updated)}
                onMoveUp={() => handleMoveUp(idx)}
                onMoveDown={() => handleMoveDown(idx)}
                onDelete={() => handleDeleteSlide(idx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 3. Live Simulator Component */}
      <BannerLiveSimulator slides={slides} />
    </div>
  );
}
