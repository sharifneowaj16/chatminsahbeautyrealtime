import type { HTMLAttributes, ReactNode } from 'react';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';
export type AlertAnnouncement = 'off' | 'polite' | 'assertive';

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: AlertTone;
  title?: ReactNode;
  icon?: ReactNode;
  announcement?: AlertAnnouncement;
  children?: ReactNode;
};

const tones: Record<AlertTone, string> = {
  info: 'border-minsah-status-info-border bg-minsah-status-info-surface text-minsah-status-info-text',
  success:
    'border-minsah-status-success-border bg-minsah-status-success-surface text-minsah-status-success-text',
  warning:
    'border-minsah-status-warning-border bg-minsah-status-warning-surface text-minsah-status-warning-text',
  danger:
    'border-minsah-status-danger-border bg-minsah-status-danger-surface text-minsah-status-danger-text',
};

export function Alert({
  tone = 'info',
  title,
  icon,
  announcement = 'off',
  className = '',
  children,
  role,
  'aria-live': ariaLive,
  'aria-atomic': ariaAtomic,
  ...props
}: AlertProps) {
  const shouldAnnounce = announcement !== 'off';

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${tones[tone]} ${className}`}
      role={role ?? (shouldAnnounce ? (announcement === 'assertive' ? 'alert' : 'status') : undefined)}
      aria-live={ariaLive ?? (shouldAnnounce ? announcement : undefined)}
      aria-atomic={ariaAtomic ?? (shouldAnnounce ? true : undefined)}
      {...props}
    >
      <div className={icon ? 'flex items-start gap-3' : ''}>
        {icon ? (
          <span className="mt-0.5 shrink-0" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          {title ? <p className="font-bold">{title}</p> : null}
          {children ? <div className={title ? 'mt-1' : ''}>{children}</div> : null}
        </div>
      </div>
    </div>
  );
}
