'use client';

import { useEffect, useRef, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { GOOGLE_PRODUCT_COLORS, SOCIAL_PLATFORM_COLORS } from '@/lib/design-token-exceptions';

interface SocialLoginModalProps {
  onSuccess: (userId: string, userName: string) => void;
  onClose: () => void;
  purpose: 'send_gift' | 'get_gift' | 'checkout';
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill={GOOGLE_PRODUCT_COLORS.primary} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill={GOOGLE_PRODUCT_COLORS.success} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
      <path fill={GOOGLE_PRODUCT_COLORS.warning} d="M5.84 14.09A6.4 6.4 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l2.85-2.22.81-.62Z" />
      <path fill={GOOGLE_PRODUCT_COLORS.danger} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073Z" />
    </svg>
  );
}

export default function SocialLoginModal({ onSuccess, onClose, purpose }: SocialLoginModalProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState<'google' | 'facebook' | null>(null);
  const [error, setError] = useState('');
  const notifiedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    const userId = (session.user as { id?: string }).id;
    if (!userId || notifiedUserIdRef.current === userId) return;

    notifiedUserIdRef.current = userId;
    onSuccess(userId, session.user.name || session.user.email || 'User');
  }, [onSuccess, session]);

  if (session?.user) return null;

  const handleLogin = async (provider: 'google' | 'facebook') => {
    setLoading(provider);
    setError('');

    try {
      const result = await signIn(provider, {
        redirect: false,
        callbackUrl: window.location.href,
      });

      if (result?.error) {
        setError('লগইন সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।');
        return;
      }

      let attempts = 0;
      const poll = async () => {
        attempts += 1;
        const response = await fetch('/api/auth/session');
        const currentSession = await response.json();

        if (currentSession?.user?.id) {
          setLoading(null);
          onSuccess(
            currentSession.user.id,
            currentSession.user.name || currentSession.user.email || 'User',
          );
        } else if (attempts < 8) {
          window.setTimeout(poll, 1000);
        } else {
          setLoading(null);
          setError('লগইন যাচাই করা যায়নি। আবার চেষ্টা করুন।');
        }
      };

      window.setTimeout(poll, 800);
    } catch {
      setError('নেটওয়ার্কে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      setLoading(null);
    }
  };

  const purposeText =
    purpose === 'send_gift'
      ? 'উপহার পাঠাতে লগইন করুন'
      : purpose === 'get_gift'
        ? 'উপহার চাইতে লগইন করুন'
        : 'অর্ডার করতে লগইন করুন';

  return (
    <section className="space-y-4" lang="bn" aria-labelledby="social-login-heading">
      <div>
        <h3 id="social-login-heading" className="text-base font-black text-minsah-text-primary">
          {purposeText}
        </h3>
        <p className="mt-1 text-sm leading-6 text-minsah-text-muted">
          নিরাপদ লগইন সম্পন্ন হলে আপনার তথ্য এই ডিভাইসে সংরক্ষিত থাকবে।
        </p>
      </div>

      {error ? (
        <Alert tone="danger" announcement="assertive">
          {error}
        </Alert>
      ) : null}

      <div className="space-y-3">
        <Button
          type="button"
          variant="secondary"
          fullWidth
          size="lg"
          onClick={() => handleLogin('google')}
          disabled={loading !== null}
          aria-busy={loading === 'google' || undefined}
        >
          {loading === 'google' ? <Spinner size="sm" decorative /> : <GoogleIcon />}
          Google দিয়ে চালিয়ে যান
        </Button>

        <Button
          type="button"
          fullWidth
          size="lg"
          onClick={() => handleLogin('facebook')}
          disabled={loading !== null}
          aria-busy={loading === 'facebook' || undefined}
          className="text-minsah-text-inverse hover:brightness-95"
          style={{ backgroundColor: SOCIAL_PLATFORM_COLORS.facebook }}
        >
          {loading === 'facebook' ? <Spinner size="sm" decorative /> : <FacebookIcon />}
          Facebook দিয়ে চালিয়ে যান
        </Button>

        <Button type="button" variant="ghost" fullWidth onClick={onClose} disabled={loading !== null}>
          এখন নয়
        </Button>
      </div>

      <p className="text-center text-xs leading-5 text-minsah-text-subtle">
        চালিয়ে গেলে আপনি Minsah Beauty-এর{' '}
        <Link href="/privacy-policy" className="font-bold text-minsah-text-link underline underline-offset-2">
          গোপনীয়তা নীতি
        </Link>{' '}
        মেনে নিচ্ছেন।
      </p>
    </section>
  );
}
