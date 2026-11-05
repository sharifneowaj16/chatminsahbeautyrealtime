'use client';

import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, ShieldCheck, User } from 'lucide-react';

export interface CreateAccountFormData {
  fullName: string;
  phone: string;
  email?: string;
  password?: string;
}

interface CreateAccountCardProps {
  onSwitchToSignIn: () => void;
  onSubmitSuccess?: (data: CreateAccountFormData) => void;
  isLoading?: boolean;
}

export function CreateAccountCard({
  onSwitchToSignIn,
  onSubmitSuccess,
  isLoading = false,
}: CreateAccountCardProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = fullName.trim();
    if (!cleanName) {
      return setErrorMsg('Please enter your full name.');
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return setErrorMsg('Please enter a valid 11-digit mobile number.');
    }

    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return setErrorMsg('Please enter a valid email address or leave it blank.');
      }
    }

    if (password && password.length < 6) {
      return setErrorMsg('Password must be at least 6 characters long or leave it blank.');
    }

    onSubmitSuccess?.({
      fullName: cleanName,
      phone: cleanPhone,
      email: email.trim() || undefined,
      password: password || undefined,
    });
  };

  return (
    <div className="space-y-4 font-sans">
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* 1. Full Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#181C1A]">
            Full Name <span className="text-emerald-700">*</span>
          </label>
          <div className="relative flex items-center">
            <div className="pointer-events-none absolute left-3.5 flex items-center text-stone-400">
              <User className="h-4 w-4" />
            </div>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Nusrat Jahan"
              className="h-11 w-full rounded-2xl border border-[#E2DED8] bg-white pl-10 pr-4 text-base sm:text-sm font-medium text-[#181C1A] placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/15 transition"
            />
          </div>
        </div>

        {/* 2. Mobile Number with +880 Prefix */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#181C1A]">
            Mobile Number <span className="text-emerald-700">*</span>
          </label>
          <div className="relative flex items-center">
            <div className="pointer-events-none absolute left-3.5 flex items-center gap-1.5 border-r border-[#E2DED8] pr-2.5">
              <span>🇧🇩</span>
              <span className="text-xs font-bold text-[#062402]">+880</span>
            </div>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="17XXXXXXXX"
              maxLength={11}
              className="h-11 w-full rounded-2xl border border-[#E2DED8] bg-white pl-24 pr-4 text-base sm:text-sm font-semibold text-[#181C1A] placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/15 transition"
            />
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-[#5A615D]">
            <Lock className="h-3 w-3 text-[#4b6723] shrink-0" />
            <span>We will send a 6-digit verification code to this phone</span>
          </p>
        </div>

        {/* 3. Email Address (Optional) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#181C1A]">Email Address</label>
            <span className="text-[11px] font-medium text-stone-500">Optional</span>
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com (for order invoices)"
            className="h-11 w-full rounded-2xl border border-[#E2DED8] bg-white px-4 text-base sm:text-sm font-medium text-[#181C1A] placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/15 transition"
          />
        </div>

        {/* 4. Password (Optional) with Eye Toggle */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#181C1A]">Create Password</label>
            <span className="text-[11px] font-medium text-stone-500">Optional</span>
          </div>
          <div className="relative flex items-center">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set a password for email login"
              className="h-11 w-full rounded-2xl border border-[#E2DED8] bg-white px-4 pr-11 text-base sm:text-sm font-medium text-[#181C1A] placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/15 transition"
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

        {/* Primary Action Button */}
        <button
          type="submit"
          disabled={phone.length < 9 || !fullName.trim() || isLoading}
          className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1c3a13] px-4 font-bold text-white shadow-sm transition hover:bg-[#152e0f] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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

      {/* Switch to Sign In */}
      <p className="text-center text-xs text-[#5A615D] pt-1">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="font-bold text-[#1c3a13] hover:underline"
        >
          Sign In
        </button>
      </p>

      {/* Security Assurance Footer */}
      <div className="flex items-center justify-center gap-2 border-t border-[#E2DED8] pt-3 text-center">
        <ShieldCheck className="h-4 w-4 text-[#4b6723] shrink-0" />
        <span className="text-[11px] font-semibold text-[#5A615D]">
          Your data is 100% encrypted &amp; privacy-protected
        </span>
      </div>
    </div>
  );
}

export default CreateAccountCard;
