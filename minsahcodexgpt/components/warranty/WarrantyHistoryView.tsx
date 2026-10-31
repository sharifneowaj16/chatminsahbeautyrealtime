'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Headphones, Plus, ShieldCheck } from 'lucide-react';
import WarrantyActiveClaimCard from './WarrantyActiveClaimCard';
import WarrantyPastClaimCard from './WarrantyPastClaimCard';
import WarrantyProtectionGuaranteeBanner from './WarrantyProtectionGuaranteeBanner';
import WarrantyConciergeCard from './WarrantyConciergeCard';
import { WarrantyActiveClaim, WarrantyClaimHistoryItem } from './types';

export default function WarrantyHistoryView() {
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [activeClaim] = useState<WarrantyActiveClaim | null>(null);
  const [pastClaims] = useState<WarrantyClaimHistoryItem[]>([]);

  const totalCount = (activeClaim ? 1 : 0) + pastClaims.length;
  const activeCount = activeClaim ? 1 : 0;
  const resolvedCount = pastClaims.length;

  return (
    <div className="w-full flex flex-col bg-[#faf9f6] min-h-screen pb-24">
      {/* Top Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#E2DED8]/60 bg-[#faf9f6]/85 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Link
            href="/account"
            aria-label="Go back"
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#1a1c1a] hover:bg-[#efeeeb] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-[18px] text-[#062402] font-bold tracking-tight">
            Warranty Claims
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Search claims"
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#43483f] hover:bg-[#efeeeb] transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Concierge assistance"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('minsah:open-concierge-modal'));
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#43483f] hover:bg-[#efeeeb] transition-colors"
          >
            <Headphones className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Top Summary & Actions */}
      <div className="px-4 pt-4 pb-2 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] text-[#4b6723] font-bold tracking-widest uppercase">
              Guarantee Care
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#4b6723]" />
              <span className="text-xs text-[#1a1c1a] font-semibold">
                1 Active Claim
              </span>
              <span className="text-[#43483f] text-xs">
                • 2 Completed
              </span>
            </div>
          </div>
          <Link
            href="/account/warranty/claim"
            className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-[#062402] hover:bg-[#1c3a13] text-white font-bold text-xs tracking-wide shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer border border-[#ccee9b]/20"
          >
            <Plus className="w-4 h-4 text-[#D4F6A2]" />
            <span>File Claim</span>
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2.5 pt-2 pb-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`h-9 px-4 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
              filter === 'all'
                ? 'bg-[#062402] text-white ring-1 ring-[#062402]'
                : 'bg-[#F2F6F0] text-[#1c3a13] hover:bg-[#E8F0E5] border border-[#E2DED8]/70'
            }`}
          >
            <span>All</span>
            <span
              className={`w-5 h-5 rounded-full text-[11px] inline-flex items-center justify-center font-bold ${
                filter === 'all'
                  ? 'bg-[#28531c] text-[#D4F6A2]'
                  : 'bg-[#E2DED8]/70 text-[#43483f]'
              }`}
            >
              {totalCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('active')}
            className={`h-9 px-4 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
              filter === 'active'
                ? 'bg-[#062402] text-white ring-1 ring-[#062402]'
                : 'bg-[#F2F6F0] text-[#1c3a13] hover:bg-[#E8F0E5] border border-[#E2DED8]/70'
            }`}
          >
            <span>Active</span>
            <span
              className={`w-5 h-5 rounded-full text-[11px] inline-flex items-center justify-center font-bold ${
                filter === 'active'
                  ? 'bg-[#28531c] text-[#D4F6A2]'
                  : 'bg-[#E2DED8]/70 text-[#43483f]'
              }`}
            >
              {activeCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('resolved')}
            className={`h-9 px-4 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
              filter === 'resolved'
                ? 'bg-[#062402] text-white ring-1 ring-[#062402]'
                : 'bg-[#F2F6F0] text-[#1c3a13] hover:bg-[#E8F0E5] border border-[#E2DED8]/70'
            }`}
          >
            <span>Resolved</span>
            <span
              className={`w-5 h-5 rounded-full text-[11px] inline-flex items-center justify-center font-bold ${
                filter === 'resolved'
                  ? 'bg-[#28531c] text-[#D4F6A2]'
                  : 'bg-[#E2DED8]/70 text-[#43483f]'
              }`}
            >
              {resolvedCount}
            </span>
          </button>
        </div>
      </div>

      {/* Main Claims Content */}
      <div className="px-4 space-y-4 pt-2">
        {!activeClaim && pastClaims.length === 0 && (
          <div className="rounded-2xl p-8 bg-[#F8FAF7] border border-[#E2DED8]/60 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#E8F0E5] text-[#1c3a13] flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <p className="text-base font-bold text-[#062402]">No warranty claims found</p>
            <p className="text-xs text-[#43483f] max-w-xs mx-auto">
              You do not have any active or past warranty claims at this time.
            </p>
          </div>
        )}

        {/* Active Claim Spotlight */}
        {activeClaim && (filter === 'all' || filter === 'active') && (
          <WarrantyActiveClaimCard claim={activeClaim} />
        )}

        {/* Resolved Claims */}
        {pastClaims.length > 0 && (filter === 'all' || filter === 'resolved') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pt-2">
              <div className="flex flex-col">
                <span className="text-[17px] text-[#062402] font-bold">
                  Claim History
                </span>
                <span className="text-xs text-[#43483f]">
                  Past resolved warranty cases
                </span>
              </div>
              <span className="text-xs text-[#4b6723] font-bold">
                {pastClaims.length} Cases Solved
              </span>
            </div>

            {pastClaims.map((item) => (
              <WarrantyPastClaimCard key={item.id} claim={item} />
            ))}
          </div>
        )}

        {/* Protection Guarantee Banner */}
        <WarrantyProtectionGuaranteeBanner />

        {/* WhatsApp Concierge */}
        <WarrantyConciergeCard />
      </div>
    </div>
  );
}
