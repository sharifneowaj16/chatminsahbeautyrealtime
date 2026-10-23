'use client';

import React from 'react';
import { Wallet, CreditCard, CheckCircle2 } from 'lucide-react';
import type { AccountPaymentItem } from './types';

interface AccountPaymentMethodsCardProps {
  methods: AccountPaymentItem[];
  instantCheckoutEnabled: boolean;
  onToggleInstantCheckout: () => void;
}

export default function AccountPaymentMethodsCard({
  methods,
  instantCheckoutEnabled,
  onToggleInstantCheckout,
}: AccountPaymentMethodsCardProps) {
  return (
    <section className="w-full bg-[#F8FAF7] rounded-3xl p-5 shadow-xs space-y-4 border border-[#E2DED8]/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#c7edb5] flex items-center justify-center text-[#062402]">
            <Wallet className="w-4 h-4" />
          </div>
          <h3 className="text-sm text-[#062402] font-bold">Payment Methods</h3>
        </div>
        <span className="text-xs text-[#4b6723] font-bold">{methods.length} Active</span>
      </div>

      <div className="space-y-2">
        {methods.map((method) => (
          <div
            key={method.id}
            className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E2DED8]/50 shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F2F6F0] flex items-center justify-center font-bold text-xs text-[#062402]">
                {method.type === 'bkash' ? (
                  <span className="text-[#E2136E] font-black text-xs">bK</span>
                ) : (
                  <CreditCard className="w-4 h-4 text-[#062402]" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-[#062402]">{method.title}</p>
                <p className="text-[11px] text-[#5A615D]">{method.detail}</p>
              </div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-[#4b6723]" />
          </div>
        ))}

        {/* 1-Tap Instant Checkout Switch */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E2DED8]/50 shadow-2xs">
          <div className="pr-2">
            <p className="text-xs font-bold text-[#062402]">1-Tap Instant Checkout</p>
            <p className="text-[11px] text-[#5A615D]">Bypass gateway step for repeat cart</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={instantCheckoutEnabled}
            onClick={onToggleInstantCheckout}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
              instantCheckoutEnabled ? 'bg-[#062402]' : 'bg-[#e3e2e0]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                instantCheckoutEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </section>
  );
}
