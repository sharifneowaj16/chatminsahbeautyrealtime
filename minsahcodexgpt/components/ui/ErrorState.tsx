import type { HTMLAttributes, ReactNode } from 'react';

export type ErrorStateProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
  announce?: boolean;
  headingLevel?: 1 | 2 | 3 | 4;
};

function DefaultErrorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
      <path
        d="M12 8v5m0 3.5v.01M10.3 4.7 2.9 17.5A1.7 1.7 0 0 0 4.4 20h15.2a1.7 1.7 0 0 0 1.5-2.5L13.7 4.7a2 2 0 0 0-3.4 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ErrorState({
  title,
  description,
  action,
  icon,
  compact = false,
  announce = true,
  headingLevel = 2,
  className = '',
  role,
  'aria-live': ariaLive,
  'aria-atomic': ariaAtomic,
  ...props
}: ErrorStateProps) {
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4';

  return (
    <section
      className={`${
        compact
          ? 'flex items-start gap-3 rounded-2xl border border-minsah-status-danger-border bg-minsah-status-danger-surface px-4 py-3'
          : 'minsah-panel flex flex-col items-center px-5 py-10 text-center'
      } ${className}`}
      role={role ?? (announce ? 'alert' : undefined)}
      aria-live={ariaLive ?? (announce ? 'assertive' : undefined)}
      aria-atomic={ariaAtomic ?? (announce ? true : undefined)}
      {...props}
    >
      <div
        className={`${
          compact ? 'mt-0.5 h-9 w-9' : 'mb-4 h-14 w-14'
        } flex shrink-0 items-center justify-center rounded-full bg-minsah-status-danger-surface text-minsah-status-danger-text`}
        aria-hidden="true"
      >
        {icon ?? <DefaultErrorIcon />}
      </div>
      <div className={compact ? 'min-w-0 flex-1' : ''}>
        <Heading className={`${compact ? 'text-sm' : 'text-lg'} font-black text-minsah-status-danger-text`}>
          {title}
        </Heading>
        {description ? (
          <div
            className={`${compact ? 'mt-1 text-sm' : 'mx-auto mt-2 max-w-md text-sm leading-6'} text-minsah-text-muted`}
          >
            {description}
          </div>
        ) : null}
        {action ? <div className={compact ? 'mt-3' : 'mt-5'}>{action}</div> : null}
      </div>
    </section>
  );
}
