'use client';

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

import { Field, joinClassNames, type FieldMessage } from './Field';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  description?: FieldMessage;
  error?: FieldMessage;
  hideLabel?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    id,
    label,
    description,
    error,
    hideLabel = false,
    containerClassName,
    labelClassName,
    inputClassName,
    className,
    leading,
    trailing,
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
  const controlId = id ?? `minsah-input-${generatedId.replace(/:/g, '')}`;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [ariaDescribedBy, descriptionId, errorId].filter(Boolean).join(' ') || undefined;
  const invalid = ariaInvalid ?? (error ? true : undefined);

  const control = (
    <input
      ref={ref}
      id={controlId}
      required={required}
      disabled={disabled}
      aria-describedby={describedBy}
      aria-invalid={invalid}
      aria-errormessage={ariaErrorMessage ?? errorId}
      className={joinClassNames(
        'minsah-field',
        Boolean(leading || trailing) && 'minsah-field-with-affix',
        Boolean(leading) && 'minsah-field-with-leading',
        Boolean(trailing) && 'minsah-field-with-trailing',
        inputClassName,
        className,
      )}
      {...props}
    />
  );

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
      {leading || trailing ? (
        <div className="minsah-field-affix-container">
          {leading ? (
            <span className="minsah-field-leading" aria-hidden="true">
              {leading}
            </span>
          ) : null}
          {control}
          {trailing ? <span className="minsah-field-trailing">{trailing}</span> : null}
        </div>
      ) : (
        control
      )}
    </Field>
  );
});
