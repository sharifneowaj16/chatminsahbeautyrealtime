'use client';

import React from 'react';

interface MobileOrderDemandStatusPillProps {
  urgencyLabel?: string;
  shippingType?: string;
  paymentMethod?: string;
}

export const MobileOrderDemandStatusPill: React.FC<MobileOrderDemandStatusPillProps> = ({
  urgencyLabel,
  shippingType,
  paymentMethod,
}) => {
  return (
    <div className="flex items-center gap-1.5 flex-wrap font-mono text-[9px]">
      {urgencyLabel && (
        <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold uppercase">
          {urgencyLabel}
        </span>
      )}

      {shippingType === 'Express' && (
        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
          ⚡ Same-Day Express
        </span>
      )}

      {paymentMethod && (
        <span
          className={`px-1.5 py-0.2 rounded border font-semibold ${
            paymentMethod === 'bKash' || paymentMethod === 'Nagad'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
              : 'bg-[#061322] border-[#182a40] text-slate-400'
          }`}
        >
          {paymentMethod}
        </span>
      )}
    </div>
  );
};
