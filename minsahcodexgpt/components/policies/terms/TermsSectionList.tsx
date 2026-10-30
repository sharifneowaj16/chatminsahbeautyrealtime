'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export function TermsSectionList() {
  return (
    <div className="px-4 sm:px-6 py-6 space-y-6">
      {/* 1. General Terms */}
      <section id="sec-1" className="scroll-mt-32 rounded-2xl bg-white p-5 border border-[#E5EADF] shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center font-bold text-xs">
            1
          </span>
          <h3 className="font-bold text-base text-[#181C1A]">General Terms</h3>
        </div>
        <p className="text-xs text-[#5C645F] leading-relaxed">
          By accessing or purchasing through Minsah Beauty via website, mobile application, or customer channels, you agree to comply with and be bound by these legal terms and regulations in Bangladesh. We reserve the right to update these terms at any time.
        </p>
      </section>

      {/* 2. Authenticity Guarantee */}
      <section id="sec-2" className="scroll-mt-32 rounded-2xl bg-white p-5 border border-[#E5EADF] shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center font-bold text-xs">
            2
          </span>
          <h3 className="font-bold text-base text-[#181C1A]">100% Authenticity Guarantee &amp; Hologram Seal</h3>
        </div>
        <p className="text-xs text-[#5C645F] leading-relaxed">
          Minsah Beauty imports and delivers authentic formulations directly from certified global distributors across Korea, Japan, the USA, and the UK. Every product carries a manufacturer batch code and verified safety seal.
        </p>
        <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-900 font-semibold">
          <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
          <span>10x Money-Back Guarantee: If any product is verified inauthentic, we provide a 1000% full refund guarantee.</span>
        </div>
      </section>

      {/* 3. Orders & Pricing */}
      <section id="sec-3" className="scroll-mt-32 rounded-2xl bg-white p-5 border border-[#E5EADF] shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center font-bold text-xs">
            3
          </span>
          <h3 className="font-bold text-base text-[#181C1A]">Orders &amp; Pricing</h3>
        </div>
        <p className="text-xs text-[#5C645F] leading-relaxed">
          All prices displayed on Minsah Beauty are quoted in Bangladeshi Taka (BDT) and include applicable taxes. We reserve the right to correct pricing errors before fulfillment.
        </p>
      </section>

      {/* 4. Shipping & Delivery */}
      <section id="sec-4" className="scroll-mt-32 rounded-2xl bg-white p-5 border border-[#E5EADF] shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center font-bold text-xs">
            4
          </span>
          <h3 className="font-bold text-base text-[#181C1A]">Shipping &amp; Transit Timelines</h3>
        </div>
        <p className="text-xs text-[#5C645F] leading-relaxed">
          Orders inside Dhaka Fast Zone are delivered within 24-48 hours. Orders across all other 64 districts are fulfilled within 48-72 hours via our official courier partners with live tracking.
        </p>
      </section>

      {/* 5. Payments & COD */}
      <section id="sec-5" className="scroll-mt-32 rounded-2xl bg-white p-5 border border-[#E5EADF] shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center font-bold text-xs">
            5
          </span>
          <h3 className="font-bold text-base text-[#181C1A]">Cash on Delivery (COD) &amp; Payment Security</h3>
        </div>
        <p className="text-xs text-[#5C645F] leading-relaxed">
          Cash on delivery is available across all 64 districts in Bangladesh. Online payments via bKash, Nagad, Visa, and Mastercard are processed through PCI-DSS Level 1 compliant gateways.
        </p>
      </section>

      {/* 6. Returns & Refunds */}
      <section id="sec-6" className="scroll-mt-32 rounded-2xl bg-white p-5 border border-[#E5EADF] shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center font-bold text-xs">
            6
          </span>
          <h3 className="font-bold text-base text-[#181C1A]">14-Day Return &amp; Refunds</h3>
        </div>
        <p className="text-xs text-[#5C645F] leading-relaxed">
          Unopened and factory-sealed products qualify for our 14-day hassle-free return policy. If you receive a damaged or broken item, notify us within 48 hours with parcel photos.
        </p>
      </section>

      {/* 7. Data Protection */}
      <section id="sec-7" className="scroll-mt-32 rounded-2xl bg-white p-5 border border-[#E5EADF] shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center font-bold text-xs">
            7
          </span>
          <h3 className="font-bold text-base text-[#181C1A]">Customer Account &amp; Data Privacy</h3>
        </div>
        <p className="text-xs text-[#5C645F] leading-relaxed">
          Customer information is stored with industry-grade encryption. We never store bank passwords or payment card CVVs. You can request account data deletion at any time.
        </p>
      </section>

      {/* 8. Skin Reaction Policy */}
      <section id="sec-8" className="scroll-mt-32 rounded-2xl bg-white p-5 border border-[#E5EADF] shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center font-bold text-xs">
            8
          </span>
          <h3 className="font-bold text-base text-[#181C1A]">Cosmetic Usage &amp; Patch Test Advisory</h3>
        </div>
        <p className="text-xs text-[#5C645F] leading-relaxed">
          We strongly advise performing a 24-hour patch test before applying any active cosmetic formula. In case of unexpected adverse sensitivity, consult a dermatologist and contact our Concierge team.
        </p>
      </section>

      {/* 9. Intellectual Property */}
      <section id="sec-9" className="scroll-mt-32 rounded-2xl bg-white p-5 border border-[#E5EADF] shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center font-bold text-xs">
            9
          </span>
          <h3 className="font-bold text-base text-[#181C1A]">Intellectual Property</h3>
        </div>
        <p className="text-xs text-[#5C645F] leading-relaxed">
          The Minsah Beauty brand, logo, original editorial content, and website interface are proprietary assets. Unauthorized commercial reproduction is prohibited by copyright laws.
        </p>
      </section>

      {/* 10. Limitation of Liability */}
      <section id="sec-10" className="scroll-mt-32 rounded-2xl bg-white p-5 border border-[#E5EADF] shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center font-bold text-xs">
            10
          </span>
          <h3 className="font-bold text-base text-[#181C1A]">Limitation of Liability</h3>
        </div>
        <p className="text-xs text-[#5C645F] leading-relaxed">
          In cases of courier strikes, severe natural disruption, or courier transit issues, our support team proactively resolves parcels with immediate re-shipment or refund.
        </p>
      </section>

      {/* 11. Governing Law */}
      <section id="sec-11" className="scroll-mt-32 rounded-2xl bg-white p-5 border border-[#E5EADF] shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center font-bold text-xs">
            11
          </span>
          <h3 className="font-bold text-base text-[#181C1A]">Governing Law &amp; Jurisdiction</h3>
        </div>
        <p className="text-xs text-[#5C645F] leading-relaxed">
          These terms and conditions are governed by and construed in accordance with the laws of the People&apos;s Republic of Bangladesh, including the Consumers&apos; Rights Protection Act, 2009.
        </p>
      </section>
    </div>
  );
}
