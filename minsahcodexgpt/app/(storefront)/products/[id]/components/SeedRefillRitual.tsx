import React from 'react';
import { PackageCheck, RefreshCw, Sparkles, Leaf } from 'lucide-react';

const steps = [
  {
    step: '01',
    icon: PackageCheck,
    title: 'Keepsake Glass Vessel',
    description: 'Your initial order arrives in a heavy, UV-protective frosted glass jar engineered to shield botanical actives from light degradation.',
  },
  {
    step: '02',
    icon: RefreshCw,
    title: 'Fresh-Sealed Bio-Refills',
    description: 'Subsequent refills arrive in 100% hermetically sealed, nitrogen-flushed protective pouches, guaranteeing peak laboratory freshness.',
  },
  {
    step: '03',
    icon: Leaf,
    title: 'Zero Waste Commitment',
    description: 'Shipped in biodegradable, compostable protective trays grown from natural bio-fibers. Zero single-use plastic foam.',
  },
];

export default function SeedRefillRitual() {
  return (
    <section aria-labelledby="refill-ritual-heading" className="py-16 sm:py-20 lg:py-24 bg-white border-b border-stone-200/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-minsah-primary">
            <Sparkles size={13} aria-hidden="true" />
            SUSTAINABLE PACKAGING HARDWARE
          </span>
          <h2 id="refill-ritual-heading" className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-minsah-dark">
            The Keepsake Vessel &amp; Refill System
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-stone-600">
            Engineered to minimize ecological impact while maintaining absolute clinical potency from our laboratories directly to your vanity.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="relative rounded-xl border border-stone-200 bg-[#FAF9F6] p-6 sm:p-8 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-bold text-minsah-primary bg-white border border-stone-200 px-2.5 py-1 rounded-full">
                      STEP {s.step}
                    </span>
                    <Icon size={20} className="text-stone-700" />
                  </div>
                  <h3 className="text-lg font-bold text-minsah-dark mb-2">
                    {s.title}
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-stone-600">
                    {s.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
