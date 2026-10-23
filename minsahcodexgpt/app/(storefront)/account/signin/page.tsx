"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MemberSignInCard } from "@/components/auth/MemberSignInCard";
import { OtpInputBoxes } from "@/components/auth/OtpInputBoxes";
import { OtpResentToast } from "@/components/auth/OtpResentToast";
import { OtpLockedModal } from "@/components/auth/OtpLockedModal";
import { AuthStep } from "@/components/auth/types";

export default function SignInPage() {
  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [showResentToast, setShowResentToast] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 9) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep("otp");
      setShowResentToast(true);
    }, 700);
  };

  const handleVerifyOtp = (enteredOtp: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (enteredOtp === "123456" || enteredOtp === "000000" || (enteredOtp.length === 6 && enteredOtp.startsWith("1"))) {
        alert("Verification successful! Welcome to Minsah VIP Club.");
        window.location.href = "/account/profile";
      } else {
        const nextAttempts = attemptsLeft - 1;
        setAttemptsLeft(nextAttempts);
        if (nextAttempts <= 0) {
          setStep("locked");
        } else {
          setOtpError("Incorrect verification code. Please check your SMS or WhatsApp message.");
        }
      }
    }, 600);
  };

  const handleResendOtp = () => {
    setShowResentToast(true);
    setOtpError(null);
  };

  return (
    <div className="w-full min-h-screen bg-[#FAF9F6] text-[#1a1c1a] antialiased flex flex-col justify-center items-center p-4">
      {showResentToast && (
        <OtpResentToast phone={phone} onClose={() => setShowResentToast(false)} />
      )}

      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#E2DED8] space-y-4">
        {step === "phone" && (
          <MemberSignInCard
            phone={phone}
            onChangePhone={setPhone}
            onSubmit={handleSendCode}
            isLoading={isLoading}
          />
        )}

        {step === "otp" && (
          <OtpInputBoxes
            phone={phone}
            onVerify={handleVerifyOtp}
            onResend={handleResendOtp}
            onChangePhone={() => {
              setStep("phone");
              setOtpError(null);
            }}
            error={otpError}
            attemptsLeft={attemptsLeft}
            isLoading={isLoading}
          />
        )}

        {step === "locked" && (
          <OtpLockedModal onClose={() => (window.location.href = "/")} />
        )}

        <div className="text-center pt-2">
          <Link
            href="/"
            className="text-xs text-[#43483f] hover:text-[#062402] font-semibold"
          >
            ← Return to Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}
