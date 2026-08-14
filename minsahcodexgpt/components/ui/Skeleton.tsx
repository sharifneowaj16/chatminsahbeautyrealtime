import type { HTMLAttributes } from 'react';

export type SkeletonVariant = 'text' | 'rectangular' | 'circular';

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  variant?: SkeletonVariant;
};

const variants: Record<SkeletonVariant, string> = {
  text: 'h-4 rounded-md',
  rectangular: 'rounded-2xl',
  circular: 'aspect-square rounded-full',
};

export function Skeleton({
  variant = 'rectangular',
  className = '',
  'aria-hidden': ariaHidden = true,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-minsah-surface-disabled motion-reduce:animate-none ${variants[variant]} ${className}`}
      aria-hidden={ariaHidden}
      {...props}
    />
  );
}
