'use client';

import { RouteErrorBoundary } from '@/components/ui/RouteErrorBoundary';
import { UI_COPY } from '@/lib/ui-copy';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const copy = UI_COPY.routeErrors.admin;

  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      title={copy.title}
      description={copy.description}
      retryLabel={UI_COPY.common.retry}
      backHref="/admin"
      backLabel={copy.backLabel}
      lang="en"
    />
  );
}
