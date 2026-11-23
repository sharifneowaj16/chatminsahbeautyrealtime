'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { MemberSignInCard } from './MemberSignInCard';
import { CreateAccountCard, type CreateAccountFormData } from './CreateAccountCard';
import { OtpInputBoxes } from './OtpInputBoxes';
import { OtpLockedModal } from './OtpLockedModal';
import type { AuthStep } from './types';

interface UnifiedAuthPanelProps {
  initialStep?: AuthStep;
  initialPhone?: string;
  redirectTo?: string;
  noticeBanner?: string | null;
  errorBanner?: string | null;
  onStepChange?: (step: AuthStep) => void;
  onAuthenticated?: () => void;
  onClose?: () => void;
}

export function UnifiedAuthPanel({
  initialStep = 'phone',
  initialPhone = '',
  redirectTo,
  noticeBanner,
  errorBanner,
  onStepChange,
  onAuthenticated,
  onClose,
}: UnifiedAuthPanelProps) {
  const { loginWithOtp } = useAuth();
  const [step, setStep] = useState<AuthStep>(initialStep);
  const [phone, setPhone] = useState(initialPhone);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [otpPurpose, setOtpPurpose] = useState<'signin' | 'signup'>('signin');
  const [pendingSignup, setPendingSignup] = useState<CreateAccountFormData | null>(null);
  const [sendError, setSendError] = useState<string | null>(errorBanner || null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [lockRetryAfter, setLockRetryAfter] = useState(300);
  const [showSentNotice, setShowSentNotice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  useEffect(() => {
    if (initialPhone) setPhone(initialPhone);
  }, [initialPhone]);

  useEffect(() => {
    setSendError(errorBanner || null);
  }, [errorBanner]);

  const updateStep = (next: AuthStep) => {
    setStep(next);
    onStepChange?.(next);
  };

  const dispatchOtp = async (
    targetPhone: string,
    purpose: 'signin' | 'signup'
  ): Promise<boolean> => {
    setIsLoading(true);
    setSendError(null);
    setOtpError(null);

    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          phone: targetPhone,
          purpose,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        code?: string;
        maskedPhone?: string;
        cooldownSeconds?: number;
        retryAfter?: number;
      };

      if (!response.ok || !data.ok) {
        if (response.status === 429 && data.retryAfter && data.retryAfter > 60) {
          setLockRetryAfter(data.retryAfter);
          updateStep('locked');
          return false;
        }
        const msg = data.error || 'Unable to send verification SMS. Please try again.';
        setSendError(msg);
        setOtpError(msg);
        return false;
      }

      setMaskedPhone(data.maskedPhone || '');
      setCooldownSeconds(data.cooldownSeconds || 60);
      setAttemptsLeft(5);
      setShowSentNotice(true);
      updateStep('otp');
      return true;
    } catch {
      const msg = 'Network error while sending SMS. Please check your connection.';
      setSendError(msg);
      setOtpError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpPurpose('signin');
    setPendingSignup(null);
    await dispatchOtp(phone, 'signin');
  };

  const handleSignUpOtpRequest = async (data: CreateAccountFormData) => {
    setPendingSignup(data);
    setPhone(data.phone);
    setOtpPurpose('signup');
    await dispatchOtp(data.phone, 'signup');
  };

  const handleVerifyOtp = async (enteredOtp: string) => {
    setIsLoading(true);
    setOtpError(null);

    try {
      const verifyRes = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          phone,
          otp: enteredOtp,
          purpose: otpPurpose,
          fullName: pendingSignup?.fullName,
          email: pendingSignup?.email,
        }),
      });

      const verifyData = (await verifyRes.json().catch(() => ({}))) as {
        ok?: boolean;
        phone?: string;
        otpProof?: string;
        error?: string;
        code?: string;
        attemptsLeft?: number;
        retryAfter?: number;
      };

      if (!verifyRes.ok || !verifyData.ok || !verifyData.otpProof) {
        if (typeof verifyData.attemptsLeft === 'number') {
          setAttemptsLeft(verifyData.attemptsLeft);
        }
        if (verifyData.code === 'OTP_LOCKED' || verifyData.code === 'RATE_LIMITED') {
          setLockRetryAfter(verifyData.retryAfter || 300);
          updateStep('locked');
          return;
        }
        setOtpError(verifyData.error || 'Incorrect verification code. Please try again.');
        return;
      }

      const loginRes = await loginWithOtp(verifyData.phone || phone, verifyData.otpProof);
      if (!loginRes.success) {
        setOtpError(loginRes.error || 'Authentication failed. Please try again.');
        return;
      }

      onAuthenticated?.();
    } catch {
      setOtpError('Network error while verifying code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const showTopTabs = step === 'phone' || step === 'signup';

  return (
    <div className="space-y-4 font-sans">
      {noticeBanner && showTopTabs ? (
        <div className="rounded-xl border border-[#B5C4BB] bg-[#EAF7D8] px-3.5 py-2.5 text-xs font-semibold text-[#1c3a13]">
          {noticeBanner}
        </div>
      ) : null}

      {showSentNotice && step === 'otp' ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-[#B5C4BB] bg-[#EAF7D8] px-3.5 py-2.5 text-xs font-semibold text-[#1c3a13]">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4b6723]" />
            <span>SMS code sent to {maskedPhone || phone}</span>
          </span>
          <button
            type="button"
            onClick={() => setShowSentNotice(false)}
            className="text-xs font-bold underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {showTopTabs ? (
        <div className="grid grid-cols-2 rounded-full border border-[#E2DED8] bg-[#F4F3EF] p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setSendError(null);
              updateStep('phone');
            }}
            className={`h-9 rounded-full transition-all ${
              step === 'phone'
                ? 'bg-[#062402] text-white shadow-xs'
                : 'text-[#5A615D] hover:text-[#062402]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setSendError(null);
              updateStep('signup');
            }}
            className={`h-9 rounded-full transition-all ${
              step === 'signup'
                ? 'bg-[#062402] text-white shadow-xs'
                : 'text-[#5A615D] hover:text-[#062402]'
            }`}
          >
            Create Account
          </button>
        </div>
      ) : null}

      {step === 'phone' ? (
        <MemberSignInCard
          phone={phone}
          onChangePhone={setPhone}
          onSubmitOtpRequest={handleSignInOtpSubmit}
          onPasswordSuccess={onAuthenticated}
          onSwitchToSignUp={() => {
            setSendError(null);
            updateStep('signup');
          }}
          redirectTo={redirectTo}
          externalError={sendError}
          isLoading={isLoading}
        />
      ) : null}

      {step === 'signup' ? (
        <CreateAccountCard
          onSwitchToSignIn={(prefillPhone) => {
            if (prefillPhone) setPhone(prefillPhone);
            setSendError(null);
            updateStep('phone');
          }}
          onRequestPhoneOtpSignup={handleSignUpOtpRequest}
          onPasswordSignupSuccess={onAuthenticated}
          redirectTo={redirectTo}
          externalError={sendError}
          isLoading={isLoading}
        />
      ) : null}

      {step === 'otp' ? (
        <OtpInputBoxes
          phone={phone}
          maskedPhone={maskedPhone}
          cooldownSeconds={cooldownSeconds}
          onVerify={(code) => void handleVerifyOtp(code)}
          onResend={() => dispatchOtp(phone, otpPurpose)}
          onChangePhone={() => {
            setOtpError(null);
            setShowSentNotice(false);
            updateStep(otpPurpose === 'signup' ? 'signup' : 'phone');
          }}
          error={otpError}
          attemptsLeft={attemptsLeft}
          isLoading={isLoading}
        />
      ) : null}

      {step === 'locked' ? (
        <OtpLockedModal
          retryAfterSeconds={lockRetryAfter}
          redirectTo={redirectTo}
          onBack={() => {
            setSendError(null);
            setOtpError(null);
            updateStep('phone');
          }}
          onClose={onClose}
          onOpenConcierge={() => {
            onClose?.();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('minsah:open-concierge', { detail: { topic: 'unlock' } })
              );
            }
          }}
        />
      ) : null}
    </div>
  );
}

export default UnifiedAuthPanel;
