'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/Dialog';
import { joinClassNames } from '@/components/ui/Field';

export type DrawerSide = 'left' | 'right' | 'bottom';
export type DrawerSize = 'sm' | 'md' | 'lg' | 'full';

type DrawerAccessibleName =
  | { title: ReactNode; ariaLabel?: never }
  | { title?: undefined; ariaLabel: string };

export type DrawerProps = DrawerAccessibleName & {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  side?: DrawerSide;
  size?: DrawerSize;
  dismissible?: boolean;
  showCloseButton?: boolean;
  showHandle?: boolean;
  closeLabel?: string;
  className?: string;
  panelClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
};

const sideWidths: Record<DrawerSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
  full: 'max-w-none',
};

function getContainerClassName(side: DrawerSide): string {
  if (side === 'left') return 'items-stretch justify-start';
  if (side === 'right') return 'items-stretch justify-end';
  return 'items-end justify-center';
}

function getPanelClassName(side: DrawerSide, size: DrawerSize): string {
  if (side === 'bottom') {
    return 'max-h-[92dvh] w-full rounded-t-[var(--radius-panel)] data-closed:translate-y-full';
  }

  return joinClassNames(
    'h-full w-full',
    sideWidths[size],
    side === 'left' ? 'data-closed:-translate-x-full' : 'data-closed:translate-x-full',
  );
}

export function Drawer({
  open,
  onClose,
  title,
  ariaLabel,
  description,
  children,
  footer,
  side = 'right',
  size = 'md',
  dismissible = true,
  showCloseButton = true,
  showHandle = true,
  closeLabel = 'Close drawer',
  className,
  panelClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
}: DrawerProps) {
  const hasHeader = Boolean(title || description || (dismissible && showCloseButton));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={dismissible}
      ariaLabel={ariaLabel}
      className={className}
      viewportClassName="overflow-hidden"
      containerClassName={getContainerClassName(side)}
      panelClassName={joinClassNames(
        'flex flex-col overflow-hidden border-minsah-border-subtle bg-minsah-surface-elevated text-minsah-text-primary shadow-[var(--shadow-elevated)] duration-[250ms]',
        side === 'left' && 'border-r',
        side === 'right' && 'border-l',
        side === 'bottom' && 'border-t',
        getPanelClassName(side, size),
        panelClassName,
      )}
    >
      {side === 'bottom' && showHandle ? (
        <div className="shrink-0 pt-3" aria-hidden="true">
          <span className="mx-auto block h-1.5 w-12 rounded-full bg-minsah-border-default" />
        </div>
      ) : null}

      {hasHeader ? (
        <header
          className={joinClassNames(
            'flex shrink-0 items-start gap-4 border-b border-minsah-border-subtle px-5 py-4 sm:px-6',
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
        <div className={joinClassNames('min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6', bodyClassName)}>
          {children}
        </div>
      ) : null}

      {footer ? (
        <footer
          className={joinClassNames(
            'minsah-sticky-action-safe flex shrink-0 flex-col-reverse gap-3 border-t border-minsah-border-subtle bg-minsah-surface-subtle px-5 pt-4 sm:flex-row sm:justify-end sm:px-6',
            footerClassName,
          )}
        >
          {footer}
        </footer>
      ) : null}
    </Dialog>
  );
}
