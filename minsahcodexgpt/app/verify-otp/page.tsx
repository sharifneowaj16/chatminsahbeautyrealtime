import { Suspense } from 'react';
import { VerifyOTPClient } from '@/components/verify-otp-client';

interface VerifyOTPPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function VerifyOTPPage({ searchParams }: VerifyOTPPageProps) {
  const params = await searchParams;
  const email = params.email || '';

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-minsah-accent">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-minsah-primary border-t-transparent"></div>
          <p className="text-minsah-secondary" role="status">Loading…</p>
        </div>
      </div>
    }>
      <VerifyOTPClient email={email} />
    </Suspense>
  );
}
