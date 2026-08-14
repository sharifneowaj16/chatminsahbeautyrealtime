'use client';

import { RouteErrorBoundary } from '@/components/ui/RouteErrorBoundary';
import { UI_COPY } from '@/lib/ui-copy';

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const copy = UI_COPY.routeErrors.checkout;

  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      title={copy.title}
      description={copy.description}
      retryLabel={UI_COPY.commonBn.retry}
      backHref="/cart"
      backLabel={copy.backLabel}
      lang="bn-BD"
      landmark="main"
    />
  );
}
