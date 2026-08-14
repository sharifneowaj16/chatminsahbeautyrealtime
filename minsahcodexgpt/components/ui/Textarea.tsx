'use client';

import { forwardRef, useId, type ReactNode, type TextareaHTMLAttributes } from 'react';

import { Field, joinClassNames, type FieldMessage } from './Field';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: ReactNode;
  description?: FieldMessage;
  error?: FieldMessage;
  hideLabel?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  textareaClassName?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    id,
    label,
    description,
    error,
    hideLabel = false,
    containerClassName,
    labelClassName,
    textareaClassName,
    className,
    required = false,
    disabled = false,
    rows = 4,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    'aria-errormessage': ariaErrorMessage,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const controlId = id ?? `minsah-textarea-${generatedId.replace(/:/g, '')}`;
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
      <textarea
        ref={ref}
        id={controlId}
        rows={rows}
        required={required}
        disabled={disabled}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        aria-errormessage={ariaErrorMessage ?? errorId}
        className={joinClassNames(
          'minsah-field minsah-textarea',
          textareaClassName,
          className,
        )}
        {...props}
      />
    </Field>
  );
});
