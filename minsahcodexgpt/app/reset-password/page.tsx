import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ResetPasswordClient } from '@/components/reset-password-client';

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = params.token || '';

  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F4F3EF] px-4">
          <Loader2 className="h-6 w-6 animate-spin text-[#1c3a13]" />
        </main>
      }
    >
      <ResetPasswordClient token={token} />
    </Suspense>
  );
}
