'use client';

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

import { joinClassNames, type FieldMessage } from './Field';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: ReactNode;
  description?: FieldMessage;
  error?: FieldMessage;
  containerClassName?: string;
  inputClassName?: string;
  labelClassName?: string;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    id,
    label,
    description,
    error,
    containerClassName,
    inputClassName,
    labelClassName,
    className,
    required = false,
    disabled = false,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    'aria-errormessage': ariaErrorMessage,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const controlId = id ?? `minsah-checkbox-${generatedId.replace(/:/g, '')}`;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [ariaDescribedBy, descriptionId, errorId].filter(Boolean).join(' ') || undefined;
  const invalid = ariaInvalid ?? (error ? true : undefined);

  return (
    <div className={joinClassNames('minsah-choice-group', containerClassName)}>
      <label
        htmlFor={controlId}
        className={joinClassNames(
          'minsah-choice-label',
          disabled && 'minsah-choice-label-disabled',
          labelClassName,
        )}
      >
        <input
          ref={ref}
          id={controlId}
          type="checkbox"
          required={required}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          aria-errormessage={ariaErrorMessage ?? errorId}
          className={joinClassNames('minsah-choice-input', inputClassName, className)}
          {...props}
        />
        <span>
          <span className="minsah-choice-title">
            {label}
            {required ? (
              <span className="minsah-field-required" aria-hidden="true">
                *
              </span>
            ) : null}
          </span>
          {description ? (
            <span id={descriptionId} className="minsah-choice-description">
              {description}
            </span>
          ) : null}
        </span>
      </label>
      {error ? (
        <p id={errorId} className="minsah-field-error minsah-choice-error" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
});
