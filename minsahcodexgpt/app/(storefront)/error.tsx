'use client';

import { RouteErrorBoundary } from '@/components/ui/RouteErrorBoundary';
import { UI_COPY } from '@/lib/ui-copy';

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const copy = UI_COPY.routeErrors.storefront;

  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      title={copy.title}
      description={copy.description}
      retryLabel={UI_COPY.common.retry}
      backHref="/"
      backLabel={copy.backLabel}
      lang="en"
    />
  );
}
