'use client';

import { X } from 'lucide-react';

interface ReturnRiderQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnNumber: string;
  riderName?: string;
}

export function ReturnRiderQrModal({
  isOpen,
  onClose,
  returnNumber,
  riderName = 'Courier Agent',
}: ReturnRiderQrModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#2f312f]/70 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs bg-white rounded-[28px] p-6 flex flex-col items-center text-center space-y-4 shadow-2xl border border-[#E2DED8]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-base font-bold text-[#1a1c1a]">
            Reverse Pickup Pass
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f4f3f1] flex items-center justify-center text-[#1a1c1a] hover:bg-[#e9e8e5] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 bg-white rounded-[20px] shadow-sm border border-slate-100 flex items-center justify-center">
          <svg className="w-44 h-44 text-[#062402]" fill="currentColor" viewBox="0 0 100 100">
            <path d="M10 10h30v30h-30zM15 15v20h20v-20zM22 22h6v6h-6zM60 10h30v30h-30zM65 15v20h20v-20zM72 22h6v6h-6zM10 60h30v30h-30zM15 65v20h20v-20zM22 72h6v6h-6zM46 10h8v16h-8zM46 32h8v8h-8zM60 46h16v8h-16zM82 46h8v16h-8zM46 60h8v8h-8zM60 60h8v16h-8zM74 68h16v8h-16zM46 74h8v16h-8zM60 82h16v8h-16zM82 82h8v8h-8z" />
          </svg>
        </div>

        <div className="flex flex-col space-y-1">
          <span className="text-xs font-mono font-bold text-[#1a1c1a] uppercase tracking-wider bg-[#f4f3f1] px-3 py-1 rounded-full">
            {returnNumber}-PASS
          </span>
          <span className="text-xs text-[#43483f] leading-snug pt-1">
            Present to {riderName} for instant scanner handshake & auto-disbursement
          </span>
        </div>
      </div>
    </div>
  );
}
