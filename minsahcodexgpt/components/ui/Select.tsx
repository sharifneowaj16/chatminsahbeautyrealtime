'use client';

import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react';

import { Field, joinClassNames, type FieldMessage } from './Field';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: ReactNode;
  description?: FieldMessage;
  error?: FieldMessage;
  hideLabel?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  selectClassName?: string;
  placeholder?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    id,
    label,
    description,
    error,
    hideLabel = false,
    containerClassName,
    labelClassName,
    selectClassName,
    className,
    placeholder,
    required = false,
    disabled = false,
    children,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    'aria-errormessage': ariaErrorMessage,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const controlId = id ?? `minsah-select-${generatedId.replace(/:/g, '')}`;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [ariaDescribedBy, descriptionId, errorId].filter(Boolean).join(' ') || undefined;
  const invalid = ariaInvalid ?? (error ? true : undefined);

  return (
    <Field
      controlId={controlId}
      label={label}
      description={description}
      error={error}
      descriptionId={descriptionId}
      errorId={errorId}
      required={required}
      disabled={disabled}
      hideLabel={hideLabel}
      className={containerClassName}
      labelClassName={labelClassName}
    >
      <select
        ref={ref}
        id={controlId}
        required={required}
        disabled={disabled}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        aria-errormessage={ariaErrorMessage ?? errorId}
        className={joinClassNames('minsah-field minsah-select', selectClassName, className)}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled={required}>
            {placeholder}
          </option>
        ) : null}
        {children}
      </select>
    </Field>
  );
});
