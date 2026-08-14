'use client';

import Link from 'next/link';
import { CheckCircle2, Loader2, MailPlus } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SITE_ACCOUNT_LINKS } from '@/lib/site-config';
import { Button } from '@/components/ui/Button';

export default function NewsletterPreferenceCard() {
  const { user, loading, updatePreferences } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const subscribed = Boolean(user?.preferences?.newsletter);

  const enableNewsletter = async () => {
    setSaving(true);
    setMessage(null);
    const updated = await updatePreferences({ newsletter: true });
    setSaving(false);
    setMessage(
      updated
        ? 'Email updates are now enabled.'
        : 'We could not update your preference. Please try again.',
    );
  };

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.08] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-minsah-accent text-minsah-dark">
          <MailPlus size={19} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-white">Email updates</p>
          <p className="mt-1 text-sm leading-6 text-minsah-light/75">
            Receive product news and store updates only when you choose to.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex min-h-11 items-center gap-2 text-sm text-minsah-light/70" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading preferences…
        </div>
      ) : !user ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`${SITE_ACCOUNT_LINKS.signIn}?redirect=${encodeURIComponent(SITE_ACCOUNT_LINKS.communicationPreferences)}`}
            className="minsah-control inline-flex items-center justify-center rounded-xl bg-minsah-accent px-4 py-2 text-sm font-bold text-minsah-dark hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Sign in to manage
          </Link>
          <Link
            href={SITE_ACCOUNT_LINKS.register}
            className="minsah-control inline-flex items-center justify-center rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Create account
          </Link>
        </div>
      ) : subscribed ? (
        <div className="mt-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-minsah-accent" role="status">
            <CheckCircle2 size={17} aria-hidden="true" /> Email updates are enabled
          </p>
          <Link
            href={SITE_ACCOUNT_LINKS.communicationPreferences}
            className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Manage communication preferences
          </Link>
        </div>
      ) : (
        <div className="mt-4">
          <Button
            type="button"
            variant="primary"
            onClick={enableNewsletter}
            disabled={saving}
            aria-busy={saving || undefined}
            className="rounded-xl bg-minsah-accent text-sm text-minsah-dark hover:bg-white focus-visible:ring-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {saving ? 'Saving…' : 'Enable email updates'}
          </Button>
          {message ? (
            <p className="mt-2 text-sm text-minsah-light/80" role="status" aria-live="polite">
              {message}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
