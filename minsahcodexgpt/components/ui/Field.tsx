import type { HTMLAttributes, ReactNode } from 'react';

export type FieldMessage = ReactNode;

export function joinClassNames(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(' ');
}

export type FieldProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  controlId: string;
  label?: ReactNode;
  description?: FieldMessage;
  error?: FieldMessage;
  descriptionId?: string;
  errorId?: string;
  required?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
  labelClassName?: string;
  children: ReactNode;
};

export function Field({
  controlId,
  label,
  description,
  error,
  descriptionId,
  errorId,
  required = false,
  disabled = false,
  hideLabel = false,
  className,
  labelClassName,
  children,
  ...props
}: FieldProps) {
  return (
    <div className={joinClassNames('minsah-field-group', className)} {...props}>
      {label ? (
        <label
          htmlFor={controlId}
          className={joinClassNames(
            'minsah-field-label',
            disabled && 'minsah-field-label-disabled',
            hideLabel && 'sr-only',
            labelClassName,
          )}
        >
          {label}
          {required ? (
            <span className="minsah-field-required" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}

      {children}

      {description ? (
        <p id={descriptionId} className="minsah-field-description">
          {description}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="minsah-field-error" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}
