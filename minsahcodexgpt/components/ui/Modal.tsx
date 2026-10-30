'use client';

import { usePathname } from 'next/navigation';
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
export type ModalVariant = 'default' | 'admin';

type ModalAccessibleName =
  | { title: ReactNode; ariaLabel?: never }
  | { title?: undefined; ariaLabel: string };

export type ModalProps = ModalAccessibleName & {
  open: boolean;
  onClose: () => void;
  badge?: ReactNode;
  children?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  variant?: ModalVariant;
  role?: DialogRole;
  dismissible?: boolean;
  showCloseButton?: boolean;
  closeLabel?: string;
  className?: string;
  backdropClassName?: string;
  panelClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
};

const adminSizes: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[min(92vw,960px)]',
};

export function Modal({
  open,
  onClose,
  badge,
  title,
  ariaLabel,
  description,
  children,
  footer,
  size = 'md',
  variant,
  role = 'dialog',
  dismissible = true,
  showCloseButton = true,
  closeLabel = 'Close dialog',
  className,
  backdropClassName,
  panelClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
}: ModalProps) {
  const pathname = usePathname();
  const isAdmin =
    variant === 'admin' || (variant !== 'default' && Boolean(pathname?.startsWith('/admin')));
  const hasHeader = Boolean(badge || title || description || (dismissible && showCloseButton));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={dismissible}
      noViewportPadding={!isAdmin}
      role={role}
      ariaLabel={ariaLabel}
      className={className}
      backdropClassName={joinClassNames(
        isAdmin ? 'bg-black/80 backdrop-blur-[4px]' : 'bg-[#062402]/60 backdrop-blur-sm',
        backdropClassName,
      )}
      viewportClassName="overflow-hidden"
      containerClassName={
        isAdmin
          ? 'items-center justify-center min-h-full py-4 sm:py-6 md:py-8'
          : 'items-end sm:items-center justify-center h-dvh max-h-dvh sm:h-auto sm:min-h-full'
      }
      panelClassName={joinClassNames(
        'w-full flex flex-col overflow-hidden no-scrollbar',
        isAdmin
          ? joinClassNames(
              'my-auto max-h-[min(85vh,620px)] rounded-2xl border border-[#232636] bg-[#161722] text-[#f7f8f8] shadow-[0_24px_64px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.08)] data-closed:scale-[0.98] data-closed:opacity-0',
              adminSizes[size],
            )
          : 'minsah-modal sm:max-w-[520px] max-h-[88dvh] sm:max-h-[85dvh] rounded-t-[24px] sm:rounded-[24px] border-t sm:border border-[#E2DED8] bg-[#FAF9F6] text-[#181C1A] shadow-[0_24px_64px_rgba(6,36,2,0.24)] data-closed:translate-y-4 sm:data-closed:translate-y-0 sm:data-closed:scale-[0.98] data-closed:opacity-0',
        panelClassName,
      )}
    >
      {!isAdmin ? (
        <div className="flex justify-center bg-white pt-2.5 pb-0.5 sm:hidden shrink-0" aria-hidden="true">
          <span className="h-1.5 w-11 rounded-full bg-[#D5DDD7]" />
        </div>
      ) : null}

      {hasHeader ? (
        <header
          className={joinClassNames(
            isAdmin
              ? 'flex items-start gap-4 border-b border-[#232636] px-5 py-4 sm:px-6 bg-[#161722] shrink-0'
              : 'flex items-start justify-between gap-3 border-b border-[#E2DED8] bg-white px-5 py-3.5 shrink-0',
            headerClassName,
          )}
        >
          <div className="min-w-0 flex-1">
            {badge && !isAdmin ? (
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-[#B5C4BB]/60 bg-[#EAF7D8] px-2.5 py-0.5 text-xs font-semibold text-[#1c3a13]">
                {badge}
              </div>
            ) : null}
            {title ? (
              <DialogTitle
                className={
                  isAdmin
                    ? 'text-base font-semibold leading-6 text-[#f7f8f8] tracking-tight'
                    : 'minsah-modal-title'
                }
              >
                {title}
              </DialogTitle>
            ) : null}
            {description ? (
              <DialogDescription
                className={joinClassNames(
                  isAdmin ? 'text-xs text-[#8a8f98]' : 'text-xs font-medium text-[#5A615D]',
                  Boolean(title) && 'mt-0.5',
                )}
              >
                {description}
              </DialogDescription>
            ) : null}
          </div>

          {dismissible && showCloseButton ? (
            isAdmin ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label={closeLabel}
                className="-m-2 shrink-0 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.06] rounded-md transition-colors"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E2DED8] bg-[#F4F3EF] text-[#181C1A] transition-colors hover:bg-[#EAF7D8] hover:text-[#062402] active:scale-95"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )
          ) : null}
        </header>
      ) : null}

      {children ? (
        <div
          className={joinClassNames(
            'flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar overscroll-contain',
            isAdmin ? 'px-5 py-5 sm:px-6 text-[#f7f8f8]' : 'minsah-modal-body px-5 py-4 space-y-3.5',
            bodyClassName,
          )}
        >
          {children}
        </div>
      ) : null}

      {footer ? (
        <footer
          className={joinClassNames(
            isAdmin
              ? 'flex flex-col-reverse gap-2.5 border-t border-[#232636] bg-[#12131b]/60 px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6 shrink-0'
              : 'minsah-modal-footer shrink-0 border-t border-[#E2DED8] bg-white px-5 pt-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:pb-3.5',
            footerClassName,
          )}
        >
          {footer}
        </footer>
      ) : null}
    </Dialog>
  );
}
