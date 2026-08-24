import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

type ButtonBaseProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

type TextButtonProps = ButtonBaseProps & {
  size?: Exclude<ButtonSize, 'icon'>;
};

type IconButtonProps = ButtonBaseProps & {
  size: 'icon';
  'aria-label': string;
};

export type ButtonProps = TextButtonProps | IconButtonProps;

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-minsah-action-primary text-minsah-text-inverse hover:bg-minsah-action-primary-hover disabled:bg-minsah-action-disabled disabled:text-minsah-text-disabled',
  secondary:
    'border border-minsah-border-default bg-minsah-surface-panel text-minsah-text-primary hover:border-minsah-border-strong hover:bg-minsah-surface-subtle disabled:border-minsah-border-subtle disabled:bg-minsah-surface-disabled disabled:text-minsah-text-disabled',
  ghost:
    'bg-transparent text-minsah-text-muted hover:bg-minsah-surface-subtle hover:text-minsah-text-primary disabled:text-minsah-text-disabled',
  danger:
    'bg-minsah-status-danger-text text-minsah-text-inverse hover:brightness-95 disabled:bg-minsah-action-disabled disabled:text-minsah-text-disabled',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-10 rounded-full px-3.5 py-2 text-xs font-semibold tracking-wide',
  md: 'min-h-11 rounded-full px-5 py-2.5 text-sm font-semibold tracking-wide',
  lg: 'min-h-12 rounded-full px-6 py-3 text-sm font-semibold tracking-wide',
  icon: 'h-11 min-h-11 w-11 min-w-11 rounded-full p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className = '', variant = 'primary', size = 'md', fullWidth = false, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-icon-only={size === 'icon' ? 'true' : undefined}
      className={`minsah-control inline-flex items-center justify-center gap-2 font-semibold ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    />
  );
});
