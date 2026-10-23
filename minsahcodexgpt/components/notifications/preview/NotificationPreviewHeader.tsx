'use client';

import React from 'react';
import { MailCheck, X } from 'lucide-react';

interface NotificationPreviewHeaderProps {
  phone: string;
  onClose: () => void;
}

export default function NotificationPreviewHeader({
  phone,
  onClose,
}: NotificationPreviewHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-2 border-b border-[#E2DED8]">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-[#EAF7D8] text-[#1c3a13] flex items-center justify-center shrink-0 border border-[#4b6723]/30">
          <MailCheck className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-[17px] font-bold text-[#1c3a13] tracking-tight">
              Restock Notification Preview
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-[#1c3a13] text-[#D4F6A2] text-[9px] font-bold tracking-wide">
              Live Sample
            </span>
          </div>
          <p className="text-[11px] text-[#5A615D]">
            Simulated customer dispatch to {phone}
          </p>
        </div>
      </div>
      <button
        type="button"
        aria-label="Close notification preview"
        onClick={onClose}
        className="w-8 h-8 rounded-full bg-[#F2F6F0] flex items-center justify-center text-[#5A615D] hover:text-[#1c3a13] active:scale-95 transition-all shadow-xs"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
