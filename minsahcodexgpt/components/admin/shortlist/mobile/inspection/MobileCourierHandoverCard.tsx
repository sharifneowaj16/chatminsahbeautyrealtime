'use client';

import React from 'react';
import { Truck, CheckSquare, QrCode } from 'lucide-react';

interface MobileCourierHandoverCardProps {
  courierService: string;
  trackingCode?: string;
  runnerName: string;
}

export const MobileCourierHandoverCard: React.FC<MobileCourierHandoverCardProps> = ({
  courierService,
  trackingCode = 'STF-VAN-89214',
  runnerName,
}) => {
  return (
    <div className="rounded-xl bg-[#0d1c2d] border border-[#1f2f45] p-3.5 flex flex-col gap-2.5 shadow-md font-mono text-xs select-none">
      <div className="flex items-center justify-between pb-1 border-b border-[#1c2b3c]">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-indigo-400" />
          <span className="text-sm text-white font-bold font-sans">Dispatch Logistics</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 border border-indigo-700 text-indigo-300 font-bold">
          Steadfast Integration
        </span>
      </div>

      <div className="p-2.5 rounded-lg bg-[#051424] border border-[#16273c] flex items-center justify-between">
        <div>
          <span className="text-slate-200 font-bold text-xs block">{courierService}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Booking Code: <strong className="text-indigo-400">{trackingCode}</strong>
          </span>
        </div>
        <div className="w-8 h-8 rounded-lg bg-[#0e1d2e] border border-[#1b3149] text-indigo-400 flex items-center justify-center shrink-0">
          <QrCode className="w-4 h-4" />
        </div>
      </div>

      <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
        <span>Handover Runner: <strong className="text-white">{runnerName}</strong></span>
        <span className="text-emerald-400 font-bold flex items-center gap-1">
          <CheckSquare className="w-3 h-3" />
          <span>Bag Tag Attached</span>
        </span>
      </div>
    </div>
  );
};
