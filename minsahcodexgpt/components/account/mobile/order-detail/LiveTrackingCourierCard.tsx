'use client';

import React from 'react';
import { Bike, Phone, MessageSquare, Snowflake, ShieldCheck, Star } from 'lucide-react';
import type { ShipmentCourierInfo } from './types';

interface LiveTrackingCourierCardProps {
  courier: ShipmentCourierInfo;
}

export default function LiveTrackingCourierCard({ courier }: LiveTrackingCourierCardProps) {
  return (
    <div className="px-4 mb-4">
      <div className="rounded-[28px] bg-[#F8FAF7] overflow-hidden shadow-xs flex flex-col border border-[#E2DED8]/60">
        {/* Mini Map Visual */}
        <div
          className="relative w-full h-36 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=700&q=80')",
          }}
        >
          <div className="absolute inset-0 bg-[#062402]/20 pointer-events-none" />

          {/* Floating Rider Marker */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
            <div className="px-3 py-1 rounded-full bg-[#062402] text-white text-[10px] font-bold shadow-lg flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c7edb5] animate-ping" />
              <span>Rider: {courier.distanceLabel}</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-[#EAF7D8] text-[#1c3a13] flex items-center justify-center shadow-lg -mt-1">
              <Bike className="w-4 h-4 text-[#4b6723]" />
            </div>
          </div>

          {/* Thermal Guarantee Badge */}
          <div className="absolute bottom-2.5 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[#062402] text-[10px] font-bold shadow-xs flex items-center gap-1">
            <Snowflake className="w-3.5 h-3.5 text-[#4b6723]" />
            <span>Thermal Safe 20°C</span>
          </div>
        </div>

        {/* Courier Details */}
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#062402] text-[#ccee9b] flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                <Bike className="w-5 h-5 text-[#c7edb5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#062402]">{courier.name}</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-[#EAF7D8] text-[#1c3a13] text-[9px] font-bold">
                    {courier.partner}
                  </span>
                </div>
                <p className="text-[11px] text-[#43483f] font-medium mt-0.5 flex items-center gap-1">
                  <span>Express Van Rider • {courier.rating}</span>
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500 inline" />
                  <span>({courier.deliveriesCount.toLocaleString()} deliveries)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <a
                href={`tel:${courier.phone}`}
                aria-label="Call Rider"
                className="w-10 h-10 rounded-full bg-[#EAF7D8] text-[#1c3a13] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-xs"
              >
                <Phone className="w-4 h-4 text-[#4b6723]" />
              </a>
              <button
                type="button"
                aria-label="Send message to courier"
                onClick={() => alert(`Message sent to rider ${courier.name}`)}
                className="w-10 h-10 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#062402] hover:bg-[#EAF7D8] active:scale-95 transition-all shadow-xs"
              >
                <MessageSquare className="w-4 h-4 text-[#4b6723]" />
              </button>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#efeeeb] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#4b6723] shrink-0" />
            <span className="text-[11px] text-[#43483f]">
              Tamper-evident packaging intact. Serialized Authenticity QR on package exterior.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
