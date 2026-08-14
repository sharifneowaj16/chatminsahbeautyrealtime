import type { HTMLAttributes, ReactNode } from 'react';

export type SuccessStateProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
  announce?: boolean;
  headingLevel?: 1 | 2 | 3 | 4;
};

function DefaultSuccessIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
      <path
        d="m7.5 12.5 3 3 6-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function SuccessState({
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
}: SuccessStateProps) {
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4';

  return (
    <section
      className={`${
        compact
          ? 'flex items-start gap-3 rounded-2xl border border-minsah-status-success-border bg-minsah-status-success-surface px-4 py-3'
          : 'minsah-panel flex flex-col items-center px-5 py-10 text-center'
      } ${className}`}
      role={role ?? (announce ? 'status' : undefined)}
      aria-live={ariaLive ?? (announce ? 'polite' : undefined)}
      aria-atomic={ariaAtomic ?? (announce ? true : undefined)}
      {...props}
    >
      <div
        className={`${
          compact ? 'mt-0.5 h-9 w-9' : 'mb-4 h-14 w-14'
        } flex shrink-0 items-center justify-center rounded-full bg-minsah-status-success-surface text-minsah-status-success-text`}
        aria-hidden="true"
      >
        {icon ?? <DefaultSuccessIcon />}
      </div>
      <div className={compact ? 'min-w-0 flex-1' : ''}>
        <Heading className={`${compact ? 'text-sm' : 'text-lg'} font-black text-minsah-status-success-text`}>
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
