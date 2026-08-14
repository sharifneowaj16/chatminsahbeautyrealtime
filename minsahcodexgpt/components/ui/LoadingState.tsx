import type { HTMLAttributes, ReactNode } from 'react';

import { Spinner, type SpinnerSize } from './Spinner';

export type LoadingStateProps = HTMLAttributes<HTMLDivElement> & {
  label?: ReactNode;
  description?: ReactNode;
  compact?: boolean;
  spinnerSize?: SpinnerSize;
};

export function LoadingState({
  label = 'Loading…',
  description,
  compact = false,
  spinnerSize,
  className = '',
  role = 'status',
  'aria-live': ariaLive = 'polite',
  'aria-atomic': ariaAtomic = true,
  ...props
}: LoadingStateProps) {
  const resolvedSpinnerSize = spinnerSize ?? (compact ? 'sm' : 'lg');

  return (
    <div
      className={`flex items-center justify-center text-minsah-text-muted ${
        compact ? 'gap-2 py-2 text-sm' : 'minsah-panel min-h-40 flex-col gap-3 px-5 py-10 text-center'
      } ${className}`}
      role={role}
      aria-live={ariaLive}
      aria-atomic={ariaAtomic}
      aria-busy="true"
      {...props}
    >
      <Spinner size={resolvedSpinnerSize} decorative />
      <div>
        <p className={compact ? 'font-semibold' : 'font-bold text-minsah-text-primary'}>{label}</p>
        {description ? (
          <p className={compact ? 'sr-only' : 'mt-1 max-w-md text-sm leading-6'}>{description}</p>
        ) : null}
      </div>
    </div>
  );
}
