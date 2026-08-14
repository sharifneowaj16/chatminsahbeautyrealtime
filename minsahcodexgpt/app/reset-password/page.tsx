import { Suspense } from 'react';
import { ResetPasswordClient } from '@/components/reset-password-client';
import { LoadingState } from '@/components/ui/LoadingState';

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = params.token || '';

  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-minsah-surface-page px-4">
          <LoadingState label="Loading password reset…" />
        </main>
      }
    >
      <ResetPasswordClient token={token} />
    </Suspense>
  );
}
