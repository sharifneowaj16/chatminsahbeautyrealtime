'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';

import { AuthShell } from '@/components/auth/AuthShell';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';

interface ResetPasswordClientProps {
  token: string;
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
        <Alert tone="danger" announcement="assertive" className="mb-5">
          {error}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Input
          id="newPassword"
          name="newPassword"
          type={showNewPassword ? 'text' : 'password'}
          label="New password"
          description="Use at least 8 characters."
          required
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          disabled={loading}
          placeholder="Minimum 8 characters"
          leading={<LockKeyhole className="h-5 w-5" />}
          trailing={
            <PasswordToggle
              shown={showNewPassword}
              onToggle={() => setShowNewPassword((current) => !current)}
              label="new password"
            />
          }
          inputClassName="rounded-full"
        />

        <Input
          id="confirmPassword"
          name="confirmPassword"
          type={showConfirmPassword ? 'text' : 'password'}
          label="Confirm password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={loading}
          placeholder="Repeat new password"
          leading={<LockKeyhole className="h-5 w-5" />}
          trailing={
            <PasswordToggle
              shown={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((current) => !current)}
              label="confirmed password"
            />
          }
          inputClassName="rounded-full"
        />

        <Button type="submit" fullWidth size="lg" disabled={loading} aria-busy={loading || undefined}>
          {loading ? <Spinner size="sm" decorative /> : null}
          {loading ? 'Saving…' : 'Save new password'}
        </Button>
      </form>
    </AuthShell>
  );
}
