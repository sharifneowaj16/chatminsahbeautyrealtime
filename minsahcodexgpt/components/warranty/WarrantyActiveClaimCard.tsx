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
    <div className="rounded-2xl bg-[#0f1011] border border-[#23252a] p-4 sm:p-5 shadow-xl relative overflow-hidden space-y-4">
      {/* Top Badge Row */}
      <div className="flex items-center justify-between pb-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#5e6ad2]/15 text-[#828fff] font-semibold text-[11px] tracking-wide border border-[#5e6ad2]/30">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5e6ad2] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#828fff]" />
          </span>
          <span>ACTIVE • IN REVIEW</span>
        </div>
        <span className="text-xs text-[#8a8f98] font-mono font-medium">
          {claim.claimNumber}
        </span>
      </div>

      {/* Linked Order Reference */}
      <div className="flex items-center gap-1.5 text-[#8a8f98] text-xs">
        <Receipt className="w-3.5 h-3.5 text-[#828fff]" />
        <span>Order #{claim.orderNumber} • Placed {claim.orderDate}</span>
      </div>

      {/* Product Preview Block */}
      <div className="p-3.5 rounded-2xl bg-[#141516] border border-[#23252a] flex items-center gap-3.5">
        <div className="relative w-16 h-16 rounded-xl bg-[#0f1011] overflow-hidden shrink-0 border border-[#23252a]">
          <Image
            src={claim.productImage}
            alt={claim.productName}
            fill
            sizes="64px"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-semibold text-[#f7f8f8] truncate">
            {claim.productName}
          </span>
          <span className="text-xs text-[#828fff] font-mono mt-0.5">
            ৳{claim.price.toLocaleString()} • Authentic Import
          </span>
          <div className="flex items-center gap-1 mt-1 text-red-400 text-xs">
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
      <div className="mt-4 pt-1 flex items-center justify-between bg-[#141516] border border-[#23252a] p-3.5 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#27a644]/15 text-[#27a644] border border-[#27a644]/30 flex items-center justify-center shrink-0">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-[#8a8f98]">Guaranteed Resolution</span>
            <span className="text-xs sm:text-sm text-[#f7f8f8] font-semibold">
              100% Free Doorstep Replacement
            </span>
          </div>
        </div>
        <ShieldCheck className="text-[#27a644] w-5 h-5 shrink-0" />
      </div>
    </div>
  );
}