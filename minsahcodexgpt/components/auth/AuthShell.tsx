import Link from 'next/link';
import type { ReactNode } from 'react';

export type AuthShellProps = {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  footer?: ReactNode;
};

export function AuthBrand() {
  return (
    <Link
      href="/"
      className="minsah-touch-target inline-flex flex-col items-center rounded-2xl text-minsah-text-primary"
      aria-label="Minsah Beauty home"
    >
      <svg className="h-12 w-12 text-minsah-action-primary" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M24 4 8 14v20l16 10 16-10V14L24 4Z" fill="currentColor" />
        <path d="m24 9-11 7v15l11 7 11-7V16L24 9Z" className="text-minsah-action-secondary" fill="currentColor" />
      </svg>
      <span className="mt-2 text-2xl font-black">Minsah Beauty</span>
      <span className="text-sm text-minsah-text-muted">Toxin Free &amp; Natural</span>
    </Link>
  );
}

export function AuthShell({
  title,
  description,
  children,
  backHref,
  backLabel = 'Back',
  footer,
}: AuthShellProps) {
  return (
    <div role="main" className="flex min-h-screen items-center justify-center bg-minsah-surface-accent px-4 py-12" lang="en">
      <div className="w-full max-w-md">
        {backHref ? (
          <div className="mb-5">
            <Link
              href={backHref}
              className="minsah-touch-target inline-flex items-center rounded-xl text-sm font-semibold text-minsah-text-link hover:underline"
            >
              <span aria-hidden="true">←</span>
              <span className="ml-2">{backLabel}</span>
            </Link>
          </div>
        ) : null}

        <div className="mb-8 text-center">
          <AuthBrand />
        </div>

        <section className="minsah-panel px-5 py-7 sm:px-7">
          <header className="mb-7 text-center">
            <h1 className="text-3xl font-black text-minsah-text-primary">{title}</h1>
            {description ? (
              <div className="mt-2 text-sm leading-6 text-minsah-text-muted">{description}</div>
            ) : null}
          </header>

          {children}
        </section>

        {footer ? <div className="mt-7 text-center text-sm text-minsah-text-muted">{footer}</div> : null}
      </div>
    </div>
  );
}
