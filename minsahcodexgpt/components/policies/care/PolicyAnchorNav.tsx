"use client";

import React, { useState } from "react";

const NAV_ITEMS = [
  { id: "authenticity", label: "Authenticity" },
  { id: "returns", label: "14-Day Return" },
  { id: "delivery", label: "Delivery Time" },
  { id: "data-privacy", label: "Data Deletion" },
  { id: "faq", label: "FAQ" },
];

export function PolicyAnchorNav() {
  const [activeTab, setActiveTab] = useState("authenticity");

  const handleClick = (id: string) => {
    setActiveTab(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav className="sticky top-14 z-30 bg-[#faf9f6]/95 backdrop-blur-md border-y border-[#E2DED8]/50 py-2.5 px-4 shadow-xs">
      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar scroll-smooth">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item.id)}
              className={`h-9 px-4 shrink-0 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer ${
                isActive
                  ? "bg-[#062402] text-white ring-1 ring-[#062402]"
                  : "bg-[#F2F6F0] text-[#1c3a13] hover:bg-[#E8F0E5] border border-[#E2DED8]/70"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
