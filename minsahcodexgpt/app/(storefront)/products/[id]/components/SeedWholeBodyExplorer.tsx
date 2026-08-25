'use client';

import React, { useState } from 'react';
import { Shield, Sparkles, Droplets, HeartPulse } from 'lucide-react';

const systems = [
  {
    id: 'barrier',
    icon: Shield,
    name: 'Barrier & Tight Junctions',
    headline: 'Reinforces Cellular Lipid Bilayer',
    description: 'Delivers bio-identical ceramides and phytosphingosine directly to damaged lipid junctions, restoring the skin barrier integrity and preventing trans-epidermal moisture loss.',
    points: [
      'Tight junction protein synthesis stimulation',
      'Protects against particulate micro-pollutants',
      'Normalizes physiological lipid balance (3:1:1 ratio)',
    ],
  },
  {
    id: 'microbiome',
    icon: Sparkles,
    name: 'Microbiome & Flora',
    headline: 'Maintains Surface Acid Mantle Stability',
    description: 'Stabilizes the skin microbiome ecosystem with bio-compatible botanical centella fractions, inhibiting inflammatory cascades and redness triggers.',
    points: [
      'Promotes beneficial skin microbiome diversity',
      'Balances cutaneous pH at optimal 5.5 acidity',
      'Neutralizes environmental micro-irritants',
    ],
  },
  {
    id: 'hydration',
    icon: Droplets,
    name: 'Deep Hydration Reserve',
    headline: 'Multi-Depth Epidermal Water Retention',
    description: 'Hydrolyzed low-molecular hyaluronic acid and beta-glucan infiltrate the lower stratum corneum, creating a continuous 24-hour hydration reservoir.',
    points: [
      'Multi-tiered molecular weight penetration',
      '20% higher moisture retention than standard HA',
      'Plumps cellular matrices from within',
    ],
  },
  {
    id: 'elasticity',
    icon: HeartPulse,
    name: 'Cellular Elasticity & Tone',
    headline: 'Fosters Extracellular Collagen Resilience',
    description: 'Asiaticoside combined with 2% Niacinamide stimulates procollagen production and smooths skin micro-texture for a luminous, rested complexion.',
    points: [
      'Supports healthy micro-circulation and oxygenation',
      'Smooths micro-texture and softens fine dehydration lines',
      'Even-tone clarity and post-inflammatory glow',
    ],
  },
];

export default function SeedWholeBodyExplorer() {
  const [activeTab, setActiveTab] = useState('barrier');
  const currentSystem = systems.find((s) => s.id === activeTab) ?? systems[0];
  const Icon = currentSystem.icon;

  return (
    <section aria-labelledby="whole-body-heading" className="py-16 sm:py-20 lg:py-24 bg-[#FAF9F6] border-b border-stone-200/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-minsah-primary">
            WHOLE-DERMAL PHYSIOLOGICAL EXPLORER
          </span>
          <h2 id="whole-body-heading" className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-minsah-dark">
            Targeted Benefits Across 4 Skin Systems
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-stone-600">
            Formulated to support the complex, interconnected biological networks of human skin rather than offering superficial temporary masking.
          </p>
        </div>

        {/* System Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {systems.map((s) => {
            const TabIcon = s.icon;
            const isActive = s.id === activeTab;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveTab(s.id)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-all shadow-xs ${
                  isActive
                    ? 'bg-stone-900 text-white'
                    : 'bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900 border border-stone-200'
                }`}
              >
                <TabIcon size={14} className={isActive ? 'text-minsah-accent' : 'text-stone-400'} />
                {s.name}
              </button>
            );
          })}
        </div>

        {/* Active System Feature Display */}
        <div className="mx-auto max-w-4xl rounded-xl border border-stone-200 bg-white p-6 sm:p-10 shadow-xs">
          <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 text-minsah-primary">
                <Icon size={20} />
                <span className="text-xs font-bold uppercase tracking-wider">{currentSystem.name}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-minsah-dark">
                {currentSystem.headline}
              </h3>
              <p className="text-sm leading-relaxed text-stone-600">
                {currentSystem.description}
              </p>
            </div>

            <div className="space-y-3 rounded-lg bg-[#FAF9F6] p-5 border border-stone-100">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block mb-2">
                Biological Actions:
              </span>
              {currentSystem.points.map((pt, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-stone-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-minsah-primary shrink-0 mt-1.5" />
                  <span className="leading-relaxed">{pt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
