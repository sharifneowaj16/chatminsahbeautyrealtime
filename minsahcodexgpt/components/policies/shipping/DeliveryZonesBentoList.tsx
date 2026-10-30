'use client';

import React from 'react';
import { Clock, Building2, Map, Zap, ShieldCheck, CheckCircle2 } from 'lucide-react';

export function DeliveryZonesBentoList() {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#2D1F18] leading-tight">
            Delivery Zones & Timelines
          </h3>
          <p className="text-[11px] text-[#7A6E65]">Coverage, Express Windows & Standard Rates</p>
        </div>
        <span className="text-xs text-emerald-800 font-bold flex items-center gap-1">
          <Clock size={13} /> Live Dispatch
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Card 1: Inside Dhaka */}
        <div className="bg-white rounded-2xl p-4 border border-[#EADFD5] shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start mb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                <Building2 size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#2D1F18]">Dhaka Metro Area (Fast Zone)</h4>
                <p className="text-[11px] text-[#7A6E65]">Home delivery across all Dhaka, Savar & Narayanganj zones</p>
              </div>
            </div>
            <span className="bg-emerald-100 text-emerald-900 font-bold text-xs px-2.5 py-1 rounded-full">
              ৳70 / Free*
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div className="bg-[#FAF6F2] p-2.5 rounded-xl border border-[#EADFD5]/60">
              <div className="flex items-center gap-1 text-[#7A6E65] text-[10px] font-medium">
                <Clock size={12} className="text-emerald-700" />
                <span>Estimated Window</span>
              </div>
              <div className="text-[#2D1F18] font-bold mt-0.5 text-[11px]">24 - 48 Hours (1-2 Days)</div>
            </div>
            <div className="bg-[#FAF6F2] p-2.5 rounded-xl border border-[#EADFD5]/60">
              <div className="flex items-center gap-1 text-[#7A6E65] text-[10px] font-medium">
                <Zap size={12} className="text-emerald-700" />
                <span>Same-Day Dispatch</span>
              </div>
              <div className="text-[#2D1F18] font-bold mt-0.5 text-[11px]">Order before 3:00 PM</div>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#7A6E65] bg-[#FAF6F2] px-2.5 py-1.5 rounded-xl border border-[#EADFD5]/40">
            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
            <span>Banani, Gulshan, Dhanmondi, Uttara and all metro points qualify for Cash on Delivery.</span>
          </div>
        </div>

        {/* Card 2: Outside Dhaka */}
        <div className="bg-white rounded-2xl p-4 border border-[#EADFD5] shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start mb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
                <Map size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#2D1F18]">Outside Dhaka (All 64 Districts)</h4>
                <p className="text-[11px] text-[#7A6E65]">Doorstep delivery across all districts, thanas and upazilas</p>
              </div>
            </div>
            <span className="bg-[#FAF6F2] text-[#2D1F18] font-bold text-xs px-2.5 py-1 rounded-full border border-[#EADFD5]">
              ৳130 / Free*
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div className="bg-[#FAF6F2] p-2.5 rounded-xl border border-[#EADFD5]/60">
              <div className="flex items-center gap-1 text-[#7A6E65] text-[10px] font-medium">
                <Clock size={12} className="text-blue-700" />
                <span>Estimated Window</span>
              </div>
              <div className="text-[#2D1F18] font-bold mt-0.5 text-[11px]">48 - 72 Hours (2-3 Days)</div>
            </div>
            <div className="bg-[#FAF6F2] p-2.5 rounded-xl border border-[#EADFD5]/60">
              <div className="flex items-center gap-1 text-[#7A6E65] text-[10px] font-medium">
                <ShieldCheck size={12} className="text-blue-700" />
                <span>Transit Security</span>
              </div>
              <div className="text-[#2D1F18] font-bold mt-0.5 text-[11px]">100% Insured Parcel</div>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#7A6E65] bg-[#FAF6F2] px-2.5 py-1.5 rounded-xl border border-[#EADFD5]/40">
            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
            <span>Chattogram, Sylhet, Rajshahi, Khulna and all regional towns covered with live tracking.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
