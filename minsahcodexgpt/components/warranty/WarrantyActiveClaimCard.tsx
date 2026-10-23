'use client';

import React from 'react';
import Image from 'next/image';
import { AlertTriangle, Receipt, ShieldCheck, RefreshCw } from 'lucide-react';
import WarrantyTelemetryStepper from './WarrantyTelemetryStepper';
import { WarrantyActiveClaim } from './types';

interface WarrantyActiveClaimCardProps {
  claim: WarrantyActiveClaim;
}

export default function WarrantyActiveClaimCard({ claim }: WarrantyActiveClaimCardProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_4px_24px_rgba(6,36,2,0.06)] relative overflow-hidden border border-[#E2DED8]/60">
      {/* Ambient Accent Glow */}
      <div className="absolute -right-12 -top-12 w-36 h-36 rounded-full bg-[#EAF7D8]/40 pointer-events-none blur-2xl" />

      {/* Top Badge Row */}
      <div className="flex items-center justify-between pb-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EAF7D8] text-[#516d29] font-bold text-[11px] tracking-wide">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4b6723] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4b6723]" />
          </span>
          <span>ACTIVE • IN REVIEW</span>
        </div>
        <span className="text-[12px] text-[#43483f] font-mono font-bold">
          {claim.claimNumber}
        </span>
      </div>

      {/* Linked Order Reference */}
      <div className="flex items-center gap-1 text-[#43483f] text-[12px] pb-2">
        <Receipt className="w-3.5 h-3.5 text-[#4b6723]" />
        <span>Order #{claim.orderNumber} • Placed {claim.orderDate}</span>
      </div>

      {/* Product Preview Block */}
      <div className="p-3 rounded-[20px] bg-[#F8FAF7] flex items-center gap-3">
        <div className="relative w-16 h-16 rounded-[14px] bg-white overflow-hidden shrink-0 border border-[#E2DED8]/40">
          <Image
            src={claim.productImage}
            alt={claim.productName}
            fill
            sizes="64px"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[14px] leading-tight text-[#1a1c1a] truncate font-bold">
            {claim.productName}
          </span>
          <span className="text-[12px] text-[#4b6723] font-bold mt-0.5">
            ৳{claim.price.toLocaleString()} • Korean Import
          </span>
          <div className="flex items-center gap-1 mt-1 text-[#ba1a1a] text-[11px] leading-tight">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{claim.defectSummary}</span>
          </div>
        </div>
      </div>

      {/* Telemetry Stepper */}
      <WarrantyTelemetryStepper
        currentStep={claim.currentStep}
        riderName={claim.assignedRiderName}
        hubName={claim.assignedHub}
        scheduledWindow={claim.scheduledTimeWindow}
      />

      {/* Guaranteed Resolution Ribbon */}
      <div className="mt-4 pt-2 flex items-center justify-between bg-[#F8FAF7] p-3 rounded-[16px]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#EAF7D8] text-[#516d29] flex items-center justify-center shrink-0">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-[#43483f]">Guaranteed Resolution</span>
            <span className="text-[13px] text-[#1a1c1a] font-bold">
              100% Free Doorstep Replacement
            </span>
          </div>
        </div>
        <ShieldCheck className="text-[#4b6723] w-5 h-5" />
      </div>
    </div>
  );
}
