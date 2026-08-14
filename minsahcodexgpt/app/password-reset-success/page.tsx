'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { SuccessState } from '@/components/ui/SuccessState';

export default function PasswordResetSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.push('/login');
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <AuthShell title="Password updated" description="Your password has been changed successfully.">
      <SuccessState
        title="Update complete"
        description="Redirecting you to the login page…"
        action={
          <Link
            href="/login"
            className="minsah-control inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-minsah-action-primary px-5 py-3 font-bold text-minsah-text-inverse hover:bg-minsah-action-primary-hover"
          >
            Back to Login
          </Link>
        }
      />
    </AuthShell>
  );
}
