import React from 'react';

const stats = [
  {
    metric: '50,000 ppm',
    label: 'Bio-Active Centella Matrix',
    sublabel: 'Standardized therapeutic concentration for rapid cellular soothing.',
  },
  {
    metric: '99.4%',
    label: 'Barrier Repair Rate',
    sublabel: 'Clinically proven reduction in trans-epidermal water loss (TEWL).',
  },
  {
    metric: '5 Types',
    label: 'Multi-Depth Ceramides',
    sublabel: 'Complete physiological lipid profile (EOP, NS, NP, AS, AP).',
  },
  {
    metric: '0%',
    label: 'Fillers & Irritants',
    sublabel: 'Free of artificial fragrance, parabens, sulfates, and mineral oils.',
  },
];

export default function SeedClinicalStatStrip() {
  return (
    <section aria-label="Clinical Formulation Metrics" className="border-y border-stone-200/80 bg-[#FAF9F6] py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8 lg:gap-12">
          {stats.map((stat, idx) => (
            <div key={idx} className="space-y-1.5 text-center sm:text-left">
              <span className="block text-2xl font-bold tracking-tight text-minsah-dark sm:text-3xl lg:text-4xl">
                {stat.metric}
              </span>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-minsah-primary">
                {stat.label}
              </p>
              <p className="text-xs leading-relaxed text-stone-500">
                {stat.sublabel}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
