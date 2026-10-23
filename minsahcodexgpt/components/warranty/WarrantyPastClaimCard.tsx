'use client';

import React from 'react';
import Image from 'next/image';
import { CheckCircle2, Download, RefreshCw } from 'lucide-react';
import { WarrantyClaimHistoryItem } from './types';

interface WarrantyPastClaimCardProps {
  claim: WarrantyClaimHistoryItem;
}

export default function WarrantyPastClaimCard({ claim }: WarrantyPastClaimCardProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(6,36,2,0.03)] flex flex-col gap-2 border border-[#E2DED8]/60">
      <div className="flex items-center justify-between">
        <span className="px-2 py-0.5 rounded-full bg-[#E8F0E5] text-[#1c3a13] text-[11px] font-bold">
          Resolved {claim.resolvedDate}
        </span>
        <span className="text-[11px] text-[#43483f] font-mono">
          {claim.claimNumber}
        </span>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <div className="relative w-14 h-14 rounded-[14px] bg-[#efeeeb] overflow-hidden shrink-0 border border-[#E2DED8]/40">
          <Image
            src={claim.productImage}
            alt={claim.productName}
            fill
            sizes="56px"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[13px] font-bold text-[#1a1c1a] truncate">
            {claim.productName}
          </span>
          <span className="text-[11px] text-[#43483f]">
            ৳{claim.price.toLocaleString()} • Order #{claim.orderNumber}
          </span>
          <span className="text-[11px] text-[#43483f] mt-0.5 truncate">
            Issue: {claim.issue}
          </span>
        </div>
      </div>

      <div className="p-2.5 rounded-[16px] bg-[#F8FAF7] flex items-center justify-between text-[12px] mt-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {claim.resolutionType === 'replacement' ? (
            <CheckCircle2 className="w-4 h-4 text-[#4b6723] shrink-0" />
          ) : (
            <RefreshCw className="w-4 h-4 text-[#4b6723] shrink-0" />
          )}
          <span className="text-[#1a1c1a] font-semibold text-[11px] truncate">
            {claim.resolutionText}
          </span>
        </div>
        {claim.hasSlipDownload && (
          <button
            type="button"
            onClick={() => alert(`Downloading warranty resolution slip for ${claim.claimNumber}...`)}
            className="text-[#4b6723] font-bold text-[11px] flex items-center gap-0.5 shrink-0 active:opacity-75 cursor-pointer hover:underline"
          >
            <span>Slip</span>
            <Download className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
