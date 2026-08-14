'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogDescription,
  DialogTitle,
  type DialogRole,
} from '@/components/ui/Dialog';
import { joinClassNames } from '@/components/ui/Field';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

type ModalAccessibleName =
  | { title: ReactNode; ariaLabel?: never }
  | { title?: undefined; ariaLabel: string };

export type ModalProps = ModalAccessibleName & {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  role?: DialogRole;
  dismissible?: boolean;
  showCloseButton?: boolean;
  closeLabel?: string;
  className?: string;
  panelClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
};

const sizes: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-3rem)]',
};

export function Modal({
  open,
  onClose,
  title,
  ariaLabel,
  description,
  children,
  footer,
  size = 'md',
  role = 'dialog',
  dismissible = true,
  showCloseButton = true,
  closeLabel = 'Close dialog',
  className,
  panelClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
}: ModalProps) {
  const hasHeader = Boolean(title || description || (dismissible && showCloseButton));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={dismissible}
      role={role}
      ariaLabel={ariaLabel}
      className={className}
      viewportClassName="p-4 sm:p-6"
      containerClassName="items-center justify-center"
      panelClassName={joinClassNames(
        'w-full overflow-hidden rounded-[var(--radius-panel)] border border-minsah-border-subtle bg-minsah-surface-elevated text-minsah-text-primary shadow-[var(--shadow-elevated)] data-closed:scale-[0.98] data-closed:opacity-0',
        sizes[size],
        panelClassName,
      )}
    >
      {hasHeader ? (
        <header
          className={joinClassNames(
            'flex items-start gap-4 border-b border-minsah-border-subtle px-5 py-4 sm:px-6',
            headerClassName,
          )}
        >
          <div className="min-w-0 flex-1">
            {title ? (
              <DialogTitle className="text-lg font-black leading-7 text-minsah-text-primary">
                {title}
              </DialogTitle>
            ) : null}
            {description ? (
              <DialogDescription
                className={joinClassNames(
                  'text-sm leading-6 text-minsah-text-muted',
                  Boolean(title) && 'mt-1',
                )}
              >
                {description}
              </DialogDescription>
            ) : null}
          </div>

          {dismissible && showCloseButton ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label={closeLabel}
              className="-m-2 shrink-0"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          ) : null}
        </header>
      ) : null}

      {children ? (
        <div
          className={joinClassNames(
            'max-h-[min(70dvh,48rem)] overflow-y-auto px-5 py-5 sm:px-6',
            bodyClassName,
          )}
        >
          {children}
        </div>
      ) : null}

      {footer ? (
        <footer
          className={joinClassNames(
            'flex flex-col-reverse gap-3 border-t border-minsah-border-subtle bg-minsah-surface-subtle px-5 py-4 sm:flex-row sm:justify-end sm:px-6',
            footerClassName,
          )}
        >
          {footer}
        </footer>
      ) : null}
    </Dialog>
  );
}
