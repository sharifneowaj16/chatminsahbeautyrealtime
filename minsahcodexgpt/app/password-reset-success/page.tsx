'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';

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
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF7D8] text-[#1c3a13]">
          <CheckCircle2 className="h-6 w-6 text-[#4b6723]" />
        </div>
        <p className="text-xs text-[#5A615D]">
          All previous sessions have been signed out for security. Redirecting to sign in...
        </p>
        <Link
          href="/login"
          className="flex h-11 w-full items-center justify-center rounded-full bg-[#1c3a13] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#152e0f]"
        >
          Back to Sign In
        </Link>
      </div>
    </AuthShell>
  );
}
