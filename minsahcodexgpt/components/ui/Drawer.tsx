'use client';

import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/Dialog';
import { joinClassNames } from '@/components/ui/Field';

export type DrawerSide = 'left' | 'right' | 'bottom';
export type DrawerSize = 'sm' | 'md' | 'lg' | 'full';
export type DrawerVariant = 'default' | 'admin' | 'seed';

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
  variant?: DrawerVariant;
  dismissible?: boolean;
  showCloseButton?: boolean;
  showHandle?: boolean;
  closeLabel?: string;
  className?: string;
  backdropClassName?: string;
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
  variant,
  dismissible = true,
  showCloseButton = true,
  showHandle = true,
  closeLabel = 'Close drawer',
  className,
  backdropClassName,
  panelClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
}: DrawerProps) {
  const pathname = usePathname();
  const isSeed = variant === 'seed';
  const isAdmin = !isSeed && (variant === 'admin' || (variant !== 'default' && Boolean(pathname?.startsWith('/admin'))));
  const hasHeader = Boolean(title || description || (dismissible && showCloseButton));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={dismissible}
      ariaLabel={ariaLabel}
      className={className}
      backdropClassName={joinClassNames(
        isSeed
          ? 'bg-black/40 backdrop-blur-[3px]'
          : isAdmin
            ? 'bg-black/75 backdrop-blur-[3px]'
            : undefined,
        backdropClassName,
      )}
      viewportClassName="overflow-hidden"
      containerClassName={joinClassNames(
        getContainerClassName(side),
        isSeed && 'h-dvh max-h-dvh p-[2%] items-stretch justify-end',
      )}
      panelClassName={joinClassNames(
        isSeed
          ? 'flex flex-col h-full max-h-full overflow-hidden bg-[#F2F2EC] text-[#181C1A] shadow-[0_20px_48px_rgba(0,0,0,0.16)] duration-[250ms] border border-black/[0.08] sm:max-w-[460px] w-full rounded-[24px]'
          : isAdmin
            ? 'flex flex-col overflow-hidden border-[#232636] bg-[#090a0f] text-[#f7f8f8] shadow-[0_24px_64px_rgba(0,0,0,0.75)] duration-[250ms]'
            : 'flex flex-col overflow-hidden border-minsah-border-subtle bg-minsah-surface-elevated text-minsah-text-primary shadow-[var(--shadow-elevated)] duration-[250ms]',
        side === 'left' && !isSeed && (isAdmin ? 'border-r border-[#232636]' : 'border-r'),
        side === 'right' && !isSeed && (isAdmin ? 'border-l border-[#232636]' : 'border-l'),
        side === 'bottom' && !isSeed && (isAdmin ? 'border-t border-[#232636]' : 'border-t'),
        !isSeed && getPanelClassName(side, size),
        isSeed && (side === 'left' ? 'data-closed:-translate-x-full' : 'data-closed:translate-x-full'),
        panelClassName,
      )}
    >
      {side === 'bottom' && showHandle ? (
        <div className="shrink-0 pt-3" aria-hidden="true">
          <span
            className={joinClassNames(
              'mx-auto block h-1.5 w-12 rounded-full',
              isAdmin ? 'bg-[#232636]' : 'bg-minsah-border-default',
            )}
          />
        </div>
      ) : null}

      {hasHeader ? (
        <header
          className={joinClassNames(
            isSeed
              ? 'flex shrink-0 items-center justify-between bg-[#F2F2EC] px-6 pt-7 pb-3 relative z-10'
              : isAdmin
                ? 'flex shrink-0 items-start gap-4 border-b border-[#232636] px-5 py-4 sm:px-6 bg-[#090a0f]'
                : 'flex shrink-0 items-start gap-4 border-b border-minsah-border-subtle px-5 py-4 sm:px-6',
            headerClassName,
          )}
        >
          <div className={isSeed ? 'flex-1 min-w-0' : 'min-w-0 flex-1'}>
            {title ? (
              <DialogTitle
                className={
                  isSeed
                    ? 'text-[22px] font-semibold text-[#1B361B] tracking-tight font-sans'
                    : isAdmin
                      ? 'text-base font-semibold leading-6 text-[#f7f8f8] tracking-tight'
                      : 'text-lg font-black leading-7 text-minsah-text-primary'
                }
              >
                {title}
              </DialogTitle>
            ) : null}
            {description ? (
              <DialogDescription
                className={joinClassNames(
                  isAdmin
                    ? 'text-xs text-[#8a8f98]'
                    : 'text-sm leading-6 text-minsah-text-muted',
                  Boolean(title) && 'mt-1',
                )}
              >
                {description}
              </DialogDescription>
            ) : null}
          </div>

          {dismissible && showCloseButton ? (
            isSeed ? (
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="w-9 h-9 rounded-full bg-[#E5E5DF] hover:bg-[#DCDCD6] flex items-center justify-center text-[#1B361B] transition-colors focus:outline-none cursor-pointer shrink-0"
              >
                <X className="w-4 h-4 stroke-[1.5]" aria-hidden="true" />
              </button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label={closeLabel}
                className={joinClassNames(
                  '-m-2 shrink-0',
                  isAdmin && 'text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.06] rounded-md transition-colors',
                )}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            )
          ) : null}
        </header>
      ) : null}

      {children ? (
        <div
          className={joinClassNames(
            'flex-1 overflow-y-auto overscroll-contain min-h-0',
            isSeed ? 'bg-[#F2F2EC] p-0' : isAdmin ? 'px-5 py-5 sm:px-6 text-[#f7f8f8]' : 'px-5 py-5 sm:px-6',
            bodyClassName,
          )}
        >
          {children}
        </div>
      ) : null}

      {footer ? (
        <footer
          className={joinClassNames(
            isSeed
              ? 'shrink-0 bg-[#F2F2EC] border-t border-black/[0.08] relative z-10'
              : isAdmin
                ? 'flex shrink-0 flex-col-reverse gap-2.5 border-t border-[#232636] bg-[#12131b]/60 px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6'
                : 'flex shrink-0 flex-col-reverse gap-3 border-t border-minsah-border-subtle bg-minsah-surface-subtle px-5 py-4 sm:flex-row sm:justify-end sm:px-6',
            footerClassName,
          )}
        >
          {footer}
        </footer>
      ) : null}
    </Dialog>
  );
}
