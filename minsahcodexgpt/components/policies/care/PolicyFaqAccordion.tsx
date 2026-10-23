"use client";

import React, { useState } from "react";

interface FaqItem {
  id: string;
  question: string;
  icon: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    id: "faq-1",
    question: "How do I verify the holographic authenticity seal?",
    icon: "verified_user",
    answer:
      "Every box comes with an authentic holographic sticker from the manufacturer. Scratch gently to reveal the secret PIN, scan the QR code with your mobile camera, and the official batch verification page will confirm whether the product is genuine.",
  },
  {
    id: "faq-2",
    question: "What if my skin experiences irritation or reaction?",
    icon: "spa",
    answer:
      "We provide a Dermatological Care Guarantee. If an adverse skin reaction occurs within 7 days of initial use, discontinue immediately and contact our WhatsApp Concierge with photographs. Our in-house skincare specialists will arrange a safe product swap or refund credit.",
  },
  {
    id: "faq-3",
    question: "Is Cash on Delivery available across all 64 districts?",
    icon: "pin_drop",
    answer:
      "Yes! We offer 100% Cash on Delivery across all 64 districts in Bangladesh via Steadfast and Pathao. You can inspect the outer packaging condition prior to paying the courier partner.",
  },
  {
    id: "faq-4",
    question: "How do I delete my browsing and purchase history?",
    icon: "lock_reset",
    answer:
      "Use the 'Request Complete Data Erasure' form above or email privacy@minsahbeauty.com with your registered mobile number. Under Meta Ads Policy Term 4.a and international GDPR guidelines, all data records are erased from our CRM within 7 business days.",
  },
];

export function PolicyFaqAccordion() {
  const [openId, setOpenId] = useState<string | null>("faq-1");

  const toggle = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section className="px-4 pt-8 scroll-mt-28" id="faq">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-[#4b6723] text-[22px]">
          help_center
        </span>
        <span className="text-xs font-bold tracking-wider uppercase text-[#4b6723]">
          Got Questions?
        </span>
      </div>
      <h2 className="text-xl font-bold tracking-tight text-[#181C1A]">
        Frequently Asked Inquiries
      </h2>
      <p className="text-xs text-[#43483f] mt-1 leading-relaxed">
        Instant answers verified under our published e-commerce compliance guidelines.
      </p>

      <div className="mt-4 space-y-2.5">
        {FAQS.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <div
              key={faq.id}
              className={`rounded-2xl border transition-all shadow-xs ${
                isOpen ? "border-[#4b6723] bg-white" : "border-[#E2DED8] bg-white"
              } p-3.5`}
            >
              <button
                type="button"
                onClick={() => toggle(faq.id)}
                className="w-full flex items-center justify-between text-left text-xs font-bold text-[#181C1A]"
              >
                <span className="flex items-center gap-2 pr-2">
                  <span className="material-symbols-outlined text-[18px] text-[#4b6723]">
                    {faq.icon}
                  </span>
                  {faq.question}
                </span>
                <span
                  className={`material-symbols-outlined text-[20px] transition-transform duration-200 text-[#43483f] shrink-0 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                >
                  expand_more
                </span>
              </button>
              {isOpen && (
                <div className="mt-3 pt-2.5 border-t border-[#E2DED8]/40 text-xs text-[#43483f] leading-relaxed animate-in fade-in duration-200">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
