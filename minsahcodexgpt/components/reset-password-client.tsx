'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';

interface ResetPasswordClientProps {
  token: string;
}

export function ResetPasswordClient({ token }: ResetPasswordClientProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await response.json();

      if (response.ok) {
        router.push('/password-reset-success');
      } else {
        const details = Array.isArray(data.details) ? ` ${data.details.join(' ')}` : '';
        setError(`${data.error || 'Failed to reset password.'}${details}`);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset password"
      description="Create a new password using your verified reset code."
      backHref="/forgot-password"
      backLabel="Back"
    >
      {error ? (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="newPassword" className="text-xs font-bold text-[#181C1A]">
              New Password
            </label>
            <span className="text-[11px] text-[#5A615D]">Min 8 characters</span>
          </div>
          <div className="relative flex items-center">
            <input
              id="newPassword"
              name="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={loading}
              placeholder="Minimum 8 characters"
              className="h-11 w-full rounded-2xl border border-[#E2DED8] bg-white px-4 pr-11 text-base font-medium text-[#181C1A] transition placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/15 sm:text-sm"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((c) => !c)}
              aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
              className="absolute right-3.5 p-1 text-stone-400 hover:text-stone-700"
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="block text-xs font-bold text-[#181C1A]">
            Confirm Password
          </label>
          <div className="relative flex items-center">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={loading}
              placeholder="Repeat new password"
              className="h-11 w-full rounded-2xl border border-[#E2DED8] bg-white px-4 pr-11 text-base font-medium text-[#181C1A] transition placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/15 sm:text-sm"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((c) => !c)}
              aria-label={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}
              className="absolute right-3.5 p-1 text-stone-400 hover:text-stone-700"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1c3a13] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#152e0f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-[#D4F6A2]" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-[#D4F6A2]" />
              <span>Save New Password</span>
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
