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

import { AuthShell } from '@/components/auth/AuthShell';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
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

      if (response.ok) router.push(`/reset-password?token=${data.token}`);
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
          <strong className="text-minsah-text-primary">{email || 'your email'}</strong>.
        </>
      }
      backHref="/forgot-password"
      backLabel="Back"
    >
      {error ? (
        <Alert tone="danger" announcement="assertive" className="mb-5">
          {error}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <Field
          controlId="otp-0"
          label="Verification code"
          description="Paste the full code or type one digit in each box."
          error={error || undefined}
        >
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
                className="minsah-field h-14 min-w-0 rounded-xl px-0 text-center text-xl font-black"
              />
            ))}
          </div>
        </Field>

        <Button type="submit" fullWidth size="lg" disabled={loading || otpCode.length !== 6} aria-busy={loading || undefined}>
          {loading ? <Spinner size="sm" decorative /> : null}
          {loading ? 'Verifying…' : 'Verify code'}
        </Button>

        <div className="text-center text-sm text-minsah-text-muted">
          Did not receive the email?{' '}
          <Button type="button" variant="ghost" size="sm" onClick={handleResendOTP} disabled={resending || loading}>
            {resending ? <Spinner size="sm" decorative /> : null}
            {resending ? 'Resending…' : 'Resend code'}
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
