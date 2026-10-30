'use client';

import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export function ReturnEligibilityCriteriaCard() {
  return (
    <section className="space-y-3">
      <div className="flex justify-between items-baseline px-1">
        <h3 className="text-lg font-bold text-[#2D1F18]">Eligibility Criteria</h3>
        <span className="text-xs font-bold text-emerald-800">Standard Rules</span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Eligible Card */}
        <div className="bg-white p-4 rounded-2xl border border-[#EADFD5] shadow-xs flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-800">
            <CheckCircle2 size={22} />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#2D1F18]">Unopened &amp; Sealed Products</h4>
              <span className="bg-emerald-100 text-emerald-900 font-bold text-[10px] px-2 py-0.5 rounded-full">
                Eligible
              </span>
            </div>
            <p className="text-xs text-[#7A6E65] leading-relaxed">
              Full refund is provided if the original manufacturer hologram and safety plastic seal remain unopened and the box is intact.
            </p>
            <p className="text-[11px] text-emerald-800 font-medium">
              Unopened, unused with authentic manufacturer seal intact.
            </p>
          </div>
        </div>

        {/* Non-Eligible Card */}
        <div className="bg-white p-4 rounded-2xl border border-[#EADFD5] shadow-xs flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0 text-rose-700">
            <XCircle size={22} />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#2D1F18]">Opened or Used Products</h4>
              <span className="bg-rose-100 text-rose-900 font-bold text-[10px] px-2 py-0.5 rounded-full">
                Non-Returnable
              </span>
            </div>
            <p className="text-xs text-[#7A6E65] leading-relaxed">
              For consumer personal hygiene and skin safety reasons, skincare items once unsealed or pumped cannot be returned.
            </p>
            <p className="text-[11px] text-rose-700 font-medium">
              Opened cosmetics cannot be restocked for hygiene &amp; skin health.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
