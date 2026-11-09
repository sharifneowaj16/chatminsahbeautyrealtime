'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Headphones, Plus, ShieldCheck } from 'lucide-react';
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
    <div className="w-full space-y-6 overflow-x-hidden text-[#f7f8f8]">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#5e6ad2]/15 text-[#828fff] text-[11px] font-semibold border border-[#5e6ad2]/30 mb-2">
            <ShieldCheck className="w-3 h-3 text-[#828fff]" />
            <span>100% AUTHENTICITY GUARANTEE • DOORSTEP SWAP</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#f7f8f8] tracking-tight">
            Warranty &amp; Claims
          </h1>
          <p className="text-xs sm:text-sm text-[#8a8f98] mt-0.5">
            Track live claims, doorstep replacement dispatch status, and past resolutions
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            aria-label="Concierge assistance"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('minsah:open-concierge-modal'));
            }}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#141516] border border-[#23252a] text-[#828fff] hover:bg-[#18191a] hover:text-[#f7f8f8] transition-colors cursor-pointer shadow-sm"
          >
            <Headphones className="w-4 h-4" />
          </button>
          <Link
            href="/account/warranty/claim"
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-[#5e6ad2] hover:bg-[#828fff] text-white font-semibold text-xs tracking-wide shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>File Claim</span>
          </Link>
        </div>
      </div>

      {/* ── Responsive 3-Segment Filter Tabs (Zero Horizontal Scroll) ─────────── */}
      <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-[#0f1011] border border-[#23252a] rounded-2xl shadow-sm">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-[#5e6ad2] text-white shadow-sm font-semibold'
              : 'bg-transparent text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#141516]'
          }`}
        >
          <span>All</span>
          <span
            className={`px-2 py-0.5 text-[11px] font-mono rounded-full ${
              filter === 'all' ? 'bg-white/20 text-white' : 'bg-[#18191a] text-[#8a8f98] border border-[#23252a]'
            }`}
          >
            {totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('active')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            filter === 'active'
              ? 'bg-[#5e6ad2] text-white shadow-sm font-semibold'
              : 'bg-transparent text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#141516]'
          }`}
        >
          <span>Active</span>
          <span
            className={`px-2 py-0.5 text-[11px] font-mono rounded-full ${
              filter === 'active' ? 'bg-white/20 text-white' : 'bg-[#18191a] text-[#8a8f98] border border-[#23252a]'
            }`}
          >
            {activeCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('resolved')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            filter === 'resolved'
              ? 'bg-[#5e6ad2] text-white shadow-sm font-semibold'
              : 'bg-transparent text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#141516]'
          }`}
        >
          <span>Resolved</span>
          <span
            className={`px-2 py-0.5 text-[11px] font-mono rounded-full ${
              filter === 'resolved' ? 'bg-white/20 text-white' : 'bg-[#18191a] text-[#8a8f98] border border-[#23252a]'
            }`}
          >
            {resolvedCount}
          </span>
        </button>
      </div>

      {/* ── Main Claims Content ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        {!activeClaim && pastClaims.length === 0 && (
          <div className="bg-[#0f1011] border border-[#23252a] rounded-2xl p-10 sm:p-14 text-center shadow-xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#5e6ad2]/10 border border-[#5e6ad2]/20 text-[#828fff] flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-[#f7f8f8]">No warranty claims found</h3>
              <p className="text-xs sm:text-sm text-[#8a8f98] max-w-sm mx-auto mt-1">
                You do not have any active or past warranty claims at this time. All eligible purchases carry 14-day protection.
              </p>
            </div>
            <Link
              href="/account/warranty/claim"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#5e6ad2] hover:bg-[#828fff] text-white font-semibold text-xs transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>File a New Claim</span>
            </Link>
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
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-[#f7f8f8]">Claim History</h2>
                <p className="text-xs text-[#8a8f98]">Past resolved warranty cases</p>
              </div>
              <span className="text-xs text-[#27a644] font-mono">
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