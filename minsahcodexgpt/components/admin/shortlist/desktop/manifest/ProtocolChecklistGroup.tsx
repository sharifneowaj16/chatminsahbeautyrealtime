'use client';

import React from 'react';

interface ProtocolChecklistGroupProps {
  protocolChecked: boolean;
  expiryChecked: boolean;
  memoChecked: boolean;
  onProtocolChange: (checked: boolean) => void;
  onExpiryChange: (checked: boolean) => void;
  onMemoChange: (checked: boolean) => void;
}

export const ProtocolChecklistGroup: React.FC<ProtocolChecklistGroupProps> = ({
  protocolChecked,
  expiryChecked,
  memoChecked,
  onProtocolChange,
  onExpiryChange,
  onMemoChange,
}) => {
  return (
    <div className="mx-4 my-3 p-3 rounded-lg bg-[#060c18] border border-[#162337] font-mono text-xs select-none">
      <div className="font-bold text-white mb-2 flex items-center justify-between text-[11px]">
        <span>Procurement Quality Protocol Checklist</span>
        <span className="text-[10px] text-slate-500 font-normal">Mandatory QA</span>
      </div>

      <div className="space-y-1.5 text-[11px]">
        <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={protocolChecked}
            onChange={(e) => onProtocolChange(e.target.checked)}
            className="w-3.5 h-3.5 rounded bg-[#030710] border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
          />
          <span>Authentic Batch Hologram &amp; Seal Verified ✓</span>
        </label>

        <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={expiryChecked}
            onChange={(e) => onExpiryChange(e.target.checked)}
            className="w-3.5 h-3.5 rounded bg-[#030710] border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
          />
          <span>Expiry Date ≥ 18 Months Retention Verified ✓</span>
        </label>

        <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={memoChecked}
            onChange={(e) => onMemoChange(e.target.checked)}
            className="w-3.5 h-3.5 rounded bg-[#030710] border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
          />
          <span>Wholesale Stall Cash Memo / Receipt Collected</span>
        </label>
      </div>
    </div>
  );
};
