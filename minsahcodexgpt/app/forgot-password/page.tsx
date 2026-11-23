'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Loader2, Mail } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await response.json();

      if (response.ok) {
        router.push(`/verify-otp?email=${encodeURIComponent(cleanEmail)}`);
      } else {
        setError(data.error || 'Unable to send the verification code.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Forgot password"
      description="Enter your account email and we will send a six-digit reset code."
      backHref="/login"
      backLabel="Back to sign in"
    >
      {error ? (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-xs font-bold text-[#181C1A]">
            Email Address
          </label>
          <div className="relative flex items-center">
            <Mail className="pointer-events-none absolute left-3.5 h-4 w-4 text-stone-400" />
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
              placeholder="you@example.com"
              className="h-11 w-full rounded-2xl border border-[#E2DED8] bg-white pl-10 pr-4 text-base font-medium text-[#181C1A] transition placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/15 sm:text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1c3a13] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#152e0f] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-[#D4F6A2]" />
              <span>Sending Code...</span>
            </>
          ) : (
            <>
              <span>Send Reset Code</span>
              <ArrowRight className="h-4 w-4 text-[#D4F6A2]" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
