'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, MessageCircle } from 'lucide-react';

interface OtpLockedModalProps {
  onClose: () => void;
  onOpenConcierge?: () => void;
}

export function OtpLockedModal({ onClose, onOpenConcierge }: OtpLockedModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(300);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="space-y-4 text-center py-2">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-[#ba1a1a]">
        <ShieldAlert className="h-6 w-6" />
      </div>

      <div className="space-y-1">
        <h3 className="font-bold text-[#181C1A]">Too Many Incorrect Attempts</h3>
        <p className="text-xs text-[#5A615D]">
          For your account security, OTP verification is paused for{' '}
          <strong className="text-[#062402]">{mins}:{secs}</strong>.
        </p>
      </div>

      <div className="space-y-2 pt-1">
        {onOpenConcierge ? (
          <button
            type="button"
            onClick={onOpenConcierge}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#062402] px-4 font-bold text-white transition hover:bg-[#1c3a13]"
          >
            <MessageCircle className="h-4 w-4 text-[#25D366]" />
            <span>Unlock Instantly via WhatsApp Concierge</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-full items-center justify-center rounded-full border border-[#E2DED8] bg-[#F4F3EF] font-semibold text-[#5A615D]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
