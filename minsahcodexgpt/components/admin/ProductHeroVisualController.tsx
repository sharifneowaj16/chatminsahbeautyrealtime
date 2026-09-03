'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Video,
  ShoppingBag,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  Clock,
  Sun,
  ShieldCheck,
  Percent,
  Truck,
  Droplets,
  HelpCircle,
} from 'lucide-react';

export interface ActionReelItem {
  id: string;
  title: string;
  creator?: string;
  avatarText?: string;
  posterUrl: string;
  videoUrl?: string;
}

export interface RitualStepItem {
  step: number;
  title: string;
  instruction: string;
  proTip?: string;
}

export interface ProductHeroVisualControllerProps {
  /** Form Values */
  descriptionSectionsJson: string;
  productSpecsJson: string;
  relatedProducts: string;
  ingredients: string;
  skinType: string[];
  shelfLife: string;
  originCountry: string;
  deliveryOfferEnabled: boolean;
  
  /** Update Callbacks */
  onDescriptionSectionsChange: (jsonStr: string) => void;
  onProductSpecsChange: (jsonStr: string) => void;
  onRelatedProductsChange: (val: string) => void;
  onDeliveryOfferToggle: (enabled: boolean) => void;
  onSkinTypeChange: (types: string[]) => void;
  className?: string;
}

export default function ProductHeroVisualController({
  descriptionSectionsJson,
  productSpecsJson,
  relatedProducts,
  ingredients,
  skinType,
  shelfLife,
  originCountry,
  deliveryOfferEnabled,
  onDescriptionSectionsChange,
  onProductSpecsChange,
  onRelatedProductsChange,
  onDeliveryOfferToggle,
  onSkinTypeChange,
  className = '',
}: ProductHeroVisualControllerProps) {
  
  // Active Tab: 1 = Video Reels, 2 = Bundle Offers, 3 = How to Apply Ritual
  const [activeTab, setActiveTab] = useState<'reels' | 'bundle' | 'ritual'>('reels');

  // =========================================================================
  // 1. VIDEO REELS STATE & SYNC (Phase 5)
  // =========================================================================
  const [reels, setReels] = useState<ActionReelItem[]>([]);

  // Parse from descriptionSectionsJson on initial load
  useEffect(() => {
    try {
      if (descriptionSectionsJson && descriptionSectionsJson !== '[]') {
        const parsed = JSON.parse(descriptionSectionsJson);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.actionReels)) {
          setReels(parsed.actionReels);
        } else if (Array.isArray(parsed)) {
          setReels(parsed);
        }
      }
    } catch {
      // Ignored if invalid json
    }
  }, [descriptionSectionsJson]);

  // Sync Reels back to descriptionSectionsJson
  const updateReels = (newReels: ActionReelItem[]) => {
    setReels(newReels);
    try {
      let existingObj: Record<string, any> = {};
      if (descriptionSectionsJson && descriptionSectionsJson !== '[]') {
        const parsed = JSON.parse(descriptionSectionsJson);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          existingObj = parsed;
        }
      }
      existingObj.actionReels = newReels;
      onDescriptionSectionsChange(JSON.stringify(existingObj, null, 2));
    } catch {
      onDescriptionSectionsChange(JSON.stringify({ actionReels: newReels }, null, 2));
    }
  };

  const addReel = () => {
    const newReel: ActionReelItem = {
      id: `reel-${Date.now()}`,
      title: 'Texture & Application Demo',
      creator: '@minsahbeauty',
      avatarText: 'M',
      posterUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80',
    };
    updateReels([...reels, newReel]);
  };

  const removeReel = (id: string) => {
    updateReels(reels.filter((r) => r.id !== id));
  };

  const updateReelField = (id: string, field: keyof ActionReelItem, val: string) => {
    const updated = reels.map((r) => (r.id === id ? { ...r, [field]: val } : r));
    updateReels(updated);
  };

  // =========================================================================
  // 2. HOW TO APPLY RITUAL MATRIX STATE & SYNC (Phase 4)
  // =========================================================================
  const [frequency, setFrequency] = useState('Daily (Twice AM/PM)');
  const [timeOfDay, setTimeOfDay] = useState('Morning & Evening');
  const [season, setSeason] = useState('All Seasons');
  const [dosage, setDosage] = useState('2–3 Drops');
  const [targetArea, setTargetArea] = useState('Full Face & Neck');
  const [steps, setSteps] = useState<RitualStepItem[]>([
    { step: 1, title: 'Cleanse & Prep', instruction: 'Wash face thoroughly and leave skin slightly damp.', proTip: 'Pat lightly, do not rub.' },
    { step: 2, title: 'Dispense & Smooth', instruction: 'Apply 2–3 drops across face using upward motions.', proTip: 'Focus on high-pigmentation zones.' },
    { step: 3, title: 'Press & Lock In', instruction: 'Press gently with warm palms for 10 seconds and follow with moisturizer.', proTip: 'Follow with SPF 50+ during daytime.' },
  ]);

  // Sync Ritual to productSpecsJson
  const syncRitualToSpecs = (
    newFreq = frequency,
    newTime = timeOfDay,
    newSeason = season,
    newDosage = dosage,
    newArea = targetArea,
    newSteps = steps
  ) => {
    try {
      let existingObj: Record<string, any> = {};
      if (productSpecsJson && productSpecsJson !== '{}') {
        const parsed = JSON.parse(productSpecsJson);
        if (parsed && typeof parsed === 'object') existingObj = parsed;
      }
      existingObj.howToApply = {
        frequency: newFreq,
        timeOfDay: newTime,
        seasonality: newSeason,
        dosage: newDosage,
        targetArea: newArea,
        steps: newSteps,
      };
      onProductSpecsChange(JSON.stringify(existingObj, null, 2));
    } catch {
      onProductSpecsChange(
        JSON.stringify(
          {
            howToApply: {
              frequency: newFreq,
              timeOfDay: newTime,
              seasonality: newSeason,
              dosage: newDosage,
              targetArea: newArea,
              steps: newSteps,
            },
          },
          null,
          2
        )
      );
    }
  };

  const addStep = () => {
    const nextSteps = [
      ...steps,
      {
        step: steps.length + 1,
        title: `Step ${steps.length + 1}: Targeted Care`,
        instruction: 'Apply gently and massage until fully absorbed.',
      },
    ];
    setSteps(nextSteps);
    syncRitualToSpecs(frequency, timeOfDay, season, dosage, targetArea, nextSteps);
  };

  const removeStep = (idx: number) => {
    const nextSteps = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 }));
    setSteps(nextSteps);
    syncRitualToSpecs(frequency, timeOfDay, season, dosage, targetArea, nextSteps);
  };

  const updateStepField = (idx: number, field: keyof RitualStepItem, val: string) => {
    const nextSteps = steps.map((s, i) => (i === idx ? { ...s, [field]: val } : s));
    setSteps(nextSteps);
    syncRitualToSpecs(frequency, timeOfDay, season, dosage, targetArea, nextSteps);
  };

  return (
    <div className={`rounded-2xl border border-emerald-500/30 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden ${className}`}>
      
      {/* Visual Controller Header */}
      <div className="bg-[#163020] text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4F6A2] text-[#163020]">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <span>Seed & Dieux Product Page Visual Controller</span>
              <span className="rounded-full bg-[#D4F6A2] text-[#163020] text-[10px] font-extrabold px-2 py-0.5 uppercase tracking-wider">
                No JSON Needed
              </span>
            </h3>
            <p className="text-xs text-emerald-200/80">
              Easily manage Video Reels, Bundle Combos, and Application Rituals with 1-click visual buttons.
            </p>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex rounded-full bg-white/10 p-1 border border-white/15 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('reels')}
            className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
              activeTab === 'reels' ? 'bg-[#D4F6A2] text-[#163020] font-bold shadow-xs' : 'text-white/80 hover:text-white'
            }`}
          >
            <Video size={13} />
            <span>Video Reels ({reels.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bundle')}
            className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
              activeTab === 'bundle' ? 'bg-[#D4F6A2] text-[#163020] font-bold shadow-xs' : 'text-white/80 hover:text-white'
            }`}
          >
            <ShoppingBag size={13} />
            <span>Bundle & Save</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ritual')}
            className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
              activeTab === 'ritual' ? 'bg-[#D4F6A2] text-[#163020] font-bold shadow-xs' : 'text-white/80 hover:text-white'
            }`}
          >
            <Layers size={13} />
            <span>How to Apply Ritual</span>
          </button>
        </div>
      </div>

      {/* Controller Content Body */}
      <div className="p-5 sm:p-6 space-y-6">
        
        {/* ===================================================================== */}
        {/* TAB 1: VIDEO REELS MANAGER (Phase 5)                                  */}
        {/* ===================================================================== */}
        {activeTab === 'reels' && (
          <div className="space-y-4 animate-in fade-in-0 duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>"SEE IT IN ACTION" 9:15 Portrait Video Reels</span>
                  <span className="text-xs font-normal text-gray-500">
                    (Shows under Accordions with Instagram Story Modal)
                  </span>
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Add video clips or image posters with creator handles. If left empty, section automatically hides.
                </p>
              </div>

              <button
                type="button"
                onClick={addReel}
                className="flex items-center gap-1.5 rounded-lg bg-[#163020] hover:bg-[#0D2B1D] text-white px-3 py-1.5 text-xs font-bold shadow-xs active:scale-95 transition-all"
              >
                <Plus size={14} />
                <span>Add Video Reel</span>
              </button>
            </div>

            {reels.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 p-8 text-center space-y-2">
                <Video size={28} className="mx-auto text-gray-400" />
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  No video clips added yet for this product.
                </p>
                <p className="text-[11px] text-gray-400">
                  Click "Add Video Reel" to display 9:16 portrait video cards with story player.
                </p>
                <button
                  type="button"
                  onClick={addReel}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 underline underline-offset-4"
                >
                  + Add 1st Reel Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {reels.map((reel, idx) => (
                  <div
                    key={reel.id}
                    className="p-3.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50/70 dark:bg-zinc-800/60 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                        Reel #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeReel(reel.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        aria-label="Remove Reel"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Reel Title / Caption
                        </label>
                        <input
                          type="text"
                          value={reel.title}
                          onChange={(e) => updateReelField(reel.id, 'title', e.target.value)}
                          placeholder="e.g. Texture & Glass-Glow"
                          className="w-full h-8 px-2.5 rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Creator Handle
                          </label>
                          <input
                            type="text"
                            value={reel.creator || ''}
                            onChange={(e) => updateReelField(reel.id, 'creator', e.target.value)}
                            placeholder="@minsahbeauty"
                            className="w-full h-8 px-2.5 rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Avatar Initial
                          </label>
                          <input
                            type="text"
                            maxLength={2}
                            value={reel.avatarText || ''}
                            onChange={(e) => updateReelField(reel.id, 'avatarText', e.target.value.toUpperCase())}
                            placeholder="M"
                            className="w-full h-8 px-2.5 rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-xs text-center font-bold font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Poster Image URL (9:16 Portrait)
                        </label>
                        <input
                          type="text"
                          value={reel.posterUrl}
                          onChange={(e) => updateReelField(reel.id, 'posterUrl', e.target.value)}
                          placeholder="https://..."
                          className="w-full h-8 px-2.5 rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Video URL (Optional MP4 / Stream)
                        </label>
                        <input
                          type="text"
                          value={reel.videoUrl || ''}
                          onChange={(e) => updateReelField(reel.id, 'videoUrl', e.target.value)}
                          placeholder="https://...mp4 (Optional)"
                          className="w-full h-8 px-2.5 rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 2: BUNDLE & SAVE / CROSS-SELL CONTROLLER (Phase 6)                */}
        {/* ===================================================================== */}
        {activeTab === 'bundle' && (
          <div className="space-y-4 animate-in fade-in-0 duration-200">
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>"Frequently Paired With" & Custom Combo Configuration</span>
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Set paired product IDs for 1-click routine combos. System automatically applies the 15%/25%/30% Real Profit discount rule!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Paired Product IDs */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50/70 dark:bg-zinc-800/60 space-y-3">
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                  Paired Product IDs (Comma Separated)
                </label>
                <input
                  type="text"
                  value={relatedProducts || ''}
                  onChange={(e) => onRelatedProductsChange(e.target.value)}
                  placeholder="e.g. prod_cm21, prod_cm84"
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-xs font-mono"
                />
                <p className="text-[11px] text-gray-500">
                  Tip: If left blank, the system uses Smart Routine pairing (Cleanser ➔ Toner ➔ Serum ➔ Cream ➔ SPF).
                </p>
              </div>

              {/* Free Delivery Perk Toggle */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50/70 dark:bg-zinc-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                      Free Delivery Campaign (Double Benefit)
                    </label>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      If enabled, customers get 100% Free Nationwide Delivery on this item & bundles!
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={deliveryOfferEnabled}
                    onChange={(e) => onDeliveryOfferToggle(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                <div className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  deliveryOfferEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200/70 text-gray-600'
                }`}>
                  <Truck size={14} />
                  <span>{deliveryOfferEnabled ? 'Free Delivery Active • Shows Green Badge on Hero' : 'Standard Courier Delivery'}</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 3: HOW TO APPLY RITUAL MATRIX (Phase 4)                           */}
        {/* ===================================================================== */}
        {activeTab === 'ritual' && (
          <div className="space-y-4 animate-in fade-in-0 duration-200">
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>Multi-Dimensional Beauty Ritual Matrix</span>
                <span className="text-xs font-normal text-gray-500">
                  (Powers the "How to Apply" Slide-Over Drawer)
                </span>
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Select application frequency, best time of day, seasonality, dosage, and step-by-step instructions.
              </p>
            </div>

            {/* Matrix Bento Grid Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              
              {/* Frequency */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  1. Frequency Dropdown
                </label>
                <select
                  value={frequency}
                  onChange={(e) => {
                    setFrequency(e.target.value);
                    syncRitualToSpecs(e.target.value, timeOfDay, season, dosage, targetArea, steps);
                  }}
                  className="w-full h-9 px-2.5 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-xs font-medium"
                >
                  <option value="Daily (Twice AM/PM)">Daily (Twice AM/PM)</option>
                  <option value="Daily (Morning / Sunrise)">Daily (Morning / Sunrise)</option>
                  <option value="Daily (Night / PM Only)">Daily (Night / PM Only)</option>
                  <option value="1–2x Weekly (Exfoliating/Mask)">1–2x Weekly (Exfoliating/Mask)</option>
                  <option value="Once Monthly (Intensive Treatment)">Once Monthly (Intensive Treatment)</option>
                  <option value="Every 2–3 Hours (Reapply SPF)">Every 2–3 Hours (Reapply SPF)</option>
                </select>
              </div>

              {/* Time of Day */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  2. Best Time of Day
                </label>
                <select
                  value={timeOfDay}
                  onChange={(e) => {
                    setTimeOfDay(e.target.value);
                    syncRitualToSpecs(frequency, e.target.value, season, dosage, targetArea, steps);
                  }}
                  className="w-full h-9 px-2.5 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-xs font-medium"
                >
                  <option value="Morning & Evening">Morning & Evening (AM/PM)</option>
                  <option value="Morning / Sunrise (Pre-Sun)">Morning / Sunrise (Pre-Sun)</option>
                  <option value="Noon / Midday Touch-up">Noon / Midday Touch-up</option>
                  <option value="Evening / Sunset (Golden Hour)">Evening / Sunset (Golden Hour)</option>
                  <option value="Night / Pre-Bedtime (Overnight)">Night / Pre-Bedtime (Overnight)</option>
                </select>
              </div>

              {/* Seasonality */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  3. Season & Climate
                </label>
                <select
                  value={season}
                  onChange={(e) => {
                    setSeason(e.target.value);
                    syncRitualToSpecs(frequency, timeOfDay, e.target.value, dosage, targetArea, steps);
                  }}
                  className="w-full h-9 px-2.5 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-xs font-medium"
                >
                  <option value="All Seasons">All Seasons (Year-Round)</option>
                  <option value="Winter & Dry Climate">Winter & Dry Climate (Deep Hydration)</option>
                  <option value="Summer & Humid Weather">Summer & Humid Weather (Lightweight)</option>
                  <option value="Monsoon & Rainy Season">Monsoon & Rainy Season (Non-Greasy)</option>
                  <option value="Post-Sun & Outdoor Exposure">Post-Sun & Outdoor Exposure</option>
                </select>
              </div>

              {/* Dosage */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  4. Recommended Dosage
                </label>
                <input
                  type="text"
                  value={dosage}
                  onChange={(e) => {
                    setDosage(e.target.value);
                    syncRitualToSpecs(frequency, timeOfDay, season, e.target.value, targetArea, steps);
                  }}
                  placeholder="e.g. 2–3 Drops"
                  className="w-full h-9 px-2.5 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-xs"
                />
              </div>

              {/* Target Area */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  5. Target Area
                </label>
                <input
                  type="text"
                  value={targetArea}
                  onChange={(e) => {
                    setTargetArea(e.target.value);
                    syncRitualToSpecs(frequency, timeOfDay, season, dosage, e.target.value, steps);
                  }}
                  placeholder="e.g. Full Face & Neck"
                  className="w-full h-9 px-2.5 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-xs"
                />
              </div>

            </div>

            {/* Step-by-Step Instructions Repeater */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Step-by-Step Application Instructions
                </span>
                <button
                  type="button"
                  onClick={addStep}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 underline underline-offset-4"
                >
                  + Add Step
                </button>
              </div>

              <div className="space-y-2.5">
                {steps.map((step, idx) => (
                  <div
                    key={`step-${idx}`}
                    className="p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50/80 dark:bg-zinc-800/80 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800 dark:text-white">
                        Step {step.step}:
                      </span>
                      {steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(idx)}
                          className="text-gray-400 hover:text-red-500 text-xs"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => updateStepField(idx, 'title', e.target.value)}
                        placeholder="Step Title (e.g. Cleanse & Prep)"
                        className="w-full h-8 px-2.5 rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-xs font-semibold"
                      />
                      <input
                        type="text"
                        value={step.proTip || ''}
                        onChange={(e) => updateStepField(idx, 'proTip', e.target.value)}
                        placeholder="Pro Tip (Optional)"
                        className="w-full h-8 px-2.5 rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-xs italic text-emerald-800 dark:text-emerald-300"
                      />
                    </div>
                    <textarea
                      value={step.instruction}
                      onChange={(e) => updateStepField(idx, 'instruction', e.target.value)}
                      rows={2}
                      placeholder="Detailed application instruction..."
                      className="w-full p-2 rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
