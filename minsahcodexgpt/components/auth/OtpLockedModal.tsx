'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, MessageCircle, ArrowLeft } from 'lucide-react';
import { SocialAuthButtons } from './SocialAuthButtons';

interface OtpLockedModalProps {
  retryAfterSeconds?: number;
  redirectTo?: string;
  onBack?: () => void;
  onClose?: () => void;
  onOpenConcierge?: () => void;
}

export function OtpLockedModal({
  retryAfterSeconds = 300,
  redirectTo,
  onBack,
  onClose,
  onOpenConcierge,
}: OtpLockedModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(Math.max(30, retryAfterSeconds));

  useEffect(() => {
    setSecondsLeft(Math.max(30, retryAfterSeconds));
  }, [retryAfterSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="space-y-4 py-1 text-center font-sans">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-[#ba1a1a]">
        <ShieldAlert className="h-6 w-6" />
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-[#181C1A]">Verification Temporarily Paused</h3>
        <p className="text-xs leading-relaxed text-[#5A615D]">
          Too many attempts on this number. Please try again in{' '}
          <strong className="text-[#062402]">
            {mins}:{secs}
          </strong>{' '}
          or continue instantly below.
        </p>
      </div>

      <div className="space-y-2.5 pt-1">
        <SocialAuthButtons redirectTo={redirectTo} />

        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-[#E2DED8] bg-[#F4F3EF] text-xs font-bold text-[#181C1A] transition hover:bg-[#E9E7E0]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Try Email &amp; Password Instead</span>
          </button>
        ) : null}

        {onOpenConcierge ? (
          <button
            type="button"
            onClick={onOpenConcierge}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#062402] px-4 text-xs font-bold text-white transition hover:bg-[#1c3a13]"
          >
            <MessageCircle className="h-4 w-4 text-[#25D366]" />
            <span>Need Help? Chat on WhatsApp</span>
          </button>
        ) : null}

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="w-full py-1.5 text-xs font-semibold text-[#5A615D] hover:text-[#062402]"
          >
            Close
          </button>
        ) : null}
      </div>
    </div>
  );
}
