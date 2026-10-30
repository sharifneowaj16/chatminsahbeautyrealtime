'use client';

import React from 'react';

export function ReturnProcessFlowTimeline() {
  return (
    <section className="bg-[#FAF6F2] p-4 rounded-2xl border border-[#EADFD5] space-y-4 shadow-xs">
      <div>
        <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
          Simple 4 Steps
        </span>
        <h3 className="text-base font-bold text-[#2D1F18]">
          Return Process Flow
        </h3>
      </div>

      <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-[#EADFD5]">
        {/* Step 1 */}
        <div className="relative">
          <div className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center text-xs font-bold ring-4 ring-[#FAF6F2]">
            1
          </div>
          <div className="pl-2">
            <h4 className="text-xs font-bold text-[#2D1F18]">Submit Request Online</h4>
            <p className="text-xs text-[#7A6E65] mt-0.5 leading-relaxed">
              Click &apos;Return Request&apos; in your account order history or contact our official WhatsApp Concierge with your Order ID.
            </p>
            <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mt-1 font-semibold">
              App / Web / WhatsApp
            </span>
          </div>
        </div>

        {/* Step 2 */}
        <div className="relative">
          <div className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center text-xs font-bold ring-4 ring-[#FAF6F2]">
            2
          </div>
          <div className="pl-2">
            <h4 className="text-xs font-bold text-[#2D1F18]">Verification &amp; Approval</h4>
            <p className="text-xs text-[#7A6E65] mt-0.5 leading-relaxed">
              Our quality curation team verifies the hologram and batch photos within 12 hours.
            </p>
            <span className="text-[10px] text-[#7A6E65] font-medium">Hologram Batch Check (12 hrs SLA)</span>
          </div>
        </div>

        {/* Step 3 */}
        <div className="relative">
          <div className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center text-xs font-bold ring-4 ring-[#FAF6F2]">
            3
          </div>
          <div className="pl-2">
            <h4 className="text-xs font-bold text-[#2D1F18]">Doorstep Pickup</h4>
            <p className="text-xs text-[#7A6E65] mt-0.5 leading-relaxed">
              Rider will collect the parcel from your doorstep inside Dhaka or via courier partner across outside districts.
            </p>
            <span className="text-[10px] text-emerald-800 font-semibold">Free Pickup inside Dhaka</span>
          </div>
        </div>

        {/* Step 4 */}
        <div className="relative">
          <div className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center text-xs font-bold ring-4 ring-[#FAF6F2]">
            4
          </div>
          <div className="pl-2">
            <h4 className="text-xs font-bold text-[#2D1F18]">Refund Dispatched</h4>
            <p className="text-xs text-[#7A6E65] mt-0.5 leading-relaxed">
              Once parcel reaches hub and passes check, full amount is credited to your bKash, Nagad or original payment method.
            </p>
            <span className="text-[10px] text-emerald-800 font-bold">Instant to 72 Hours</span>
          </div>
        </div>
      </div>
    </section>
  );
}
