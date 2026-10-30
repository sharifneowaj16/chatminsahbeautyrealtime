'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

interface OtpInputBoxesProps {
  phone: string;
  onVerify: (otp: string) => void;
  onResend: () => void;
  onChangePhone: () => void;
  error?: string | null;
  attemptsLeft?: number;
  isLoading?: boolean;
}

export function OtpInputBoxes({
  phone,
  onVerify,
  onResend,
  onChangePhone,
  error,
  attemptsLeft = 3,
  isLoading = false,
}: OtpInputBoxesProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(59);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    const next = [...digits];
    if (clean.length > 1) {
      clean.slice(0, 6).split('').forEach((char, i) => {
        next[i] = char;
      });
      setDigits(next);
      if (next.every((d) => d !== '')) onVerify(next.join(''));
      return;
    }

    next[index] = clean;
    setDigits(next);
    if (index < 5) inputRefs.current[index + 1]?.focus();
    if (next.every((d) => d !== '')) onVerify(next.join(''));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendClick = () => {
    if (countdown > 0) return;
    setDigits(['', '', '', '', '', '']);
    setCountdown(59);
    onResend();
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="space-y-4">
      <p className="text-center text-xs text-[#5A615D]">
        Code sent to <strong className="text-[#062402]">+880 {phone}</strong>
        <button
          type="button"
          onClick={onChangePhone}
          className="ml-2 font-bold text-[#4b6723] hover:underline"
        >
          Change
        </button>
      </p>

      <div className="space-y-2.5">
        <div className="grid grid-cols-6 gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              aria-label={`OTP digit ${index + 1}`}
              className={`h-12 w-full rounded-xl border text-center font-bold transition ${
                error
                  ? 'border-[#ba1a1a] bg-[#ffdad6]/20 text-[#ba1a1a]'
                  : digit
                    ? 'border-[#4b6723] bg-white text-[#062402] ring-1 ring-[#4b6723]'
                    : 'border-[#E2DED8] bg-white text-[#181C1A] focus:border-[#4b6723]'
              }`}
            />
          ))}
        </div>

        {error ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[#ba1a1a]/30 bg-[#ffdad6]/40 p-2.5 text-xs text-[#ba1a1a]">
            <span className="flex items-center gap-1.5 min-w-0 truncate">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="truncate">{error}</span>
            </span>
            <span className="shrink-0 font-bold">{attemptsLeft} left</span>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        disabled={digits.some((d) => d === '') || isLoading}
        onClick={() => onVerify(digits.join(''))}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#062402] px-4 font-bold text-white shadow-sm transition hover:bg-[#1c3a13] disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-[#D4F6A2]" />
            <span>Verifying Code...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4 text-[#D4F6A2]" />
            <span>Verify &amp; Sign In</span>
          </>
        )}
      </button>

      <div className="text-center">
        {countdown > 0 ? (
          <span className="text-xs text-[#5A615D]">
            Resend code in <strong className="text-[#062402]">{countdown}s</strong>
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResendClick}
            className="mx-auto inline-flex items-center gap-1.5 text-xs font-bold text-[#4b6723] hover:underline"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Resend Code via SMS &amp; WhatsApp</span>
          </button>
        )}
      </div>
    </div>
  );
}
