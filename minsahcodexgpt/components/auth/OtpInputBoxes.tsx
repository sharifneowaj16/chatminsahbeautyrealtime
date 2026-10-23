"use client";

import React, { useState, useRef, useEffect } from "react";

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
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(59);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }

    const next = [...digits];
    // In case of paste
    if (clean.length > 1) {
      const pasted = clean.slice(0, 6).split("");
      pasted.forEach((char, i) => {
        next[i] = char;
      });
      setDigits(next);
      if (next.every((d) => d !== "")) {
        onVerify(next.join(""));
      }
      return;
    }

    next[index] = clean;
    setDigits(next);

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (next.every((d) => d !== "")) {
      onVerify(next.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendClick = () => {
    if (countdown > 0) return;
    setDigits(["", "", "", "", "", ""]);
    setCountdown(59);
    onResend();
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF7D8] text-[#1c3a13] font-bold text-[11px] border border-[#4b6723]/20 shadow-xs mb-1">
          <span className="material-symbols-outlined text-[14px] text-[#4b6723]">
            sms
          </span>
          OTP Verification
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#062402] tracking-tight">
          Enter 6-Digit Code
        </h2>
        <p className="text-xs text-[#43483f] max-w-xs mx-auto leading-relaxed">
          Sent to <strong className="text-[#062402]">+880 {phone}</strong>
          <button
            type="button"
            onClick={onChangePhone}
            className="text-[#4b6723] hover:underline font-bold ml-1.5"
          >
            Change
          </button>
        </p>
      </div>

      {/* 6 Digit Inputs */}
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2 sm:gap-2.5">
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
              className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold rounded-2xl bg-[#F8FAF7] border transition-all ${
                error
                  ? "border-[#ba1a1a] text-[#ba1a1a] focus:ring-2 focus:ring-[#ba1a1a]/20 bg-[#ffdad6]/20"
                  : digit
                  ? "border-[#4b6723] text-[#062402] bg-white ring-1 ring-[#4b6723]"
                  : "border-[#E2DED8] text-[#1a1c1a] focus:border-[#4b6723] focus:ring-2 focus:ring-[#4b6723]/20"
              }`}
            />
          ))}
        </div>

        {/* Screen 46: Invalid OTP Error State */}
        {error && (
          <div className="p-2.5 rounded-xl bg-[#ffdad6]/40 border border-[#ba1a1a]/30 flex items-center justify-between text-xs text-[#ba1a1a] animate-in shake duration-300">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
              <span className="truncate">{error}</span>
            </div>
            <span className="font-bold text-[10px] shrink-0">
              {attemptsLeft} attempts left
            </span>
          </div>
        )}
      </div>

      {/* Action CTA */}
      <button
        type="button"
        disabled={digits.some((d) => d === "") || isLoading}
        onClick={() => onVerify(digits.join(""))}
        className="w-full py-3.5 px-4 rounded-full bg-[#062402] hover:bg-[#1c3a13] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <span className="material-symbols-outlined text-[16px] animate-spin text-[#ccee9b]">
              refresh
            </span>
            <span>Verifying Code...</span>
          </>
        ) : (
          <>
            <span>Verify &amp; Sign In</span>
            <span className="material-symbols-outlined text-[16px] text-[#ccee9b]">
              check_circle
            </span>
          </>
        )}
      </button>

      {/* Resend Section */}
      <div className="text-center pt-1">
        {countdown > 0 ? (
          <span className="text-xs text-[#43483f]">
            Resend code in <strong className="text-[#062402]">{countdown}s</strong>
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResendClick}
            className="text-xs font-bold text-[#4b6723] hover:underline flex items-center justify-center gap-1 mx-auto active:scale-95"
          >
            <span className="material-symbols-outlined text-[15px]">refresh</span>
            Resend Code via SMS &amp; WhatsApp
          </button>
        )}
      </div>
    </div>
  );
}
