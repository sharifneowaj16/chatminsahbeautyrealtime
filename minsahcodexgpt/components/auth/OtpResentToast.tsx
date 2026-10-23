"use client";

import React, { useEffect } from "react";

interface OtpResentToastProps {
  phone: string;
  onClose: () => void;
}

export function OtpResentToast({ phone, onClose }: OtpResentToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3200);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-x-4 top-20 z-50 max-w-md mx-auto bg-[#062402] text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between border border-[#ccee9b]/30 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-[#ccee9b]/20 flex items-center justify-center text-[#ccee9b] shrink-0">
          <span className="material-symbols-outlined text-[20px]">mark_email_read</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">New OTP Code Dispatched</p>
          <p className="text-[11px] text-[#e3e2e0] truncate">
            Sent via SMS &amp; WhatsApp to +880 {phone}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 shrink-0 ml-2"
      >
        <span className="material-symbols-outlined text-[14px]">close</span>
      </button>
    </div>
  );
}
