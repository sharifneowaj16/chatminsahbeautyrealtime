'use client';

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { useToast } from '@/components/ui/ToastProvider';

interface VerifyOTPClientProps {
  email: string;
}

const EMPTY_OTP = ['', '', '', '', '', ''];

export function VerifyOTPClient({ email }: VerifyOTPClientProps) {
  const [otp, setOtp] = useState(EMPTY_OTP);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const { pushToast } = useToast();

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    setOtp((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });

    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const next = [...EMPTY_OTP];
    pastedData.split('').forEach((character, index) => {
      next[index] = character;
    });
    setOtp(next);
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      setError('Please enter all six digits.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode }),
      });
      const data = await response.json();

      if (response.ok) router.push(`/reset-password?token=${encodeURIComponent(data.token)}`);
      else setError(data.error || 'The verification code is invalid.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    setError('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setOtp(EMPTY_OTP);
        inputRefs.current[0]?.focus();
        pushToast({
          tone: 'success',
          title: 'Verification code sent',
          description: `A new code was sent to ${email}.`,
        });
      } else {
        setError('Unable to resend the verification code.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const otpCode = otp.join('');

  return (
    <AuthShell
      title="Verify your email"
      description={
        <>
          Enter the six-digit code sent to{' '}
          <strong className="text-[#062402]">{email || 'your email'}</strong>.
        </>
      }
      backHref="/forgot-password"
      backLabel="Back"
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

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="grid grid-cols-6 gap-2" role="group" aria-label="Six-digit verification code">
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              value={digit}
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={index === 0 ? handlePaste : undefined}
              disabled={loading}
              aria-label={`Digit ${index + 1}`}
              className="h-12 w-full rounded-xl border border-[#E2DED8] bg-white text-center text-lg font-bold text-[#062402] transition focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/20"
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || otpCode.length !== 6}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1c3a13] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#152e0f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-[#D4F6A2]" />
              <span>Verifying...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-[#D4F6A2]" />
              <span>Verify Code</span>
            </>
          )}
        </button>

        <div className="text-center text-xs text-[#5A615D]">
          Did not receive the email?{' '}
          <button
            type="button"
            onClick={() => void handleResendOTP()}
            disabled={resending || loading}
            className="inline-flex items-center gap-1 font-bold text-[#4b6723] hover:underline disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
            <span>{resending ? 'Resending...' : 'Resend code'}</span>
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
