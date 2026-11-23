'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { UnifiedAuthPanel } from '@/components/auth/UnifiedAuthPanel';
import { sanitizeRedirectPath } from '@/lib/auth/redirect';
import type { AuthStep } from '@/components/auth/types';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [step, setStep] = useState<AuthStep>('signup');

  const rawRedirect = searchParams.get('redirect') || searchParams.get('callbackUrl');
  const redirectTo = sanitizeRedirectPath(rawRedirect, '/account');
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
    step === 'phone'
      ? 'Welcome back'
      : step === 'otp'
        ? 'Verify 6-Digit Code'
        : step === 'locked'
          ? 'Verification Paused'
          : 'Create Minsah Account';

  return (
    <AuthShell
      title={title}
      description="Join Minsah Beauty in seconds to earn Glow Points and track orders."
      backHref="/"
      backLabel="Back to store"
    >
      <UnifiedAuthPanel
        initialStep="signup"
        redirectTo={redirectTo}
        onStepChange={setStep}
        onAuthenticated={() => {
          router.replace(redirectTo);
          router.refresh();
        }}
      />
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F4F3EF] px-4">
          <Loader2 className="h-6 w-6 animate-spin text-[#1c3a13]" />
        </main>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
