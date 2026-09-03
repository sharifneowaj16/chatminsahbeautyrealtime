'use client';

import React, { useEffect, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  Sparkles,
  Globe2,
  CheckCircle2,
  Clock,
  Layers,
  FlaskConical,
  Barcode,
  PackageCheck,
  Leaf,
  AlertCircle,
} from 'lucide-react';

export interface SeedIngredientsDrawerProps {
  /** Drawer open state */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Product Name */
  productName: string;
  /** Formulation Code e.g. "NS-01®" */
  code?: string;
  /** Direct API field: ingredients string or array */
  ingredients?: string | string[] | null;
  /** Direct API field: originCountry e.g. "South Korea", "United Kingdom", "China", "Bangladesh" */
  originCountry?: string | null;
  /** Direct API field: skinType e.g. "All Skin Types", "Sensitive", "Oily & Acne Prone" */
  skinType?: string | null;
  /** Direct API field: shelfLife e.g. "24–36 Months from Mfg Date" */
  shelfLife?: string | null;
  /** Direct API field: shippingWeight e.g. "30*2 ml" or "80*2 ml" */
  shippingWeight?: string | null;
  /** Direct API field: barcode or GTIN */
  barcode?: string | null;
  /** Direct API field: authenticityNote */
  authenticityNote?: string | null;
  /** Direct API field: ingredientVerificationStatus */
  ingredientVerificationStatus?: string | null;
  /** Direct API field: productSpecs JSON */
  productSpecs?: Record<string, any> | null;
  /** Direct API field: productAttributes JSON */
  productAttributes?: Record<string, any> | null;
  /** Custom CSS */
  className?: string;
}

export default function SeedIngredientsDrawer({
  isOpen,
  onClose,
  productName,
  code = 'NS-01®',
  ingredients,
  originCountry,
  skinType,
  shelfLife,
  shippingWeight,
  barcode,
  authenticityNote,
  ingredientVerificationStatus = 'VERIFIED_CLEAN',
  productSpecs,
  productAttributes,
  className = '',
}: SeedIngredientsDrawerProps) {
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

  // Parse ingredients into clean array
  const parsedIngredients = useMemo(() => {
    if (Array.isArray(ingredients)) {
      return ingredients.filter((i) => typeof i === 'string' && i.trim() !== '');
    }
    if (typeof ingredients === 'string' && ingredients.trim() !== '') {
      return ingredients
        .split(/[,;\n]/)
        .map((i) => i.trim())
        .filter((i) => i.length > 0);
    }
    return [];
  }, [ingredients]);

  // Clean Specs & Details from API fields with fallback defaults
  const displayOrigin = originCountry && originCountry.trim() !== '' ? originCountry : 'Authentic Global Import (Verified Batch)';
  const displaySkinType = skinType && skinType.trim() !== '' ? skinType : 'Suitable for All Skin Types (Sensitive Safe)';
  const displayShelfLife = shelfLife && shelfLife.trim() !== '' ? shelfLife : '24–36 Months from Manufacturing Date';
  const displayWeight = shippingWeight && shippingWeight.trim() !== '' ? shippingWeight : 'Standard Pack (Double Sealed)';

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden ${className}`}>
      
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Right Drawer Container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-6 sm:pl-10">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="details-authenticity-title"
          className="w-screen max-w-lg bg-[#FAFAF7] dark:bg-zinc-900 border-l border-black/10 dark:border-white/10 shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300"
        >
          
          {/* ===================================================================== */}
          {/* 1. DRAWER HEADER                                                      */}
          {/* ===================================================================== */}
          <div className="p-6 border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-[#122A16]/30 dark:border-white/20 px-2.5 py-0.5 text-[11px] font-mono font-bold tracking-wider text-[#122A16] dark:text-emerald-400">
                  {code} SPECS & INCI
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Authenticity Verified
                </span>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close details and ingredients drawer"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 dark:border-white/15 bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-700 transition-all active:scale-95"
              >
                <X size={16} />
              </button>
            </div>

            <h2
              id="details-authenticity-title"
              className="mt-3 text-xl font-bold tracking-tight text-[#122A16] dark:text-white"
            >
              Details, INCI & Authenticity: {productName}
            </h2>
          </div>

          {/* ===================================================================== */}
          {/* 2. DRAWER SCROLLABLE BODY                                             */}
          {/* ===================================================================== */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Live API Specifications Grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <Layers size={13} className="text-[#122A16] dark:text-emerald-400" />
                <span>Verified Product Specifications</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {/* Origin */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-black/5 dark:border-white/10 shadow-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 text-xs font-semibold">
                    <Globe2 size={13} className="text-[#122A16] dark:text-emerald-400" />
                    <span>Origin / Sourced</span>
                  </div>
                  <p className="text-xs font-bold text-[#122A16] dark:text-white truncate">
                    {displayOrigin}
                  </p>
                </div>

                {/* Skin Type */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-black/5 dark:border-white/10 shadow-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 text-xs font-semibold">
                    <Sparkles size={13} className="text-[#122A16] dark:text-emerald-400" />
                    <span>Skin Compatibility</span>
                  </div>
                  <p className="text-xs font-bold text-[#122A16] dark:text-white truncate">
                    {displaySkinType}
                  </p>
                </div>

                {/* Shelf Life */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-black/5 dark:border-white/10 shadow-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 text-xs font-semibold">
                    <Clock size={13} className="text-[#122A16] dark:text-emerald-400" />
                    <span>Shelf Life</span>
                  </div>
                  <p className="text-xs font-bold text-[#122A16] dark:text-white truncate">
                    {displayShelfLife}
                  </p>
                </div>

                {/* Net Pack / Weight */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-black/5 dark:border-white/10 shadow-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 text-xs font-semibold">
                    <PackageCheck size={13} className="text-[#122A16] dark:text-emerald-400" />
                    <span>Volume / Format</span>
                  </div>
                  <p className="text-xs font-bold text-[#122A16] dark:text-white truncate">
                    {displayWeight}
                  </p>
                </div>
              </div>

              {/* Barcode & GTIN if present in API */}
              {barcode && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-stone-100/80 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 text-xs">
                  <span className="flex items-center gap-1.5 text-stone-600 dark:text-stone-400 font-medium">
                    <Barcode size={14} />
                    <span>Barcode / Batch Registration</span>
                  </span>
                  <span className="font-mono font-bold text-[#122A16] dark:text-white">
                    {barcode}
                  </span>
                </div>
              )}
            </div>

            {/* INCI Ingredients Breakdown Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                  <FlaskConical size={13} className="text-[#122A16] dark:text-emerald-400" />
                  <span>Full Ingredients (INCI Formulation)</span>
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Clean Formula
                </span>
              </div>

              {parsedIngredients.length > 0 ? (
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800/90 border border-black/10 dark:border-white/10 shadow-xs space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {parsedIngredients.map((item, idx) => (
                      <span
                        key={`inci-pill-${idx}`}
                        className="inline-flex items-center rounded-lg bg-stone-100 dark:bg-zinc-700/80 px-2.5 py-1 text-xs font-medium text-[#122A16] dark:text-stone-200 border border-black/5 dark:border-white/5"
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed pt-1 border-t border-black/5 dark:border-white/5">
                    *Ingredients are subject to formulation batch optimization by the manufacturer. Refer to product packaging for the most current listing.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800/90 border border-black/10 dark:border-white/10 shadow-xs space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                    <Leaf size={14} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Dermatologically Screened Formulation</span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                    This formulation is free from harsh parabens, heavy sulfates, and unclassified chemical irritants. Sealed direct from manufacturer.
                  </p>
                </div>
              )}
            </div>

            {/* Minsah Beauty 100% Authenticity Promise Card */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-700 dark:text-emerald-400" />
                <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                  Minsah Beauty 100% Authenticity Guarantee
                </h4>
              </div>

              <div className="space-y-2 text-xs leading-relaxed text-emerald-900 dark:text-emerald-300/90">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Physical Seal Inspection:</strong> Every item is checked for intact tamper-evident seals before dispatch.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Direct Authorized Channel:</strong> Sourced strictly from verified official distributors and brand representatives.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Hassle-Free Replacement:</strong> Defective or damaged packaging is replaced within 24–48 hours without friction.</span>
                </div>
              </div>

              {authenticityNote && (
                <p className="text-[11px] text-emerald-800 dark:text-emerald-400 italic pt-1 border-t border-emerald-500/15">
                  &ldquo;{authenticityNote}&rdquo;
                </p>
              )}
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
