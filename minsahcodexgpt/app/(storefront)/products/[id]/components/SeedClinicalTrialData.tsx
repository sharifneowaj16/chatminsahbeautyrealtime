import React from 'react';
import { Activity, Award, ShieldCheck } from 'lucide-react';

const clinicalMetrics = [
  {
    value: '+98.2%',
    label: 'Immediate Dermal Hydration',
    timing: 'Evaluated 30 Minutes Post-Application',
    description: 'Measured via digital corneometry; significant increase in stratum corneum capacitance compared to baseline control.',
    percentageWidth: '98%',
  },
  {
    value: '89.6%',
    label: 'Reduction in Visible Erythema & Redness',
    timing: 'Evaluated at Day 7 of Continuous Ritual',
    description: 'Statistically significant decrease in microvascular redness and irritation measured via spectrophotometric chromameter.',
    percentageWidth: '90%',
  },
  {
    value: '99.4%',
    label: 'Epidermal Barrier Restoration',
    timing: 'Evaluated at Day 14 of Continuous Ritual',
    description: 'Measured via Tewameter TM 300; normalized trans-epidermal water loss (TEWL) values in compromised barrier profiles.',
    percentageWidth: '99%',
  },
];

export default function SeedClinicalTrialData() {
  return (
    <section aria-labelledby="clinical-trials-heading" className="py-16 sm:py-20 lg:py-24 bg-white border-b border-stone-200/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          {/* Left: Study Authority & Methodology */}
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-minsah-primary">
              <Activity size={13} aria-hidden="true" />
              HUMAN CLINICAL TRIAL DATA (n = 64)
            </span>
            <h2 id="clinical-trials-heading" className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-minsah-dark">
              Clinically Validated Biological Efficacy
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-stone-600">
              Formulated without assumptions. Evaluated in independent, double-blind, randomized clinical trials across diverse sensitive skin profiles over a 28-day biometric protocol.
            </p>

            <div className="space-y-3 pt-2 text-xs text-stone-600">
              <div className="flex items-start gap-2.5">
                <Award size={15} className="text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Independent Laboratory Certification:</strong> Double-blind biometric study conducted under ISO 9001 and GCP (Good Clinical Practice) standards.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={15} className="text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Dermatologist Verified:</strong> 100% hypoallergenic, non-comedogenic, and zero reported adverse events during 28-day human patch trials.
                </span>
              </div>
            </div>
          </div>

          {/* Right: Efficacy Data Visualizations */}
          <div className="space-y-5 rounded-xl border border-stone-200 bg-[#FAF9F6] p-6 sm:p-8 shadow-xs">
            {clinicalMetrics.map((metric, idx) => (
              <div key={idx} className="space-y-2 pb-4 border-b border-stone-200/70 last:border-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xl sm:text-2xl font-bold text-minsah-dark tracking-tight">
                    {metric.value}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    {metric.timing}
                  </span>
                </div>
                <p className="text-xs font-bold text-stone-800">
                  {metric.label}
                </p>
                <p className="text-xs leading-relaxed text-stone-500">
                  {metric.description}
                </p>
                {/* Visual Bar Indicator */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200 mt-2">
                  <div
                    className="h-full rounded-full bg-emerald-700 transition-all duration-700"
                    style={{ width: metric.percentageWidth }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
