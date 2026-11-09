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
    <div className="rounded-2xl bg-[#0f1011] border border-[#23252a] p-4 sm:p-5 shadow-xl flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="px-2.5 py-0.5 rounded-full bg-[#27a644]/15 text-[#27a644] border border-[#27a644]/30 text-[11px] font-semibold">
          Resolved {claim.resolvedDate}
        </span>
        <span className="text-xs text-[#8a8f98] font-mono">
          {claim.claimNumber}
        </span>
      </div>

      <div className="p-3.5 rounded-2xl bg-[#141516] border border-[#23252a] flex items-center gap-3.5">
        <div className="relative w-14 h-14 rounded-xl bg-[#0f1011] overflow-hidden shrink-0 border border-[#23252a]">
          <Image
            src={claim.productImage}
            alt={claim.productName}
            fill
            sizes="56px"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-semibold text-[#f7f8f8] truncate">
            {claim.productName}
          </span>
          <span className="text-xs text-[#8a8f98] font-mono">
            ৳{claim.price.toLocaleString()} • Order #{claim.orderNumber}
          </span>
          <span className="text-xs text-[#8a8f98] mt-0.5 truncate">
            Issue: {claim.issue}
          </span>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-[#141516] border border-[#23252a] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 min-w-0">
          {claim.resolutionType === 'replacement' ? (
            <CheckCircle2 className="w-4 h-4 text-[#27a644] shrink-0" />
          ) : (
            <RefreshCw className="w-4 h-4 text-[#27a644] shrink-0" />
          )}
          <span className="text-[#f7f8f8] font-medium text-xs truncate">
            {claim.resolutionText}
          </span>
        </div>
        {claim.hasSlipDownload && (
          <button
            type="button"
            onClick={() => alert(`Downloading warranty resolution slip for ${claim.claimNumber}...`)}
            className="text-[#828fff] hover:text-[#f7f8f8] font-semibold text-xs flex items-center gap-1 shrink-0 active:opacity-75 cursor-pointer transition-colors"
          >
            <span>Slip</span>
            <Download className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}