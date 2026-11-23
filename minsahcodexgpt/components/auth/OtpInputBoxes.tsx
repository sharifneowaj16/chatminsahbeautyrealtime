'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

interface OtpInputBoxesProps {
  phone: string;
  maskedPhone?: string;
  cooldownSeconds?: number;
  onVerify: (otp: string) => void;
  onResend: () => Promise<boolean> | void;
  onChangePhone: () => void;
  error?: string | null;
  attemptsLeft?: number;
  isLoading?: boolean;
}

export function OtpInputBoxes({
  phone,
  maskedPhone,
  cooldownSeconds = 60,
  onVerify,
  onResend,
  onChangePhone,
  error,
  attemptsLeft = 5,
  isLoading = false,
}: OtpInputBoxesProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(cooldownSeconds);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    setCountdown(cooldownSeconds);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const fillAndMaybeSubmit = (rawDigits: string) => {
    const clean = rawDigits.replace(/\D/g, '').slice(0, 6);
    if (!clean) return;
    const next = ['', '', '', '', '', ''];
    clean.split('').forEach((char, idx) => {
      next[idx] = char;
    });
    setDigits(next);
    const focusIdx = Math.min(clean.length, 5);
    inputRefs.current[focusIdx]?.focus();
    if (clean.length === 6 && !isLoading) {
      onVerify(clean);
    }
  };

  const handleChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    if (clean.length > 1) {
      fillAndMaybeSubmit(clean);
      return;
    }

    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (index < 5) inputRefs.current[index + 1]?.focus();
    if (next.every((d) => d !== '') && !isLoading) {
      onVerify(next.join(''));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 1) {
      e.preventDefault();
      fillAndMaybeSubmit(pasted);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendClick = async () => {
    if (countdown > 0 || resending || isLoading) return;
    setResending(true);
    try {
      const ok = await onResend();
      if (ok !== false) {
        setDigits(['', '', '', '', '', '']);
        setCountdown(cooldownSeconds);
        inputRefs.current[0]?.focus();
      }
    } finally {
      setResending(false);
    }
  };

  const displayPhone = maskedPhone || (phone.startsWith('0') ? `+88${phone}` : `+880 ${phone}`);

  return (
    <div className="space-y-4 font-sans">
      <p className="text-center text-xs text-[#5A615D]">
        6-digit SMS code sent to <strong className="text-[#062402]">{displayPhone}</strong>
        <button
          type="button"
          onClick={onChangePhone}
          disabled={isLoading}
          className="ml-2 font-bold text-[#4b6723] hover:underline disabled:opacity-50"
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
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={6}
              value={digit}
              disabled={isLoading}
              onChange={(e) => handleChange(index, e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => handleKeyDown(index, e)}
              aria-label={`OTP digit ${index + 1}`}
              className={`h-12 w-full rounded-xl border text-center text-base font-bold transition focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/20 ${
                error
                  ? 'border-[#ba1a1a] bg-[#ffdad6]/20 text-[#ba1a1a]'
                  : digit
                    ? 'border-[#4b6723] bg-white text-[#062402] ring-1 ring-[#4b6723]'
                    : 'border-[#E2DED8] bg-white text-[#181C1A] focus:border-[#1c3a13]'
              }`}
            />
          ))}
        </div>

        {error ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[#ba1a1a]/30 bg-[#ffdad6]/40 p-2.5 text-xs font-medium text-[#ba1a1a]">
            <span className="flex min-w-0 items-center gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="leading-snug">{error}</span>
            </span>
            {attemptsLeft > 0 ? (
              <span className="shrink-0 font-bold">{attemptsLeft} left</span>
            ) : null}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        disabled={digits.some((d) => d === '') || isLoading}
        onClick={() => onVerify(digits.join(''))}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1c3a13] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#152e0f] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
            Resend SMS code in <strong className="text-[#062402]">{countdown}s</strong>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => void handleResendClick()}
            disabled={resending || isLoading}
            className="mx-auto inline-flex items-center gap-1.5 text-xs font-bold text-[#4b6723] hover:underline disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
            <span>{resending ? 'Sending...' : 'Resend Verification Code'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
