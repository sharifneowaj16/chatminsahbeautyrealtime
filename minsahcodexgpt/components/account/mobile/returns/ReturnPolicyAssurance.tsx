'use client';

import { Truck, ShieldCheck, Clock } from 'lucide-react';

export function ReturnPolicyAssurance() {
  return (
    <div className="mx-4 mt-5 p-3.5 bg-slate-900 text-white rounded-2xl shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
          <Truck className="w-3.5 h-3.5" />
        </div>
        <h4 className="text-xs font-semibold text-white">
          Doorstep Pickup & Zero Restocking Fees
        </h4>
      </div>

      <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
        Our courier partner will inspect and collect the item directly from your shipping address within 24–48 hours across Dhaka & nationwide.
      </p>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Full Refund Protected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>Fast 2-4 Day Payout</span>
        </div>
      </div>
    </div>
  );
}
