import type { HTMLAttributes, ReactNode } from 'react';

export type EmptyStateHeadingLevel = 2 | 3 | 4;

export type EmptyStateProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  announce?: boolean;
  headingLevel?: EmptyStateHeadingLevel;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  announce = false,
  headingLevel = 2,
  className = '',
  role,
  'aria-live': ariaLive,
  'aria-atomic': ariaAtomic,
  ...props
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';

  return (
    <section
      className={`${
        compact
          ? 'flex items-start gap-3 rounded-2xl border border-minsah-border-subtle bg-minsah-surface-subtle px-4 py-3'
          : 'minsah-panel flex flex-col items-center px-5 py-10 text-center'
      } ${className}`}
      role={role ?? (announce ? 'status' : undefined)}
      aria-live={ariaLive ?? (announce ? 'polite' : undefined)}
      aria-atomic={ariaAtomic ?? (announce ? true : undefined)}
      {...props}
    >
      {icon ? (
        <div
          className={`${
            compact ? 'h-10 w-10' : 'mb-4 h-14 w-14'
          } flex shrink-0 items-center justify-center rounded-full bg-minsah-surface-accent text-minsah-action-primary`}
          aria-hidden="true"
        >
          {icon}
        </div>
      ) : null}
      <div className={compact ? 'min-w-0 flex-1' : ''}>
        <Heading className={`${compact ? 'text-sm' : 'text-lg'} font-black text-minsah-text-primary`}>
          {title}
        </Heading>
        {description ? (
          <div className={`${compact ? 'mt-1' : 'mt-2 max-w-md'} text-sm leading-6 text-minsah-text-muted`}>
            {description}
          </div>
        ) : null}
        {action ? <div className={compact ? 'mt-3' : 'mt-5'}>{action}</div> : null}
      </div>
    </section>
  );
}
