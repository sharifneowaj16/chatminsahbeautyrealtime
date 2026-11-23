'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { UnifiedAuthPanel } from '@/components/auth/UnifiedAuthPanel';

interface SocialLoginModalProps {
  onSuccess: (userId: string, userName: string) => void;
  onClose: () => void;
  purpose: 'send_gift' | 'get_gift' | 'checkout';
}

export default function SocialLoginModal({ onSuccess, onClose, purpose }: SocialLoginModalProps) {
  const { data: session } = useSession();
  const notifiedUserIdRef = useRef<string | null>(null);
  const isRevoked = Boolean((session as { revoked?: boolean } | null)?.revoked);

  useEffect(() => {
    if (!session?.user || isRevoked) return;
    const userId = session.user.id;
    if (!userId || notifiedUserIdRef.current === userId) return;

    notifiedUserIdRef.current = userId;
    onSuccess(userId, session.user.name || session.user.email || 'Member');
  }, [isRevoked, onSuccess, session]);

  if (session?.user?.id && !isRevoked) return null;

  const purposeText =
    purpose === 'send_gift'
      ? 'Sign in to send a gift'
      : purpose === 'get_gift'
        ? 'Sign in to request a gift'
        : 'Sign in to continue';

  return (
    <section className="space-y-4 rounded-2xl bg-[#FAF9F6] p-1 font-sans" lang="en">
      <div className="text-center">
        <h3 className="text-base font-black text-[#062402]">{purposeText}</h3>
        <p className="mt-1 text-xs text-[#5A615D]">
          Sign in in 1 tap with Google, Facebook, or Mobile SMS OTP.
        </p>
      </div>

      <UnifiedAuthPanel
        initialStep="phone"
        onAuthenticated={async () => {
          const res = await fetch('/api/auth/session', { cache: 'no-store' });
          const current = await res.json().catch(() => null);
          if (current?.user?.id && !current?.revoked) {
            notifiedUserIdRef.current = current.user.id;
            onSuccess(current.user.id, current.user.name || current.user.email || 'Member');
          }
        }}
        onClose={onClose}
      />

      <button
        type="button"
        onClick={onClose}
        className="w-full py-2 text-center text-xs font-semibold text-[#5A615D] hover:text-[#062402]"
      >
        Not Now
      </button>
    </section>
  );
}
