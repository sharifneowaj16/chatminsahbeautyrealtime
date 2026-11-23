'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { sanitizeRedirectPath } from '@/lib/auth/redirect';

interface SocialAuthButtonsProps {
  redirectTo?: string;
  disabled?: boolean;
  onError?: (message: string) => void;
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
  );
}

function FacebookIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073Z" />
    </svg>
  );
}

export function SocialAuthButtons({
  redirectTo,
  disabled = false,
  onError,
}: SocialAuthButtonsProps) {
  const [busyProvider, setBusyProvider] = useState<'google' | 'facebook' | null>(null);

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    if (disabled || busyProvider) return;
    setBusyProvider(provider);
    try {
      const fallback =
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}`
          : '/account';
      const callbackUrl = sanitizeRedirectPath(redirectTo || fallback, '/account');
      await signIn(provider, { callbackUrl });
    } catch {
      setBusyProvider(null);
      onError?.(
        provider === 'google'
          ? 'Could not start Google sign-in. Please try again.'
          : 'Could not start Facebook sign-in. Please try again.'
      );
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <button
        type="button"
        disabled={disabled || busyProvider !== null}
        onClick={() => void handleOAuth('google')}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#E2DED8] bg-white px-3.5 text-xs font-bold text-[#181C1A] shadow-2xs transition hover:border-[#1c3a13]/40 hover:bg-[#FAF9F6] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busyProvider === 'google' ? (
          <Loader2 className="h-4 w-4 animate-spin text-[#1c3a13]" />
        ) : (
          <GoogleIcon />
        )}
        <span>Google</span>
      </button>

      <button
        type="button"
        disabled={disabled || busyProvider !== null}
        onClick={() => void handleOAuth('facebook')}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1877F2] px-3.5 text-xs font-bold text-white shadow-2xs transition hover:brightness-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busyProvider === 'facebook' ? (
          <Loader2 className="h-4 w-4 animate-spin text-white" />
        ) : (
          <FacebookIcon />
        )}
        <span>Facebook</span>
      </button>
    </div>
  );
}

export default SocialAuthButtons;
