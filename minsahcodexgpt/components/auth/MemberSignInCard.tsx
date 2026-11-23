'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SocialAuthButtons } from './SocialAuthButtons';

interface MemberSignInCardProps {
  phone: string;
  onChangePhone: (val: string) => void;
  onSubmitOtpRequest: (e: React.FormEvent) => void;
  onPasswordSuccess?: () => void;
  onSwitchToSignUp?: () => void;
  redirectTo?: string;
  initialTab?: 'otp' | 'password';
  externalError?: string | null;
  isLoading?: boolean;
}

export function MemberSignInCard({
  phone,
  onChangePhone,
  onSubmitOtpRequest,
  onPasswordSuccess,
  onSwitchToSignUp,
  redirectTo,
  initialTab = 'otp',
  externalError,
  isLoading = false,
}: MemberSignInCardProps) {
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState<'otp' | 'password'>(initialTab);
  const [passwordIdentifier, setPasswordIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = localError || externalError;
  const cleanDigits = phone.replace(/\D/g, '');
  const canSendOtp = cleanDigits.length >= 10 && !isLoading;

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanId = passwordIdentifier.trim();
    if (!cleanId) {
      setLocalError('Please enter your email or mobile number.');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await login(cleanId, password);
      if (!res.success) {
        setLocalError(res.error || 'Invalid email/phone or password.');
        return;
      }
      onPasswordSuccess?.();
    } catch {
      setLocalError('Unable to sign in right now. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      <div className="space-y-2">
        <p className="text-center text-[11px] font-semibold text-[#5A615D]">
          Instant 1-tap sign in
        </p>
        <SocialAuthButtons
          redirectTo={redirectTo}
          disabled={isLoading || passwordLoading}
          onError={(msg) => setLocalError(msg)}
        />
      </div>

      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#E2DED8]" />
        </div>
        <span className="relative bg-[#FAF9F6] px-3 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
          or continue with
        </span>
      </div>

      <div className="flex rounded-full border border-[#E2DED8] bg-[#F4F3EF] p-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => {
            setActiveTab('otp');
            setLocalError(null);
          }}
          className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full transition-all ${
            activeTab === 'otp'
              ? 'bg-[#1c3a13] text-white shadow-xs'
              : 'text-[#5A615D] hover:text-[#181C1A]'
          }`}
        >
          <Phone className="h-3.5 w-3.5" />
          <span>Mobile OTP</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('password');
            setLocalError(null);
          }}
          className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full transition-all ${
            activeTab === 'password'
              ? 'bg-[#1c3a13] text-white shadow-xs'
              : 'text-[#5A615D] hover:text-[#181C1A]'
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          <span>Email &amp; Password</span>
        </button>
      </div>

      {displayError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="leading-snug">{displayError}</span>
        </div>
      ) : null}

      {activeTab === 'otp' ? (
        <form onSubmit={onSubmitOtpRequest} className="space-y-3.5">
          <div className="space-y-1.5">
            <label htmlFor="signin-otp-phone" className="block text-xs font-bold text-[#181C1A]">
              Mobile Number
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute left-3.5 flex items-center border-r border-[#E2DED8] pr-2.5">
                <span className="text-xs font-bold text-[#062402]">BD +880</span>
              </div>
              <input
                id="signin-otp-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                required
                value={phone}
                onChange={(e) => {
                  setLocalError(null);
                  onChangePhone(e.target.value.replace(/[^\d]/g, '').slice(0, 13));
                }}
                placeholder="017XXXXXXXX"
                className="h-11 w-full rounded-2xl border border-[#E2DED8] bg-white pl-[5.75rem] pr-4 text-base font-semibold text-[#181C1A] transition placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/15 sm:text-sm"
              />
            </div>
            <p className="flex items-center gap-1.5 text-[11px] text-[#5A615D]">
              <Lock className="h-3 w-3 shrink-0 text-[#4b6723]" />
              <span>6-digit verification code sent instantly via SMS</span>
            </p>
          </div>

          <button
            type="submit"
            disabled={!canSendOtp}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1c3a13] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#152e0f] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#D4F6A2]" />
                <span>Sending SMS Code...</span>
              </>
            ) : (
              <>
                <span>Send Verification Code</span>
                <ArrowRight className="h-4 w-4 text-[#D4F6A2]" />
              </>
            )}
          </button>
        </form>
      ) : null}

      {activeTab === 'password' ? (
        <form onSubmit={handlePasswordLogin} className="space-y-3.5">
          <div className="space-y-1.5">
            <label htmlFor="signin-identifier" className="block text-xs font-bold text-[#181C1A]">
              Email or Mobile Number
            </label>
            <input
              id="signin-identifier"
              type="text"
              autoComplete="username"
              required
              value={passwordIdentifier}
              onChange={(e) => {
                setLocalError(null);
                setPasswordIdentifier(e.target.value);
              }}
              placeholder="you@example.com or 017XXXXXXXX"
              className="h-11 w-full rounded-2xl border border-[#E2DED8] bg-white px-4 text-base font-medium text-[#181C1A] transition placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/15 sm:text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="signin-password" className="text-xs font-bold text-[#181C1A]">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[11px] font-semibold text-[#4b6723] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative flex items-center">
              <input
                id="signin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setLocalError(null);
                  setPassword(e.target.value);
                }}
                placeholder="Enter your password"
                className="h-11 w-full rounded-2xl border border-[#E2DED8] bg-white px-4 pr-11 text-base font-medium text-[#181C1A] transition placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/15 sm:text-sm"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 p-1 text-stone-400 transition hover:text-stone-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!passwordIdentifier.trim() || !password || passwordLoading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1c3a13] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#152e0f] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {passwordLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#D4F6A2]" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4 text-[#D4F6A2]" />
              </>
            )}
          </button>
        </form>
      ) : null}

      {onSwitchToSignUp ? (
        <p className="pt-0.5 text-center text-xs text-[#5A615D]">
          New to Minsah Beauty?{' '}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="font-bold text-[#1c3a13] hover:underline"
          >
            Create Account
          </button>
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 border-t border-[#E2DED8] pt-3">
        <div className="flex items-center gap-2 rounded-xl border border-[#E2DED8] bg-white p-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#4b6723]" />
          <span className="text-[11px] font-semibold text-[#062402]">100% Authentic</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#E2DED8] bg-white p-2">
          <Zap className="h-4 w-4 shrink-0 text-[#4b6723]" />
          <span className="text-[11px] font-semibold text-[#062402]">Instant Glow Points</span>
        </div>
      </div>
    </div>
  );
}

export default MemberSignInCard;
