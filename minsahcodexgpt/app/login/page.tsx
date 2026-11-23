'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { UnifiedAuthPanel } from '@/components/auth/UnifiedAuthPanel';
import { sanitizeRedirectPath } from '@/lib/auth/redirect';
import type { AuthStep } from '@/components/auth/types';

function mapAuthQueryError(code: string | null): string | null {
  if (!code) return null;
  if (code === 'AccountSuspended') return 'This account is suspended. Please contact support.';
  if (code === 'OAuthAccountNotLinked') return 'Please sign in with the method you originally used for this email.';
  if (code === 'AccessDenied') return 'Sign-in was cancelled or denied.';
  if (code === 'CredentialsSignin') return 'Invalid email/phone or password.';
  return 'Unable to complete sign-in. Please try again.';
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [step, setStep] = useState<AuthStep>('phone');

  const rawRedirect = searchParams.get('redirect') || searchParams.get('callbackUrl');
  const redirectTo = sanitizeRedirectPath(rawRedirect, '/account');
  const queryError = mapAuthQueryError(searchParams.get('error'));
  const registeredNotice =
    searchParams.get('registered') === 'true'
      ? 'Account created! Please sign in to continue.'
      : rawRedirect
        ? 'Sign in to continue to your page.'
        : null;

  const isRevoked = Boolean((session as { revoked?: boolean } | null)?.revoked);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id && !isRevoked) {
      router.replace(redirectTo);
    }
  }, [isRevoked, redirectTo, router, session?.user?.id, status]);

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F3EF] px-4">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-[#1c3a13]">
          <Loader2 className="h-5 w-5 animate-spin text-[#4b6723]" />
          <span>Checking your session...</span>
        </div>
      </main>
    );
  }

  const title =
    step === 'signup'
      ? 'Create Minsah Account'
      : step === 'otp'
        ? 'Verify 6-Digit Code'
        : step === 'locked'
          ? 'Verification Paused'
          : 'Welcome back';

  return (
    <AuthShell
      title={title}
      description="Sign in to track orders, redeem Glow Points, and unlock member offers."
      backHref="/"
      backLabel="Back to store"
      footer={
        <span>
          Admin?{' '}
          <Link href="/admin/login" className="font-bold text-[#1c3a13] hover:underline">
            Admin panel login
          </Link>
        </span>
      }
    >
      <UnifiedAuthPanel
        initialStep="phone"
        redirectTo={redirectTo}
        noticeBanner={registeredNotice}
        errorBanner={queryError}
        onStepChange={setStep}
        onAuthenticated={() => {
          router.replace(redirectTo);
          router.refresh();
        }}
      />
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F4F3EF] px-4">
          <Loader2 className="h-6 w-6 animate-spin text-[#1c3a13]" />
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
