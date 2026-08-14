'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';

import { AuthShell } from '@/components/auth/AuthShell';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { Spinner } from '@/components/ui/Spinner';
import { GOOGLE_PRODUCT_COLORS, SOCIAL_PLATFORM_COLORS } from '@/lib/design-token-exceptions';
import { trackCompleteRegistrationEvent } from '@/lib/tracking/events';

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill={GOOGLE_PRODUCT_COLORS.primary} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill={GOOGLE_PRODUCT_COLORS.success} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
      <path fill={GOOGLE_PRODUCT_COLORS.warning} d="M5.84 14.09A6.4 6.4 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l2.85-2.22.81-.62Z" />
      <path fill={GOOGLE_PRODUCT_COLORS.danger} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073Z" />
    </svg>
  );
}

function PasswordToggle({ shown, onToggle, label }: { shown: boolean; onToggle: () => void; label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-label={`${shown ? 'Hide' : 'Show'} ${label}`}
      aria-pressed={shown}
     
    >
      {shown ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </Button>
  );
}

function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const redirectTo = searchParams.get('redirect') || '/account';

  useEffect(() => {
    if (status === 'authenticated' && session?.user) router.replace('/account');
  }, [router, session, status]);

  const validatePassword = (value: string): string | null => {
    if (value.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(value)) return 'Password must include an uppercase letter.';
    if (!/[0-9]/.test(value)) return 'Password must include a number.';
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: email.toLowerCase().trim(), password }),
      });
      const data = await response.json();

      if (!response.ok) {
        const message = Array.isArray(data.details)
          ? data.details[0] || data.error
          : data.error;
        setError(message || 'Registration failed. Please try again.');
        return;
      }

      trackCompleteRegistrationEvent({ method: 'email', status: 'success' });
      const loginResult = await signIn('credentials', {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });

      if (loginResult?.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push(redirectTo);
          router.refresh();
        }, 800);
      } else {
        router.push('/login?registered=true');
      }
    } catch {
      setError('Network error. Check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: 'google' | 'facebook') => {
    setError('');
    try {
      await signIn(provider, { callbackUrl: redirectTo });
    } catch {
      setError(`Unable to continue with ${provider === 'google' ? 'Google' : 'Facebook'}.`);
    }
  };

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-minsah-surface-accent px-4">
        <LoadingState label="Checking your session…" compact />
      </main>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      description="Start your Minsah Beauty journey."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-minsah-text-link hover:underline">
            Login
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        {success ? (
          <Alert tone="success" announcement="polite">
            Account created. Redirecting…
          </Alert>
        ) : null}
        {error ? (
          <Alert tone="danger" announcement="assertive">
            {error}
          </Alert>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate>
        <Input
          id="name"
          name="name"
          label="Your name"
          required
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={loading || success}
          placeholder="Your full name"
          leading={<UserRound className="h-5 w-5" />}
          inputClassName="rounded-full"
        />
        <Input
          id="email"
          name="email"
          type="email"
          label="Email address"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={loading || success}
          placeholder="abc@example.com"
          leading={<Mail className="h-5 w-5" />}
          inputClassName="rounded-full"
        />
        <Input
          id="password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          label="Password"
          description="Use at least 8 characters, one uppercase letter and one number."
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={loading || success}
          placeholder="Create a password"
          leading={<LockKeyhole className="h-5 w-5" />}
          trailing={
            <PasswordToggle
              shown={showPassword}
              onToggle={() => setShowPassword((current) => !current)}
              label="password"
            />
          }
          inputClassName="rounded-full"
        />
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type={showConfirm ? 'text' : 'password'}
          label="Confirm password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={loading || success}
          placeholder="Repeat your password"
          leading={<LockKeyhole className="h-5 w-5" />}
          trailing={
            <PasswordToggle
              shown={showConfirm}
              onToggle={() => setShowConfirm((current) => !current)}
              label="confirmed password"
            />
          }
          inputClassName="rounded-full"
        />

        <Button type="submit" fullWidth size="lg" disabled={loading || success} aria-busy={loading || undefined}>
          {loading ? <Spinner size="sm" decorative /> : null}
          {success ? 'Redirecting…' : loading ? 'Creating account…' : 'Create account'}
        </Button>

        <div className="relative py-1" aria-hidden="true">
          <div className="border-t border-minsah-border-default" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-minsah-surface-panel px-3 text-xs font-semibold uppercase tracking-wide text-minsah-text-subtle">
            or
          </span>
        </div>

        <Button type="button" variant="secondary" fullWidth size="lg" onClick={() => handleSocialSignIn('google')} disabled={loading || success}>
          <GoogleIcon />
          Continue with Google
        </Button>
        <Button
          type="button"
          fullWidth
          size="lg"
          onClick={() => handleSocialSignIn('facebook')}
          disabled={loading || success}
          className="text-minsah-text-inverse hover:brightness-95"
          style={{ backgroundColor: SOCIAL_PLATFORM_COLORS.facebook }}
        >
          <FacebookIcon />
          Continue with Facebook
        </Button>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-minsah-surface-accent px-4">
          <LoadingState label="Loading registration…" compact />
        </main>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
