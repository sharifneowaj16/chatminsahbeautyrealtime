import React from 'react';
import { FlaskConical, Check } from 'lucide-react';

const formulationCategories = [
  {
    title: 'Dermal Barrier Restorative Matrix',
    count: '5 Bio-Lipid Strains',
    description: 'Mimics the intercellular matrix of healthy skin to repair tight junctions and halt trans-epidermal moisture loss.',
    ingredients: [
      { name: 'Ceramide NP', function: 'Barrier Reinforcement', target: 'Stratum Corneum' },
      { name: 'Ceramide AP', function: 'Cellular Elasticity', target: 'Intercellular Matrix' },
      { name: 'Ceramide EOP', function: 'Lipid Moisture Lock', target: 'Lipid Bilayer' },
      { name: 'Phytosphingosine', function: 'Microbial Balance', target: 'Surface Acid Mantle' },
      { name: 'Bio-Identical Cholesterol', function: 'Membrane Stability', target: 'Epidermal Barrier' },
    ],
  },
  {
    title: 'Active Centella & Soothing Matrix',
    count: '4 Titrated Botanicals',
    description: 'Pharmaceutical-grade Centella fractions clinically tested to soothe redness, inflammation, and sensitivity.',
    ingredients: [
      { name: 'Madecassoside (95% Pure)', function: 'Anti-Inflammatory Action', target: 'Dermal Sensitivity' },
      { name: 'Asiaticoside (90% Pure)', function: 'Collagen Synthesis Support', target: 'Extracellular Matrix' },
      { name: 'Centella Asiatica Extract (50,000 ppm)', function: 'Microcirculation & Relief', target: 'Vascular Tone' },
      { name: 'Allantoin', function: 'Cellular Calming', target: 'Epidermal Surface' },
    ],
  },
  {
    title: 'Multi-Molecular Hydration Matrix',
    count: '3 Hydration Depths',
    description: 'Tiered molecular weights penetrate through multiple epidermal layers for deep cellular plumpness.',
    ingredients: [
      { name: 'High-Molecular Sodium Hyaluronate', function: 'Surface Moisture Seal', target: 'Upper Epidermis' },
      { name: 'Micro-Hydrolyzed Hyaluronic Acid', function: 'Deep Layer Infiltration', target: 'Lower Dermis' },
      { name: 'Beta-Glucan + Panthenol (B5)', function: '20% Higher Hydration than HA', target: 'Cellular Matrix' },
    ],
  },
  {
    title: 'Cellular Antioxidant & Tone Matrix',
    count: '3 Bio-Shields',
    description: 'Defends against oxidative stress, blue light, and urban particulate pollution.',
    ingredients: [
      { name: 'Niacinamide (Vitamin B3 2%)', function: 'Lipid Synthesis & Tone Clarity', target: 'Melanin Pathway' },
      { name: 'Tocopherol (Vitamin E)', function: 'Free-Radical Scavenging', target: 'Cell Membranes' },
      { name: 'Green Tea Epigallocatechin (EGCG)', function: 'Environmental Barrier Defense', target: 'Oxidative Cascade' },
    ],
  },
];

export default function SeedFormulationMatrix() {
  return (
    <section aria-labelledby="formulation-matrix-heading" className="py-16 sm:py-20 lg:py-24 bg-[#FAF9F6] border-b border-stone-200/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-minsah-primary">
            <FlaskConical size={13} aria-hidden="true" />
            FORMULATION MATRIX · 15 ACTIVE BIO-COMPOUNDS
          </span>
          <h2 id="formulation-matrix-heading" className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-minsah-dark">
            Categorized Botanical &amp; Lipid Bio-Matrix
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-stone-600">
            Every active compound in this formulation is classified by its specific physiological target and biocompatibility profile. Zero synthetic binders, parabens, or artificial dyes.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {formulationCategories.map((cat, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-stone-200 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-stone-100">
                  <h3 className="text-base font-bold text-minsah-dark">
                    {cat.title}
                  </h3>
                  <span className="shrink-0 rounded-full bg-[#FAF9F6] border border-stone-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                    {cat.count}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-stone-500 mb-5">
                  {cat.description}
                </p>

                <div className="space-y-2.5">
                  {cat.ingredients.map((ing, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-[#FAF9F6]/80 border border-stone-100"
                    >
                      <div className="flex items-center gap-2">
                        <Check size={12} className="text-emerald-700 shrink-0" />
                        <span className="font-semibold text-minsah-dark">{ing.name}</span>
                      </div>
                      <div className="text-right text-stone-500 text-[11px]">
                        <span className="font-medium text-stone-700">{ing.function}</span>
                        <span className="hidden sm:inline text-stone-400"> · {ing.target}</span>
                      </div>
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
