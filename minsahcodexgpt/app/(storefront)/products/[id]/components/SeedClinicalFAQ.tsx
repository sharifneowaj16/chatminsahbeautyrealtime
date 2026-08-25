'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const faqs = [
  {
    question: 'How does this formulation differ from standard moisturizers?',
    answer: 'Traditional moisturizers rely on occlusive mineral oils that create a temporary barrier on top of the skin. This formulation uses a bio-identical 3:1:1 lipid ratio (Ceramides NP/AP/EOP, Phytosphingosine, and Squalane) that integrates directly into the intercellular matrix, repairing your actual skin barrier rather than merely sitting on the surface.',
  },
  {
    question: 'Is this suitable for rosacea-prone, reactive, or compromised skin?',
    answer: 'Yes. Formulated at physiological pH 5.5 and strictly tested on compromised barrier profiles. Free of artificial fragrances, essential oils, drying alcohols, parabens, and sulfates. 100% hypoallergenic and non-comedogenic.',
  },
  {
    question: 'Can I layer this with active acids (AHA/BHA) and Retinoids?',
    answer: 'Absolutely. In fact, it is clinically recommended to use this restorative formulation directly after applying exfoliating acids or retinoids to mitigate irritation, buffer the skin, and prevent barrier thinning.',
  },
  {
    question: 'How long does one unit last with daily morning and evening use?',
    answer: 'With recommended dosing (1–2 pumps / pea-sized amounts twice daily), one 50ml keepsake vessel lasts approximately 30 to 45 days.',
  },
  {
    question: 'What is the shelf life and storage protocol?',
    answer: 'The formulation has an unopened shelf life of 24 months. Once opened, it retains peak bio-activity for 12 months. Store in a cool, dry place away from direct sunlight.',
  },
];

export default function SeedClinicalFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section aria-labelledby="clinical-faq-heading" className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-minsah-primary">
            <HelpCircle size={13} aria-hidden="true" />
            CLINICAL TRANSPARENCY
          </span>
          <h2 id="clinical-faq-heading" className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-minsah-dark">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-stone-600">
            Dermatological science, application protocols, and formulation safety.
          </p>
        </div>

        <div className="divide-y divide-stone-200 border-y border-stone-200">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="py-5 sm:py-6">
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="flex w-full items-center justify-between text-left gap-4 font-bold text-sm sm:text-base text-minsah-dark hover:text-minsah-primary transition-colors"
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-stone-400 transition-transform duration-250 ${
                      isOpen ? 'rotate-180 text-minsah-primary' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="mt-3.5 pr-6 text-xs sm:text-sm leading-relaxed text-stone-600 animate-in fade-in duration-200">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
