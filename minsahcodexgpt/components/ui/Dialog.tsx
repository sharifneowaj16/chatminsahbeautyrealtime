'use client';

import {
  Description as HeadlessDescription,
  Dialog as HeadlessDialog,
  DialogBackdrop as HeadlessDialogBackdrop,
  DialogPanel as HeadlessDialogPanel,
  DialogTitle as HeadlessDialogTitle,
} from '@headlessui/react';
import type { ReactNode } from 'react';
import { joinClassNames } from '@/components/ui/Field';

export type DialogRole = 'dialog' | 'alertdialog';

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  dismissible?: boolean;
  role?: DialogRole;
  ariaLabel?: string;
  className?: string;
  backdropClassName?: string;
  viewportClassName?: string;
  containerClassName?: string;
  panelClassName?: string;
};

const noop = () => undefined;

export function Dialog({
  open,
  onClose,
  children,
  dismissible = true,
  role = 'dialog',
  ariaLabel,
  className,
  backdropClassName,
  viewportClassName,
  containerClassName,
  panelClassName,
}: DialogProps) {
  return (
    <HeadlessDialog
      open={open}
      onClose={dismissible ? onClose : noop}
      role={role}
      aria-label={ariaLabel}
      className={joinClassNames('relative z-[80]', className)}
    >
      <HeadlessDialogBackdrop
        transition
        className={joinClassNames(
          'minsah-overlay fixed inset-0 transition-opacity duration-200 ease-out data-closed:opacity-0 motion-reduce:transition-none',
          backdropClassName,
        )}
      />

      <div
        className={joinClassNames(
          'fixed inset-0 w-screen overflow-y-auto overscroll-contain',
          viewportClassName,
        )}
      >
        <div className={joinClassNames('flex min-h-full', containerClassName)}>
          <HeadlessDialogPanel
            transition
            className={joinClassNames(
              'outline-none transition duration-200 ease-out motion-reduce:transition-none',
              panelClassName,
            )}
          >
            {children}
          </HeadlessDialogPanel>
        </div>
      </div>
    </HeadlessDialog>
  );
}

export const DialogTitle = HeadlessDialogTitle;
export const DialogDescription = HeadlessDescription;
