'use client';

import React from 'react';
import { CreditCard, Lock, MoreVertical, Plus, Check } from 'lucide-react';

export default function PaymentWalletsBentoCard() {
  return (
    <div className="bg-[#F2F6F0] rounded-2xl p-3.5 shadow-sm border border-[#E2DED8]/60 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <CreditCard className="w-4 h-4 text-[#4b6723]" />
          <h3 className="text-[14px] text-[#062402] font-bold">
            Payment &amp; Wallets
          </h3>
        </div>
        <Lock className="w-4 h-4 text-[#4b6723]" />
      </div>

      <div className="space-y-1.5">
        {/* bKash */}
        <div className="bg-white rounded-xl px-3 py-2 flex items-center justify-between border border-[#E2DED8]/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#ffd8e8] flex items-center justify-center font-bold text-[11px] text-[#380f26] shrink-0">
              bK
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-[#062402] font-bold truncate">
                bKash Direct 01712***678
              </p>
              <p className="text-[10px] text-[#4b6723] font-semibold flex items-center gap-0.5">
                <Check className="w-3 h-3 text-[#4b6723]" /> 1-Tap Authorized
              </p>
            </div>
          </div>
          <span className="px-1.5 py-0.2 rounded bg-[#EAF7D8] text-[#1c3a13] text-[9px] font-bold shrink-0">
            Default
          </span>
        </div>

        {/* Nagad */}
        <div className="bg-white rounded-xl px-3 py-2 flex items-center justify-between border border-[#E2DED8]/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#E8F0E5] flex items-center justify-center text-[#4b6723] font-bold text-[10px] shrink-0">
              NG
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-[#062402] font-bold truncate">
                Nagad Wallet 01844***321
              </p>
              <p className="text-[10px] text-[#43483f] truncate">
                Quick Pay Ready
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="More"
            className="text-[#43483f] hover:text-[#062402] p-0.5"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Visa Card */}
        <div className="bg-white rounded-xl px-3 py-2 flex items-center justify-between border border-[#E2DED8]/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#062402] flex items-center justify-center text-white font-bold text-[9px] shrink-0">
              VISA
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-[#062402] font-bold truncate">
                •••• 4242 (Standard Chartered)
              </p>
              <p className="text-[10px] text-[#43483f] truncate">
                Expires 08/27 • Dual Currency
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="More"
            className="text-[#43483f] hover:text-[#062402] p-0.5"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add Payment Method Button */}
      <button
        type="button"
        onClick={() => alert('Add Payment Method dialog')}
        className="mt-1 w-full py-2 rounded-xl bg-white hover:bg-[#E8F0E5] text-[#062402] text-[11px] font-bold border border-dashed border-[#E2DED8] flex items-center justify-center gap-1 active:scale-98 transition-all cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add New Method</span>
      </button>
    </div>
  );
}
