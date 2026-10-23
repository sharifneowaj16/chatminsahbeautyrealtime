"use client";

import React, { useState } from "react";

const SECTIONS = [
  { id: "sec-1", label: "১. সাধারণ শর্তাবলী", en: "General Terms" },
  { id: "sec-2", label: "২. খাঁটি পণ্যের নিশ্চয়তা", en: "Authenticity" },
  { id: "sec-3", label: "৩. অর্ডার ও মূল্য নির্ধারণ", en: "Orders & Pricing" },
  { id: "sec-4", label: "৪. শিপিং ও ডেলিভারি", en: "Delivery" },
  { id: "sec-5", label: "৫. COD ও পেমেন্ট", en: "Payments" },
  { id: "sec-6", label: "৬. রিটার্ন ও রিফান্ড", en: "Returns & Refund" },
  { id: "sec-7", label: "৭. অ্যাকাউন্ট ও ডেটা", en: "Account & Data" },
  { id: "sec-8", label: "৮. স্কিন রিঅ্যাকশন পলিসি", en: "Adverse Reaction" },
  { id: "sec-9", label: "৯. মেধাসম্পদ ও ট্রেডমার্ক", en: "Intellectual Property" },
  { id: "sec-10", label: "১০. দায়মুক্তি", en: "Liability" },
  { id: "sec-11", label: "১১. আইন ও এখতিয়ার", en: "Governing Law" },
];

export function TermsTableOfContents() {
  const [activeSection, setActiveSection] = useState("sec-1");

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="sticky top-14 z-30 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#E5EADF] py-3 px-4 sm:px-6 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-[#1c3a13] uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-[#1c3a13]">menu_book</span>
          সূচিপত্র / Table of Contents
        </span>
        <span className="text-[11px] text-[#5C645F]">১১টি ধারা (11 Sections)</span>
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
                  ? "bg-[#1c3a13] text-white"
                  : "bg-white text-[#181C1A] border border-[#E5EADF] hover:bg-[#F4F3EF]"
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
