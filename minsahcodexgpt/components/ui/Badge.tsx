import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
export type BadgeSize = 'sm' | 'md';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  size?: BadgeSize;
  leadingVisual?: ReactNode;
};

const tones: Record<BadgeTone, string> = {
  neutral:
    'border-minsah-border-default bg-minsah-surface-subtle text-minsah-text-muted',
  info: 'border-minsah-status-info-border bg-minsah-status-info-surface text-minsah-status-info-text',
  success:
    'border-minsah-status-success-border bg-minsah-status-success-surface text-minsah-status-success-text',
  warning:
    'border-minsah-status-warning-border bg-minsah-status-warning-surface text-minsah-status-warning-text',
  danger:
    'border-minsah-status-danger-border bg-minsah-status-danger-surface text-minsah-status-danger-text',
};

const sizes: Record<BadgeSize, string> = {
  sm: 'min-h-6 gap-1 px-2 py-0.5 text-xs',
  md: 'min-h-7 gap-1.5 px-2.5 py-1 text-sm',
};

export function Badge({
  tone = 'neutral',
  size = 'sm',
  leadingVisual,
  className = '',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border font-semibold leading-none ${tones[tone]} ${sizes[size]} ${className}`}
      {...props}
    >
      {leadingVisual ? (
        <span className="shrink-0" aria-hidden="true">
          {leadingVisual}
        </span>
      ) : null}
      <span className="truncate">{children}</span>
    </span>
  );
}
