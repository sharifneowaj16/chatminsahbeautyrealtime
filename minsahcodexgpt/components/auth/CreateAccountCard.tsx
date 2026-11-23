'use client';

import React, { useState } from 'react';
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
  User,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SocialAuthButtons } from './SocialAuthButtons';

export interface CreateAccountFormData {
  fullName: string;
  phone: string;
  email?: string;
}

interface CreateAccountCardProps {
  onSwitchToSignIn: (prefillPhone?: string) => void;
  onRequestPhoneOtpSignup: (data: CreateAccountFormData) => void;
  onPasswordSignupSuccess?: () => void;
  redirectTo?: string;
  externalError?: string | null;
  isLoading?: boolean;
}

export function CreateAccountCard({
  onSwitchToSignIn,
  onRequestPhoneOtpSignup,
  onPasswordSignupSuccess,
  redirectTo,
  externalError,
  isLoading = false,
}: CreateAccountCardProps) {
  const { register } = useAuth();
  const [signupMethod, setSignupMethod] = useState<'otp' | 'password'>('otp');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [suggestOtpForPhone, setSuggestOtpForPhone] = useState<string | null>(null);

  const displayError = errorMsg || externalError;
  const cleanPhoneDigits = phone.replace(/\D/g, '');

  const handleOtpSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuggestOtpForPhone(null);

    const cleanName = fullName.trim();
    if (!cleanName) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (cleanPhoneDigits.length < 10) {
      setErrorMsg('Please enter a valid 11-digit Bangladesh mobile number (01XXXXXXXXX).');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Please enter a valid email address or leave it blank.');
      return;
    }

    onRequestPhoneOtpSignup({
      fullName: cleanName,
      phone: cleanPhoneDigits,
      email: email.trim().toLowerCase() || undefined,
    });
  };

  const handlePasswordSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuggestOtpForPhone(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!cleanEmail && cleanPhoneDigits.length < 10) {
      setErrorMsg('Please enter an email address or a valid 11-digit mobile number.');
      return;
    }
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setSubmittingPassword(true);
    try {
      const res = await register({
        name: cleanName,
        email: cleanEmail || undefined,
        phone: cleanPhoneDigits.length >= 10 ? cleanPhoneDigits : undefined,
        password,
      });

      if (!res.success) {
        if (res.code === 'PHONE_EXISTS_USE_OTP' && cleanPhoneDigits.length >= 10) {
          setSuggestOtpForPhone(cleanPhoneDigits);
        }
        setErrorMsg(res.error || 'Could not create account. Please try again.');
        return;
      }

      onPasswordSignupSuccess?.();
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSubmittingPassword(false);
    }
  };

  const busy = isLoading || submittingPassword;

  return (
    <div className="space-y-4 font-sans">
      <div className="space-y-2">
        <p className="text-center text-[11px] font-semibold text-[#5A615D]">
          Instant 1-tap account creation
        </p>
        <SocialAuthButtons
          redirectTo={redirectTo}
          disabled={busy}
          onError={(msg) => setErrorMsg(msg)}
        />
      </div>

      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#E2DED8]" />
        </div>
        <span className="relative bg-[#FAF9F6] px-3 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
          or sign up with
        </span>
      </div>

      <div className="flex rounded-full border border-[#E2DED8] bg-[#F4F3EF] p-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => {
            setSignupMethod('otp');
            setErrorMsg(null);
            setSuggestOtpForPhone(null);
          }}
          className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full transition-all ${
            signupMethod === 'otp'
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
            setSignupMethod('password');
            setErrorMsg(null);
            setSuggestOtpForPhone(null);
          }}
          className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full transition-all ${
            signupMethod === 'password'
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
          className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="leading-snug">{displayError}</span>
          </div>
          {suggestOtpForPhone ? (
            <button
              type="button"
              onClick={() => onSwitchToSignIn(suggestOtpForPhone)}
              className="inline-flex items-center gap-1 rounded-full bg-[#1c3a13] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#152e0f]"
            >
              <span>Sign in with Mobile OTP instead</span>
              <ArrowRight className="h-3 w-3 text-[#D4F6A2]" />
            </button>
          ) : null}
        </div>
      ) : null}

      {signupMethod === 'otp' ? (
        <form onSubmit={handleOtpSignupSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="signup-otp-name" className="block text-xs font-bold text-[#181C1A]">
              Full Name <span className="text-[#4b6723]">*</span>
            </label>
            <div className="relative flex items-center">
              <User className="pointer-events-none absolute left-3.5 h-4 w-4 text-stone-400" />
              <input
                id="signup-otp-name"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Nusrat Jahan"
                className="h-11 w-full rounded-2xl border border-[#E2DED8] bg-white pl-10 pr-4 text-base font-medium text-[#181C1A] transition placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/15 sm:text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="signup-otp-phone" className="block text-xs font-bold text-[#181C1A]">
              Mobile Number <span className="text-[#4b6723]">*</span>
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute left-3.5 flex items-center border-r border-[#E2DED8] pr-2.5">
                <span className="text-xs font-bold text-[#062402]">BD +880</span>
              </div>
              <input
                id="signup-otp-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, '').slice(0, 13))}
                placeholder="017XXXXXXXX"
                className="h-11 w-full rounded-2xl border border-[#E2DED8] bg-white pl-[5.75rem] pr-4 text-base font-semibold text-[#181C1A] transition placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/15 sm:text-sm"
              />
            </div>
            <p className="flex items-center gap-1.5 text-[11px] text-[#5A615D]">
              <Lock className="h-3 w-3 shrink-0 text-[#4b6723]" />
              <span>No password needed ? verify once via 6-digit SMS code</span>
            </p>
          </div>

          <button
            type="submit"
            disabled={!fullName.trim() || cleanPhoneDigits.length < 10 || busy}
            className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1c3a13] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#152e0f] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#D4F6A2]" />
                <span>Sending SMS Code...</span>
              </>
            ) : (
              <>
                <span>Continue with SMS Code</span>
                <ArrowRight className="h-4 w-4 text-[#D4F6A2]" />
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handlePasswordSignupSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="signup-pw-name" className="block text-xs font-bold text-[#181C1A]">
              Full Name <span className="text-[#4b6723]">*</span>
            </label>
            <div className="relative flex items-center">
              <User className="pointer-events-none absolute left-3.5 h-4 w-4 text-stone-400" />
              <input
                id="signup-pw-name"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Nusrat Jahan"
                className="h-11 w-full rounded-2xl border border-[#E2DED8] bg-white pl-10 pr-4 text-base font-medium text-[#181C1A] transition placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/15 sm:text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="signup-pw-email" className="block text-xs font-bold text-[#181C1A]">
              Email Address <span className="text-[#4b6723]">*</span>
            </label>
            <input
              id="signup-pw-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 w-full rounded-2xl border border-[#E2DED8] bg-white px-4 text-base font-medium text-[#181C1A] transition placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/15 sm:text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="signup-pw-password" className="text-xs font-bold text-[#181C1A]">
                Password <span className="text-[#4b6723]">*</span>
              </label>
              <span className="text-[11px] font-medium text-[#5A615D]">Min 8 characters</span>
            </div>
            <div className="relative flex items-center">
              <input
                id="signup-pw-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password (min 8 chars)"
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
            disabled={!fullName.trim() || !email.trim() || password.length < 8 || busy}
            className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1c3a13] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#152e0f] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submittingPassword ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#D4F6A2]" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="h-4 w-4 text-[#D4F6A2]" />
              </>
            )}
          </button>
        </form>
      )}

      <p className="pt-0.5 text-center text-xs text-[#5A615D]">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => onSwitchToSignIn()}
          className="font-bold text-[#1c3a13] hover:underline"
        >
          Sign In
        </button>
      </p>

      <div className="flex items-center justify-center gap-2 border-t border-[#E2DED8] pt-3 text-center">
        <ShieldCheck className="h-4 w-4 shrink-0 text-[#4b6723]" />
        <span className="text-[11px] font-semibold text-[#5A615D]">
          Encrypted session &amp; instant 100 Glow Points welcome bonus
        </span>
      </div>
    </div>
  );
}

export default CreateAccountCard;
