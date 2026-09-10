'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { usePathname } from 'next/navigation';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'unstyled';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

type ButtonBaseProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

type TextButtonProps = ButtonBaseProps & {
  size?: Exclude<ButtonSize, 'icon'>;
};

type IconButtonProps = ButtonBaseProps & {
  size: 'icon';
  'aria-label'?: string;
};

export type ButtonProps = TextButtonProps | IconButtonProps;

const variants: Record<Exclude<ButtonVariant, 'unstyled'>, string> = {
  primary:
    'bg-minsah-action-primary text-minsah-text-inverse hover:bg-minsah-action-primary-hover disabled:bg-minsah-action-disabled disabled:text-minsah-text-disabled',
  secondary:
    'border border-minsah-border-default bg-minsah-surface-panel text-minsah-text-primary hover:border-minsah-border-strong hover:bg-minsah-surface-subtle disabled:border-minsah-border-subtle disabled:bg-minsah-surface-disabled disabled:text-minsah-text-disabled',
  ghost:
    'bg-transparent text-minsah-text-muted hover:bg-minsah-surface-subtle hover:text-minsah-text-primary disabled:text-minsah-text-disabled',
  danger:
    'bg-minsah-status-danger-text text-minsah-text-inverse hover:brightness-95 disabled:bg-minsah-action-disabled disabled:text-minsah-text-disabled',
};

const adminVariants: Record<Exclude<ButtonVariant, 'unstyled'>, string> = {
  primary:
    'bg-[#5e6ad2] text-white hover:bg-[#6d78d5] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] disabled:bg-white/[0.04] disabled:text-[#62666d] border border-transparent',
  secondary:
    'border border-[#232636] bg-[#161824] text-[#f7f8f8] hover:bg-white/[0.06] hover:border-white/20 disabled:border-[#232636] disabled:text-[#62666d]',
  ghost:
    'bg-transparent text-[#8a8f98] hover:bg-white/[0.06] hover:text-[#f7f8f8] disabled:text-[#62666d]',
  danger:
    'bg-rose-600 text-white hover:bg-rose-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] disabled:bg-white/[0.04] disabled:text-[#62666d] border border-transparent',
};

const sizes: Record<ButtonSize, string> = {
  xs: 'min-h-7 rounded-md px-2 py-1 text-[11px] font-medium tracking-tight',
  sm: 'min-h-8 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide',
  md: 'min-h-11 rounded-full px-5 py-2.5 text-sm font-semibold tracking-wide',
  lg: 'min-h-12 rounded-full px-6 py-3 text-sm font-semibold tracking-wide',
  icon: 'h-8 min-h-8 w-8 min-w-8 rounded-lg p-0',
};

const adminSizes: Record<ButtonSize, string> = {
  xs: 'h-6 min-h-6 rounded-md px-2 py-0.5 text-[11px] font-medium tracking-tight',
  sm: 'h-7 min-h-7 rounded-md px-2.5 py-1 text-xs font-medium tracking-tight',
  md: 'h-8 min-h-8 rounded-md px-3 py-1.5 text-xs font-medium tracking-tight',
  lg: 'h-9 min-h-9 rounded-md px-4 py-2 text-sm font-medium tracking-tight',
  icon: 'h-7 min-h-7 w-7 min-w-7 rounded-md p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className = '', variant, size, fullWidth = false, type = 'button', ...props },
  ref,
) {
  const pathname = usePathname();
  const isAdmin = Boolean(pathname?.startsWith('/admin'));

  const activeVariants = isAdmin ? adminVariants : variants;
  const activeSizes = isAdmin ? adminSizes : sizes;

  const resolvedVariant = variant ?? (isAdmin && /\bbg-/.test(className) ? 'unstyled' : 'primary');
  const variantClass = resolvedVariant === 'unstyled' ? '' : activeVariants[resolvedVariant];

  const resolvedSize = size ?? (isAdmin && /\b(h-|p[xy]?-)/.test(className) ? undefined : 'md');
  const sizeClass = resolvedSize ? activeSizes[resolvedSize] : '';

  return (
    <button
      ref={ref}
      type={type}
      data-icon-only={resolvedSize === 'icon' ? 'true' : undefined}
      className={`minsah-control inline-flex items-center justify-center gap-2 font-medium ${variantClass} ${sizeClass} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    />
  );
});
