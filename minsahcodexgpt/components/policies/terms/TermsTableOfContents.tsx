'use client';

import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

const SECTIONS = [
  { id: 'sec-1', label: '1. General Terms' },
  { id: 'sec-2', label: '2. Authenticity Guarantee' },
  { id: 'sec-3', label: '3. Orders & Pricing' },
  { id: 'sec-4', label: '4. Shipping & Delivery' },
  { id: 'sec-5', label: '5. COD & Payment' },
  { id: 'sec-6', label: '6. Returns & Refunds' },
  { id: 'sec-7', label: '7. Account & Privacy' },
  { id: 'sec-8', label: '8. Skin Reaction Policy' },
  { id: 'sec-9', label: '9. Intellectual Property' },
  { id: 'sec-10', label: '10. Limitation of Liability' },
  { id: 'sec-11', label: '11. Governing Law & Jurisdiction' },
];

export function TermsTableOfContents() {
  const [activeSection, setActiveSection] = useState('sec-1');

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="sticky top-14 z-30 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#E5EADF] py-3 px-4 sm:px-6 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-[#1c3a13] uppercase tracking-wider flex items-center gap-1.5">
          <BookOpen size={16} className="text-[#1c3a13]" />
          Table of Contents
        </span>
        <span className="text-[11px] text-[#5C645F]">11 Sections</span>
      </div>

      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar scroll-smooth py-1">
        {SECTIONS.map((sec) => {
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => scrollTo(sec.id)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition shrink-0 active:scale-95 shadow-xs ${
                isActive
                  ? 'bg-[#1c3a13] text-white'
                  : 'bg-white text-[#181C1A] border border-[#E5EADF] hover:bg-[#F4F3EF]'
              }`}
            >
              {sec.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
