'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';

type RouteErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
  description: string;
  retryLabel: string;
  backHref: string;
  backLabel: string;
  lang?: string;
  landmark?: 'main' | 'section';
};

export function RouteErrorBoundary({
  error,
  reset,
  title,
  description,
  retryLabel,
  backHref,
  backLabel,
  lang = 'en',
  landmark = 'section',
}: RouteErrorBoundaryProps) {
  useEffect(() => {
    console.error('Route error boundary captured an error', error);
  }, [error]);

  const Container = landmark;

  return (
    <Container
      lang={lang}
      className="flex min-h-[60vh] items-center justify-center bg-minsah-surface-page px-4 py-12"
      aria-labelledby="route-error-title"
    >
      <ErrorState
        title={<span id="route-error-title">{title}</span>}
        description={description}
        headingLevel={1}
        action={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={reset}>{retryLabel}</Button>
            <Link
              href={backHref}
              className="minsah-control inline-flex min-h-11 items-center justify-center rounded-2xl border border-minsah-border-default bg-minsah-surface-panel px-4 py-2.5 text-sm font-semibold text-minsah-text-primary hover:border-minsah-border-strong hover:bg-minsah-surface-subtle"
            >
              {backLabel}
            </Link>
          </div>
        }
        className="w-full max-w-xl"
      />
    </Container>
  );
}
