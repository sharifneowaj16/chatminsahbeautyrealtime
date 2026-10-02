// components/admin/shortlist/mobile/inspection/MobileInspectionActionDock.tsx
'use client';

import React from 'react';
import { PhoneCall, CheckSquare, ShieldCheck, Truck } from 'lucide-react';

export interface MobileInspectionActionDockProps {
  customerPhone: string;
  onBack: () => void;
  onMarkQaPassed?: () => void;
  onHandoverCourier?: () => void;
  isSubmitting?: boolean;
}

export function MobileInspectionActionDock({
  customerPhone,
  onBack,
  onMarkQaPassed,
  onHandoverCourier,
  isSubmitting = false,
}: MobileInspectionActionDockProps) {
  const sanitizedPhone = customerPhone.replace(/[^0-9+]/g, '');

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 p-4 bg-[#051424]/95 backdrop-blur-xl border-t border-[#172a3e] shadow-2xl flex flex-col gap-2">
      {(onMarkQaPassed || onHandoverCourier) && (
        <div className="grid grid-cols-2 gap-2">
          {onMarkQaPassed && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onMarkQaPassed}
              className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-98"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Mark QA Passed</span>
            </button>
          )}
          {onHandoverCourier && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onHandoverCourier}
              className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-98"
            >
              <Truck className="w-4 h-4" />
              <span>Handover Courier</span>
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        {sanitizedPhone && (
          <a
            href={`tel:${sanitizedPhone}`}
            className="h-12 px-4 rounded-xl bg-[#1c2b3c] hover:bg-[#273647] text-white flex items-center justify-center gap-2 active:scale-98 transition shrink-0"
            aria-label="Call Customer"
          >
            <PhoneCall className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-bold">Call Customer</span>
          </a>
        )}
        <button
          type="button"
          onClick={onBack}
          className="h-12 flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-98 transition"
        >
          <CheckSquare className="w-5 h-5" />
          <span>Back to Shortlist</span>
        </button>
      </div>
    </div>
  );
}
export default MobileInspectionActionDock;
