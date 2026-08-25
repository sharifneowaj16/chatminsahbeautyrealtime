import React from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';

const stages = [
  {
    range: 'Days 1 – 7',
    stage: 'Stage 01: Initial Soothing & Calming',
    description: 'Instantaneous lipid replenishing. Dryness, tightness, and micro-irritation subside as the stratum corneum rehydrates.',
    milestones: [
      'Immediate surface barrier comfort',
      'Noticeable reduction in redness triggers',
      'Supple hydration without pore congestion',
    ],
  },
  {
    range: 'Days 8 – 14',
    stage: 'Stage 02: Lipid Barrier Reconstruction',
    description: 'Ceramides NP, AP, and EOP integrate into intercellular spaces, reinforcing natural tight junctions and cutting moisture loss in half.',
    milestones: [
      'Normalizing trans-epidermal water loss (TEWL)',
      'Enhanced resistance to environmental allergens',
      'Smoother tactile micro-texture',
    ],
  },
  {
    range: 'Days 15 – 28',
    stage: 'Stage 03: Cellular Renewal & Radiance',
    description: 'Full 28-day epidermal turnover cycle complete. The skin demonstrates fortified barrier immunity, balanced flora, and continuous hydration.',
    milestones: [
      'Sustained luminous, well-rested skin appearance',
      'Maximized hydration holding capacity',
      'Long-term barrier resilience and calm',
    ],
  },
];

export default function SeedAcclimationTimeline() {
  return (
    <section aria-labelledby="timeline-heading" className="py-16 sm:py-20 lg:py-24 bg-[#FAF9F6] border-b border-stone-200/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-minsah-primary">
            <Clock size={13} aria-hidden="true" />
            28-DAY CELLULAR EPIDERMAL CYCLE
          </span>
          <h2 id="timeline-heading" className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-minsah-dark">
            What to Expect in 28 Days
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-stone-600">
            Skin cell turnover requires an authentic 28-day physiological cadence. Here is how your dermal barrier transforms week by week.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {stages.map((st, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-stone-200 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-minsah-primary bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                    {st.range}
                  </span>
                  <span className="text-xs text-stone-400 font-mono">STEP 0{idx + 1}</span>
                </div>
                <h3 className="text-base font-bold text-minsah-dark mb-2">
                  {st.stage}
                </h3>
                <p className="text-xs leading-relaxed text-stone-500 mb-5">
                  {st.description}
                </p>

                <div className="space-y-2.5">
                  {st.milestones.map((m, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-stone-700">
                      <CheckCircle2 size={13} className="text-emerald-700 shrink-0 mt-0.5" />
                      <span className="leading-tight">{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
