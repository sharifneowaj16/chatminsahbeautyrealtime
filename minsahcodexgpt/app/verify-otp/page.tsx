import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { VerifyOTPClient } from '@/components/verify-otp-client';

interface VerifyOTPPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function VerifyOTPPage({ searchParams }: VerifyOTPPageProps) {
  const params = await searchParams;
  const email = params.email || '';

  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F4F3EF] px-4">
          <Loader2 className="h-6 w-6 animate-spin text-[#1c3a13]" />
        </main>
      }
    >
      <VerifyOTPClient email={email} />
    </Suspense>
  );
}
