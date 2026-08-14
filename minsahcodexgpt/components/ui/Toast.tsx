'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from 'lucide-react';
import { useEffect, useState, type HTMLAttributes, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { joinClassNames } from '@/components/ui/Field';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export type ToastAction = {
  label: string;
  onClick: () => void;
  dismissAfterAction?: boolean;
};

export type ToastProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  id: string;
  title?: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  duration?: number | null;
  action?: ToastAction;
  dismissLabel?: string;
  onDismiss: (id: string) => void;
};

const toneClasses: Record<ToastTone, string> = {
  info: 'border-minsah-status-info-border bg-minsah-status-info-surface text-minsah-status-info-text',
  success:
    'border-minsah-status-success-border bg-minsah-status-success-surface text-minsah-status-success-text',
  warning:
    'border-minsah-status-warning-border bg-minsah-status-warning-surface text-minsah-status-warning-text',
  danger:
    'border-minsah-status-danger-border bg-minsah-status-danger-surface text-minsah-status-danger-text',
};

const icons: Record<ToastTone, ReactNode> = {
  info: <Info className="h-5 w-5" aria-hidden="true" />,
  success: <CheckCircle2 className="h-5 w-5" aria-hidden="true" />,
  warning: <AlertTriangle className="h-5 w-5" aria-hidden="true" />,
  danger: <XCircle className="h-5 w-5" aria-hidden="true" />,
};

export function Toast({
  id,
  title,
  description,
  tone = 'info',
  duration = 5000,
  action,
  dismissLabel = 'Dismiss notification',
  onDismiss,
  className,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  role,
  'aria-live': ariaLive,
  'aria-atomic': ariaAtomic,
  ...props
}: ToastProps) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (duration === null || duration <= 0 || paused) return undefined;

    const timer = window.setTimeout(() => onDismiss(id), duration);
    return () => window.clearTimeout(timer);
  }, [duration, id, onDismiss, paused]);

  const handleAction = () => {
    action?.onClick();
    if (action?.dismissAfterAction !== false) onDismiss(id);
  };

  const liveMode = tone === 'danger' ? 'assertive' : 'polite';

  return (
    <div
      className={joinClassNames(
        'minsah-toast pointer-events-auto flex w-full items-start gap-3 rounded-2xl border p-4 shadow-[var(--shadow-elevated)]',
        toneClasses[tone],
        className,
      )}
      role={role ?? (tone === 'danger' ? 'alert' : 'status')}
      aria-live={ariaLive ?? liveMode}
      aria-atomic={ariaAtomic ?? true}
      onMouseEnter={(event) => {
        setPaused(true);
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        setPaused(false);
        onMouseLeave?.(event);
      }}
      onFocus={(event) => {
        setPaused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setPaused(false);
        }
        onBlur?.(event);
      }}
      {...props}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-minsah-surface-panel" aria-hidden="true">
        {icons[tone]}
      </span>

      <div className="min-w-0 flex-1 text-minsah-text-primary">
        {title ? <p className="font-bold leading-6">{title}</p> : null}
        {description ? (
          <div className={joinClassNames('text-sm leading-6 text-minsah-text-muted', Boolean(title) && 'mt-0.5')}>
            {description}
          </div>
        ) : null}
        {action ? (
          <button
            type="button"
            onClick={handleAction}
            className="minsah-control mt-2 inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-bold text-current underline decoration-2 underline-offset-4"
          >
            {action.label}
          </button>
        ) : null}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onDismiss(id)}
        aria-label={dismissLabel}
        className="-m-2 shrink-0 text-current"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </Button>
    </div>
  );
}
