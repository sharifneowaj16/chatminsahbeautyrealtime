'use client';

import React, { useState } from 'react';
import { ShieldCheck, Sparkles, Layers, Zap } from 'lucide-react';

export default function SeedDeliveryTechnology() {
  const [activePhase, setActivePhase] = useState<'outer' | 'inner'>('outer');

  return (
    <section aria-labelledby="delivery-technology-heading" className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-minsah-primary">
            <Layers size={13} aria-hidden="true" />
            2-IN-1 DERMAL DELIVERY TECHNOLOGY
          </span>
          <h2 id="delivery-technology-heading" className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-minsah-dark">
            Micro-Liposomal Nested Delivery System
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-stone-600">
            Formulated with an advanced dual-action architecture designed to shield sensitive active ingredients from oxidation and deliver concentrated botanical peptides deep into the stratum corneum.
          </p>
        </div>

        {/* Interactive Phase Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-full bg-[#FAF9F6] p-1.5 border border-stone-200 shadow-xs">
            <button
              type="button"
              onClick={() => setActivePhase('outer')}
              className={`rounded-full px-5 py-2 text-xs font-semibold tracking-wide transition-all ${
                activePhase === 'outer'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Phase 1: Outer Bio-Lipid Shield
            </button>
            <button
              type="button"
              onClick={() => setActivePhase('inner')}
              className={`rounded-full px-5 py-2 text-xs font-semibold tracking-wide transition-all ${
                activePhase === 'inner'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Phase 2: Inner Liposomal Core
            </button>
          </div>
        </div>

        {/* Interactive Deconstruction Display Grid */}
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center rounded-xl border border-stone-200 bg-[#FAF9F6] p-6 sm:p-10 lg:p-12">
          {/* Left: Deconstruction Visualization Sandbox */}
          <div className="relative flex aspect-square w-full max-w-md mx-auto items-center justify-center overflow-hidden rounded-xl bg-white border border-stone-200/80 p-8 shadow-xs">
            {/* Outer Capsule Simulation Layer */}
            <div
              className={`relative flex h-64 w-64 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                activePhase === 'outer'
                  ? 'border-emerald-700 bg-emerald-50/40 scale-100 ring-8 ring-emerald-100/50'
                  : 'border-stone-200 bg-stone-50 scale-95 opacity-60'
              }`}
            >
              {/* Inner Liposomal Core Simulation */}
              <div
                className={`flex h-36 w-36 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                  activePhase === 'inner'
                    ? 'border-minsah-primary bg-minsah-primary/15 scale-105 ring-8 ring-minsah-primary/20 shadow-xs'
                    : 'border-stone-300 bg-white scale-90'
                }`}
              >
                <div className="text-center p-2">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-minsah-dark">
                    Active Core
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono">
                    {activePhase === 'inner' ? '50,000 ppm Centella' : 'Bio-Peptides'}
                  </span>
                </div>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 right-4 text-center">
              <span className="inline-block rounded-full bg-stone-900/80 backdrop-blur px-3 py-1 text-[11px] font-medium text-white">
                {activePhase === 'outer' ? 'Showing: External Moisture Shield' : 'Showing: Deep Penetration Core'}
              </span>
            </div>
          </div>

          {/* Right: Technical Explanation & Clinical Efficacy */}
          <div className="space-y-6">
            {activePhase === 'outer' ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-900">
                  <ShieldCheck size={14} className="text-emerald-700" />
                  Stratum Corneum Moisture Lock
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-minsah-dark">
                  Phase 1: Bio-Mimetic Lipid Moisture Shield
                </h3>
                <p className="text-sm leading-relaxed text-stone-600">
                  The outer bio-lipid phase is engineered with physiological ratios of Ceramides NP, AP, and EOP combined with botanical squalane. It acts as a protective shield that prevents trans-epidermal moisture loss (TEWL) and defends the skin against environmental stressors.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-lg border border-stone-200 bg-white p-3.5">
                    <span className="block text-lg font-bold text-minsah-dark">+98.2%</span>
                    <span className="text-xs text-stone-500">Surface Hydration Retention</span>
                  </div>
                  <div className="rounded-lg border border-stone-200 bg-white p-3.5">
                    <span className="block text-lg font-bold text-minsah-dark">24 Hours</span>
                    <span className="text-xs text-stone-500">Continuous Barrier Shield</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-semibold text-orange-900">
                  <Zap size={14} className="text-minsah-primary" />
                  Targeted Micro-Dermal Delivery
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-minsah-dark">
                  Phase 2: Micro-Encapsulated Active Core
                </h3>
                <p className="text-sm leading-relaxed text-stone-600">
                  Protected inside the lipid vesicle, concentrated Centella Asiatica titrated extract (Madecassoside, Asiaticoside) and multi-molecular weight hyaluronic acids bypass surface degradation to deliver restorative botanicals directly into deeper dermal layers.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-lg border border-stone-200 bg-white p-3.5">
                    <span className="block text-lg font-bold text-minsah-dark">3.8x</span>
                    <span className="text-xs text-stone-500">Deeper Bio-Availability</span>
                  </div>
                  <div className="rounded-lg border border-stone-200 bg-white p-3.5">
                    <span className="block text-lg font-bold text-minsah-dark">100%</span>
                    <span className="text-xs text-stone-500">Active Potency Preserved</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-stone-200/80 text-xs text-stone-500 flex items-center gap-2">
              <Sparkles size={13} className="text-minsah-primary" />
              Dermatologically tested on sensitive &amp; barrier-compromised skin profiles.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
