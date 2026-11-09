'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, Phone, ShieldCheck, Zap } from 'lucide-react';

interface MemberSignInCardProps {
  phone: string;
  onChangePhone: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSwitchToSignUp?: () => void;
  isLoading?: boolean;
}

export function MemberSignInCard({
  phone,
  onChangePhone,
  onSubmit,
  onSwitchToSignUp,
  isLoading = false,
}: MemberSignInCardProps) {
  const [activeTab, setActiveTab] = useState<'otp' | 'password'>('otp');
  const [passwordIdentifier, setPasswordIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    const cleanId = passwordIdentifier.trim();
    if (!cleanId) {
      return setPasswordError('Please enter your email or phone number.');
    }
    if (!password) {
      return setPasswordError('Please enter your password.');
    }

    try {
      setPasswordLoading(true);
      const res = await signIn('credentials', {
        email: cleanId,
        password: password,
        redirect: false,
      });

      setPasswordLoading(false);

      if (res?.error) {
        setPasswordError('Invalid email/phone or password. Please try again.');
        return;
      }

      window.location.href = '/account';
    } catch {
      setPasswordLoading(false);
      setPasswordError('Authentication failed. Please check your credentials.');
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/account' });
  };

  return (
    <div className="space-y-4 font-sans">
      {/* 1. Dual-Tab Segmented Switcher (Mobile OTP vs Email & Password) */}
      <div className="flex rounded-full border border-[#E2DED8] bg-[#F4F3EF] p-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('otp')}
          className={`flex-1 h-8 rounded-full flex items-center justify-center gap-1.5 transition-all ${
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
          onClick={() => setActiveTab('password')}
          className={`flex-1 h-8 rounded-full flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'password'
              ? 'bg-[#1c3a13] text-white shadow-xs'
              : 'text-[#5A615D] hover:text-[#181C1A]'
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          <span>Email &amp; Password</span>
        </button>
      </div>

      {/* 2A. TAB 1: Fast Phone OTP Form */}
      {activeTab === 'otp' && (
        <form onSubmit={onSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#181C1A]">Mobile Number</label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute left-3.5 flex items-center gap-1.5 border-r border-[#E2DED8] pr-2.5">
                <span>🇧🇩</span>
                <span className="text-xs font-bold text-[#062402]">+880</span>
              </div>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => onChangePhone(e.target.value.replace(/\D/g, ''))}
                placeholder="1712345678"
                maxLength={11}
                className="h-11 w-full rounded-2xl border border-[#E2DED8] bg-white pl-24 pr-4 text-base sm:text-sm font-semibold text-[#181C1A] placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/15 focus-visible:outline-none focus-visible:border-[#1c3a13] focus-visible:ring-2 focus-visible:ring-[#1c3a13]/15 transition"
              />
            </div>
            <p className="flex items-center gap-1.5 text-[11px] text-[#5A615D]">
              <Lock className="h-3 w-3 text-[#4b6723] shrink-0" />
              <span>Instant 6-digit verification code sent via SMS &amp; WhatsApp</span>
            </p>
          </div>

          <button
            type="submit"
            disabled={phone.length < 9 || isLoading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1c3a13] px-4 font-bold text-white shadow-sm transition hover:bg-[#152e0f] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#D4F6A2]" />
                <span>Sending Verification Code...</span>
              </>
            ) : (
              <>
                <span>Send Verification Code</span>
                <ArrowRight className="h-4 w-4 text-[#D4F6A2]" />
              </>
            )}
          </button>
        </form>
      )}

      {/* 2B. TAB 2: Email / Phone + Password Form */}
      {activeTab === 'password' && (
        <form onSubmit={handlePasswordLogin} className="space-y-3.5">
          {passwordError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#181C1A]">Email or Phone Number</label>
            <input
              type="text"
              required
              value={passwordIdentifier}
              onChange={(e) => setPasswordIdentifier(e.target.value)}
              placeholder="you@example.com or 017XXXXXXXX"
              className="h-11 w-full rounded-2xl border border-[#E2DED8] bg-white px-4 text-base sm:text-sm font-medium text-[#181C1A] placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/15 focus-visible:outline-none focus-visible:border-[#1c3a13] focus-visible:ring-2 focus-visible:ring-[#1c3a13]/15 transition"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#181C1A]">Password</label>
              <button
                type="button"
                onClick={() => setActiveTab('otp')}
                className="text-[11px] font-semibold text-[#4b6723] hover:underline"
              >
                Sign In with OTP instead
              </button>
            </div>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-11 w-full rounded-2xl border border-[#E2DED8] bg-white px-4 pr-11 text-base sm:text-sm font-medium text-[#181C1A] placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/15 focus-visible:outline-none focus-visible:border-[#1c3a13] focus-visible:ring-2 focus-visible:ring-[#1c3a13]/15 transition"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 p-1 text-stone-400 hover:text-stone-700 transition"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!passwordIdentifier.trim() || !password || passwordLoading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1c3a13] px-4 font-bold text-white shadow-sm transition hover:bg-[#152e0f] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {passwordLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#D4F6A2]" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In with Password</span>
                <ArrowRight className="h-4 w-4 text-[#D4F6A2]" />
              </>
            )}
          </button>
        </form>
      )}

      {/* 3. Hairline Divider + Google OAuth */}
      <div className="relative flex items-center justify-center pt-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#E2DED8]" />
        </div>
        <span className="relative bg-[#FAF9F6] px-3 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
          or continue with
        </span>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="flex h-10 w-full items-center justify-center gap-2.5 rounded-full border border-[#E2DED8] bg-white px-4 text-xs font-bold text-[#181C1A] shadow-2xs transition hover:bg-stone-50 hover:border-stone-300 active:scale-[0.98]"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Continue with Google</span>
      </button>

      {/* 4. Switch to Sign Up */}
      {onSwitchToSignUp && (
        <p className="text-center text-xs text-[#5A615D] pt-1">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="font-bold text-[#1c3a13] hover:underline"
          >
            Create Account
          </button>
        </p>
      )}

      {/* Trust Badges Footer */}
      <div className="grid grid-cols-2 gap-2 border-t border-[#E2DED8] pt-3">
        <div className="flex items-center gap-2 rounded-xl border border-[#E2DED8] bg-white p-2">
          <ShieldCheck className="h-4 w-4 text-[#4b6723] shrink-0" />
          <span className="text-[11px] font-semibold text-[#062402]">100% Genuine</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#E2DED8] bg-white p-2">
          <Zap className="h-4 w-4 text-[#4b6723] shrink-0" />
          <span className="text-[11px] font-semibold text-[#062402]">Instant VIP Points</span>
        </div>
      </div>
    </div>
  );
}

export default MemberSignInCard;
