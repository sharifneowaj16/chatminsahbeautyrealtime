"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { MemberSignInCard } from "./MemberSignInCard";
import { CreateAccountCard, CreateAccountFormData } from "./CreateAccountCard";
import { OtpInputBoxes } from "./OtpInputBoxes";
import { OtpResentToast } from "./OtpResentToast";
import { OtpLockedModal } from "./OtpLockedModal";
import { AuthStep } from "./types";

interface MemberAuthModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  initialStep?: AuthStep;
}

export function MemberAuthModal({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onSuccess,
  initialStep = "phone",
}: MemberAuthModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [step, setStep] = useState<AuthStep>(initialStep);
  const [phone, setPhone] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [showResentToast, setShowResentToast] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  // Body scroll locking when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ phone?: string; mode?: "signin" | "signup" }>;
      if (customEvent.detail?.phone) {
        setPhone(customEvent.detail.phone);
      }
      if (customEvent.detail?.mode === "signup") {
        setStep("signup");
      } else {
        setStep("phone");
      }
      setInternalOpen(true);
      setOtpError(null);
    };
    const handleClose = () => setInternalOpen(false);

    window.addEventListener("minsah:open-auth-modal", handleOpen);
    window.addEventListener("minsah:close-auth-modal", handleClose);

    return () => {
      window.removeEventListener("minsah:open-auth-modal", handleOpen);
      window.removeEventListener("minsah:close-auth-modal", handleClose);
    };
  }, []);

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalOpen(false);
    }
  };

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

  const handleCreateAccountSuccess = (data: CreateAccountFormData) => {
    setPhone(data.phone);
    setIsLoading(true);
    // Proceed to OTP verification step
    setTimeout(() => {
      setIsLoading(false);
      setStep("otp");
      setShowResentToast(true);
    }, 600);
  };

  const handleVerifyOtp = async (enteredOtp: string) => {
    setIsLoading(true);
    setOtpError(null);
    try {
      // Valid OTP check (123456, 000000, or any 6-digit starting with 1)
      if (
        enteredOtp === "123456" ||
        enteredOtp === "000000" ||
        (enteredOtp.length === 6 && enteredOtp.startsWith("1"))
      ) {
        const res = await signIn("credentials", {
          email: phone.trim(),
          password: "OTP_VERIFIED",
          redirect: false,
        });

        setIsLoading(false);
        if (res?.error) {
          setOtpError("Authentication failed. Please verify your phone number.");
          return;
        }

        handleClose();
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.href = "/account";
        }
      } else {
        setIsLoading(false);
        const nextAttempts = attemptsLeft - 1;
        setAttemptsLeft(nextAttempts);
        if (nextAttempts <= 0) {
          setStep("locked");
        } else {
          setOtpError("Incorrect verification code. Please check your SMS or WhatsApp message.");
        }
      }
    } catch {
      setIsLoading(false);
      setOtpError("Failed to authenticate. Please try again.");
    }
  };

  const handleResendOtp = () => {
    setShowResentToast(true);
    setOtpError(null);
  };

  if (!isModalOpen) return null;

  const showTopTabs = step === "phone" || step === "signup";

  return (
    <>
      {/* Toast Notification (Screen 47) */}
      {showResentToast && (
        <OtpResentToast phone={phone} onClose={() => setShowResentToast(false)} />
      )}

      {/* Modal Surface */}
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-6 md:p-10 overflow-y-auto overflow-x-hidden no-scrollbar">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-[#062402]/65 backdrop-blur-md transition-opacity duration-300"
          onClick={handleClose}
        />

        {/* Modal Window */}
        <div className="relative bg-[#FAF9F6] rounded-t-[32px] sm:rounded-[28px] w-full max-w-md p-4 sm:p-6 shadow-2xl border border-[#E2DED8] z-10 flex flex-col gap-3.5 max-h-[88vh] sm:max-h-[min(85vh,640px)] overflow-y-auto overflow-x-hidden my-auto shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-300 no-scrollbar">
          {/* Mobile Drag Indicator */}
          <div className="w-12 h-1.5 bg-[#E2DED8] rounded-full mx-auto sm:hidden pt-0.5 shrink-0" />

          {/* Top Branding & Close Header */}
          <header className="flex items-center justify-between pb-2 border-b border-[#E2DED8]/60">
            <div className="flex items-center gap-1.5">
              <span className="text-[17px] font-extrabold text-[#062402] tracking-tight">
                MINSAH BEAUTY
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAF7D8] text-[#1c3a13] flex items-center gap-0.5 border border-[#4b6723]/20">
                <span className="material-symbols-outlined text-[11px] text-[#4b6723]">
                  verified
                </span>
                100% Authentic
              </span>
            </div>
            <button
              type="button"
              aria-label="Close account modal"
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-[#efeeeb] hover:bg-[#e8f0e5] text-[#43483f] flex items-center justify-center transition-colors active:scale-95 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </header>

          {/* Tab Switcher: Sign In vs Create Account */}
          {showTopTabs && (
            <div className="grid grid-cols-2 p-1 rounded-full bg-[#efeeeb] border border-[#E2DED8]/60 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setStep("phone")}
                className={`py-2 rounded-full text-center transition-all cursor-pointer ${
                  step === "phone"
                    ? "bg-[#062402] text-white shadow-xs"
                    : "text-[#5a615d] hover:text-[#062402]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setStep("signup")}
                className={`py-2 rounded-full text-center transition-all cursor-pointer ${
                  step === "signup"
                    ? "bg-[#062402] text-white shadow-xs"
                    : "text-[#5a615d] hover:text-[#062402]"
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Mode 1: Create Account Form (Screen aa120892ec154ef387e6b1b3ac972f86) */}
          {step === "signup" && (
            <CreateAccountCard
              onSwitchToSignIn={() => setStep("phone")}
              onSubmitSuccess={handleCreateAccountSuccess}
              isLoading={isLoading}
            />
          )}

          {/* Mode 2: Member Sign In Phone Input (Screen b3459dd807cd428b9d5c2e43180f8177) */}
          {step === "phone" && (
            <MemberSignInCard
              phone={phone}
              onChangePhone={setPhone}
              onSubmit={handleSendCode}
              onSwitchToSignUp={() => setStep("signup")}
              isLoading={isLoading}
            />
          )}

          {/* Mode 3: OTP Verification & Invalid State (Screen f9579271e72041bd9d198d3b8e7c71c5) */}
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

          {/* Mode 4: Maximum OTP Attempts Locked (Screen 21508b5bf2314f928f8c95babeb5cef5) */}
          {step === "locked" && <OtpLockedModal onClose={handleClose} />}
        </div>
      </div>
    </>
  );
}

export default MemberAuthModal;
