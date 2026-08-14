import type { HTMLAttributes } from 'react';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export type SpinnerProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  size?: SpinnerSize;
  label?: string;
  decorative?: boolean;
};

const sizes: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function Spinner({
  size = 'md',
  label,
  decorative = false,
  className = '',
  role,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
  ...props
}: SpinnerProps) {
  const accessibleLabel = ariaLabel ?? label;
  const isDecorative = decorative || !accessibleLabel;

  return (
    <span
      className={`inline-flex shrink-0 text-current ${sizes[size]} ${className}`}
      role={isDecorative ? undefined : (role ?? 'status')}
      aria-label={isDecorative ? undefined : accessibleLabel}
      aria-hidden={isDecorative ? true : ariaHidden}
      {...props}
    >
      <svg
        className="h-full w-full animate-spin motion-reduce:animate-none"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="opacity-90"
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
