'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';

import { AuthShell } from '@/components/auth/AuthShell';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      const data = await response.json();

      if (response.ok) {
        router.push(`/verify-otp?email=${encodeURIComponent(email.toLowerCase().trim())}`);
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
      description="Enter your account email and we will send a six-digit verification code."
      backHref="/login"
      backLabel="Back to login"
    >
      {error ? (
        <Alert tone="danger" announcement="assertive" className="mb-5">
          {error}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <Input
          id="email"
          name="email"
          type="email"
          label="Email address"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={loading}
          placeholder="abc@example.com"
          leading={<Mail className="h-5 w-5" />}
          inputClassName="rounded-full"
        />
        <Button type="submit" fullWidth size="lg" disabled={loading} aria-busy={loading || undefined}>
          {loading ? <Spinner size="sm" decorative /> : null}
          {loading ? 'Sending code…' : 'Send verification code'}
        </Button>
      </form>
    </AuthShell>
  );
}
