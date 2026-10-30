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
  noViewportPadding?: boolean;
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
  noViewportPadding = false,
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
      className={joinClassNames('relative z-[180]', className)}
    >
      <HeadlessDialogBackdrop
        transition
        className={joinClassNames(
          'minsah-overlay fixed inset-0 bg-[#062402]/60 backdrop-blur-sm transition-opacity duration-200 ease-out data-closed:opacity-0 motion-reduce:transition-none',
          backdropClassName,
        )}
      />

      <div
        className={joinClassNames(
          'fixed inset-0 z-10 w-full max-w-full overflow-y-auto overflow-x-hidden no-scrollbar overscroll-contain',
          noViewportPadding ? 'p-0 sm:p-6' : 'p-4 sm:p-6 md:p-8',
          viewportClassName,
        )}
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'manipulation' }}
      >
        <div
          className={joinClassNames(
            'flex min-h-full text-center',
            noViewportPadding ? 'items-end justify-center sm:items-center' : 'items-center justify-center p-0 sm:p-0',
            containerClassName,
          )}
        >
          <HeadlessDialogPanel
            transition
            className={joinClassNames(
              'outline-none transition duration-200 ease-out motion-reduce:transition-none overflow-x-hidden no-scrollbar text-left pointer-events-auto',
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
