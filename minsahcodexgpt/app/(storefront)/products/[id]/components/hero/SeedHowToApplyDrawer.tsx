'use client';

import React, { useEffect } from 'react';
import {
  X,
  Sparkles,
  Clock,
  Droplets,
  ShieldCheck,
  Sun,
  SunMedium,
  Moon,
  CloudRain,
  Snowflake,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Compass,
  Timer,
} from 'lucide-react';

export interface HowToApplyStep {
  step: number;
  title: string;
  instruction: string;
  proTip?: string;
}

export interface HowToApplyData {
  /** Frequency e.g. "Daily (Twice)", "1–2x Weekly", "Once Monthly", "Every 2–3 Hours" */
  frequency?: string;
  /** Time of day e.g. "Morning & Evening", "Night / PM Only", "Sunrise / Pre-Sun", "Noon / Midday" */
  timeOfDay?: string;
  /** Seasonality / Climate e.g. "All Seasons", "Winter & Dry Weather", "Summer / Humid & Rainy", "Post-Sun Care" */
  seasonality?: string;
  /** Application target area e.g. "Full Face & Neck", "Under-Eye Contour", "Scalp & Hair Roots", "Spot Treatment" */
  targetArea?: string;
  /** Recommended Dosage e.g. "2–3 Drops", "Pea-sized Amount", "1 Full Sheet Mask" */
  dosage?: string;
  /** Wait / Leave-on duration e.g. "Absorbs in 30 seconds", "Leave on for 15–20 mins", "Overnight Care" */
  duration?: string;
  /** Step-by-step instructions */
  steps?: HowToApplyStep[];
  /** Routine pairing recommendation e.g. "Pairs well with Hydrating Toner & SPF 50" */
  pairsWellWith?: string;
  /** Sensory texture profile */
  textureNote?: string;
  /** Precaution / Dermatologist notice e.g. "Always use SPF during daytime when using active acids" */
  precautionNote?: string;
}

export interface SeedHowToApplyDrawerProps {
  /** Drawer open state */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Product title */
  productName: string;
  /** Formulation code pill e.g. "NS-01®" */
  code?: string;
  /** Admin-controlled application data */
  usageData?: HowToApplyData;
  /** Custom styling class */
  className?: string;
}

export default function SeedHowToApplyDrawer({
  isOpen,
  onClose,
  productName,
  code = 'NS-01®',
  usageData = {},
  className = '',
}: SeedHowToApplyDrawerProps) {
  // Lock body scroll when drawer is open and support ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Extract admin fields with intelligent luxury fallbacks
  const {
    frequency = 'Daily (Morning & Evening)',
    timeOfDay = 'Morning & Night (AM/PM)',
    seasonality = 'All Seasons (Year-Round Formulation)',
    targetArea = 'Face, Neck & Décolleté',
    dosage = '2–3 Drops or Pea-Sized Amount',
    duration = 'Fast Absorbing (Instant Glass-Glow)',
    steps,
    pairsWellWith = 'Hydrating Barrier Toner, Moisturizer & Daytime SPF 50+',
    textureNote = 'Lightweight, silky fluid texture with non-greasy absorption and a natural radiant finish.',
    precautionNote = 'For active formulations, always perform a 24-hour patch test before initial use.',
  } = usageData;

  // Active steps list
  const activeSteps: HowToApplyStep[] =
    steps && steps.length > 0
      ? steps
      : [
          {
            step: 1,
            title: 'Cleanse & Prepare',
            instruction:
              'Wash face thoroughly with a gentle pH-balanced cleanser and pat dry, leaving skin slightly damp.',
            proTip: 'Damp skin increases active molecular penetration by up to 30%.',
          },
          {
            step: 2,
            title: 'Targeted Application',
            instruction:
              'Dispense recommended dosage onto clean fingertips and gently press into skin using upward motions.',
            proTip: 'Avoid aggressive rubbing; gentle patting prevents friction irritation.',
          },
          {
            step: 3,
            title: 'Seal & Protect',
            instruction:
              'Allow 30–60 seconds for full absorption, then follow with your regular barrier cream or sunscreen.',
            proTip: 'In daytime, always complete your ritual with broad-spectrum UV protection.',
          },
        ];

  // Helper icon for Time of Day
  const renderTimeIcon = (timeStr: string) => {
    const t = timeStr.toLowerCase();
    if (t.includes('night') || t.includes('pm') || t.includes('sunset')) {
      return <Moon size={14} className="text-indigo-600 dark:text-indigo-400" />;
    }
    if (t.includes('sunrise') || t.includes('morning') || t.includes('am')) {
      return <Sun size={14} className="text-amber-500 dark:text-amber-400" />;
    }
    return <SunMedium size={14} className="text-[#122A16] dark:text-emerald-400" />;
  };

  // Helper icon for Seasonality
  const renderSeasonIcon = (seasonStr: string) => {
    const s = seasonStr.toLowerCase();
    if (s.includes('winter') || s.includes('dry') || s.includes('cold')) {
      return <Snowflake size={14} className="text-sky-500 dark:text-sky-400" />;
    }
    if (s.includes('rain') || s.includes('monsoon') || s.includes('humid')) {
      return <CloudRain size={14} className="text-teal-500 dark:text-teal-400" />;
    }
    if (s.includes('summer') || s.includes('sun')) {
      return <Sun size={14} className="text-orange-500 dark:text-orange-400" />;
    }
    return <Compass size={14} className="text-[#122A16] dark:text-emerald-400" />;
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden ${className}`}>
      
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Right Drawer */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-6 sm:pl-10">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="how-to-apply-modal-title"
          className="w-screen max-w-lg bg-[#FAFAF7] dark:bg-zinc-900 border-l border-black/10 dark:border-white/10 shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300"
        >
          
          {/* ===================================================================== */}
          {/* 1. DRAWER HEADER                                                      */}
          {/* ===================================================================== */}
          <div className="p-6 border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-[#122A16]/30 dark:border-white/20 px-2.5 py-0.5 text-[11px] font-mono font-bold tracking-wider text-[#122A16] dark:text-emerald-400">
                  {code} RITUAL MATRIX
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Full Usage Guide
                </span>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close ritual guide drawer"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 dark:border-white/15 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-700 transition-all active:scale-95"
              >
                <X size={16} />
              </button>
            </div>

            <h2
              id="how-to-apply-modal-title"
              className="mt-3 text-xl font-bold tracking-tight text-[#122A16] dark:text-white"
            >
              How to Apply: {productName}
            </h2>
          </div>

          {/* ===================================================================== */}
          {/* 2. DRAWER SCROLLABLE BODY (4-Box Multi-Dimensional Beauty Matrix)     */}
          {/* ===================================================================== */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* 4-Bento Parameter Matrix (Admin Frequency, Timing, Climate, Target Area) */}
            <div className="grid grid-cols-2 gap-3">
              
              {/* Box 1: Frequency */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-black/5 dark:border-white/10 shadow-xs space-y-1">
                <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 text-xs font-semibold">
                  <Calendar size={13} className="text-[#122A16] dark:text-emerald-400" />
                  <span>Frequency</span>
                </div>
                <p className="text-xs font-bold text-[#122A16] dark:text-white">
                  {frequency}
                </p>
              </div>

              {/* Box 2: Optimal Time of Day */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-black/5 dark:border-white/10 shadow-xs space-y-1">
                <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 text-xs font-semibold">
                  {renderTimeIcon(timeOfDay)}
                  <span>Time of Day</span>
                </div>
                <p className="text-xs font-bold text-[#122A16] dark:text-white">
                  {timeOfDay}
                </p>
              </div>

              {/* Box 3: Seasonality & Climate */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-black/5 dark:border-white/10 shadow-xs space-y-1">
                <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 text-xs font-semibold">
                  {renderSeasonIcon(seasonality)}
                  <span>Climate / Season</span>
                </div>
                <p className="text-xs font-bold text-[#122A16] dark:text-white">
                  {seasonality}
                </p>
              </div>

              {/* Box 4: Dosage & Target Area */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-black/5 dark:border-white/10 shadow-xs space-y-1">
                <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 text-xs font-semibold">
                  <Droplets size={13} className="text-[#122A16] dark:text-emerald-400" />
                  <span>Dosage & Zone</span>
                </div>
                <p className="text-xs font-bold text-[#122A16] dark:text-white truncate">
                  {dosage} • {targetArea}
                </p>
              </div>

            </div>

            {/* Step-by-Step Sequence */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Step-by-Step Application Ritual
                </h3>
                <span className="text-[11px] font-mono font-medium text-stone-500 dark:text-stone-400 flex items-center gap-1">
                  <Timer size={12} />
                  {duration}
                </span>
              </div>

              <div className="space-y-3">
                {activeSteps.map((stepItem) => (
                  <div
                    key={`usage-step-card-${stepItem.step}`}
                    className="p-4 rounded-2xl bg-white dark:bg-zinc-800/90 border border-black/10 dark:border-white/10 shadow-xs space-y-2 transition-all hover:border-[#122A16]/25 dark:hover:border-white/20"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#122A16] dark:bg-emerald-500 text-white text-xs font-mono font-bold shrink-0">
                        {stepItem.step}
                      </span>
                      <h4 className="text-sm font-bold text-[#122A16] dark:text-white">
                        {stepItem.title}
                      </h4>
                    </div>

                    <p className="text-xs leading-relaxed text-stone-700 dark:text-stone-300 pl-9">
                      {stepItem.instruction}
                    </p>

                    {stepItem.proTip && (
                      <div className="ml-9 p-2.5 rounded-xl bg-[#122A16]/5 dark:bg-emerald-950/20 border border-[#122A16]/10 dark:border-emerald-500/20 text-[11px] text-[#122A16] dark:text-emerald-300 flex items-start gap-1.5">
                        <Sparkles size={12} className="shrink-0 mt-0.5" />
                        <span><strong>Pro Tip:</strong> {stepItem.proTip}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Texture & Sensory Profile */}
            <div className="p-4 rounded-2xl bg-stone-100/80 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 space-y-1.5">
              <h4 className="text-xs font-bold text-[#122A16] dark:text-white flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#122A16] dark:text-emerald-400" />
                <span>Sensory Feel & Texture</span>
              </h4>
              <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                {textureNote}
              </p>
            </div>

            {/* Routine Compatibility */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-1.5">
              <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                <span>Pairs Best With</span>
              </h4>
              <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-400">
                {pairsWellWith}
              </p>
            </div>

            {/* Precaution Note */}
            <div className="flex items-start gap-2 text-[11px] text-stone-500 dark:text-stone-400 pt-1">
              <ShieldCheck size={14} className="text-stone-600 dark:text-stone-400 shrink-0 mt-0.5" />
              <span>
                <strong>Safety & Patch Test:</strong> {precautionNote}
              </span>
            </div>

          </div>

          {/* ===================================================================== */}
          {/* 3. DRAWER FOOTER                                                      */}
          {/* ===================================================================== */}
          <div className="p-4 sm:p-5 border-t border-black/10 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md">
            <button
              type="button"
              onClick={onClose}
              className="w-full h-11 flex items-center justify-center rounded-full bg-[#122A16] hover:bg-[#0c1d0f] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white font-semibold text-xs tracking-wide transition-all active:scale-[0.99]"
            >
              Got It • Return to Product
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
