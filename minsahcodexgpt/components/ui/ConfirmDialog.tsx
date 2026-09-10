'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal, type ModalVariant } from '@/components/ui/Modal';
import { joinClassNames } from '@/components/ui/Field';

export type ConfirmDialogTone = 'primary' | 'danger';

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
  variant?: ModalVariant;
  loading?: boolean;
  disabled?: boolean;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  variant,
  loading = false,
  disabled = false,
}: ConfirmDialogProps) {
  const pathname = usePathname();
  const isAdmin = variant === 'admin' || (variant !== 'default' && Boolean(pathname?.startsWith('/admin')));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      variant={isAdmin ? 'admin' : variant}
      role="alertdialog"
      dismissible={!loading}
      showCloseButton={!loading}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            data-autofocus="true"
            className={joinClassNames(
              isAdmin && 'bg-white/[0.04] border border-[#232636] hover:bg-white/[0.08] text-[#f7f8f8] rounded-md text-xs font-medium px-3.5 py-1.5',
            )}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={joinClassNames(
              isAdmin && (tone === 'danger'
                ? 'bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-medium px-3.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
                : 'bg-[#5e6ad2] hover:bg-[#6d78d5] text-white rounded-md text-xs font-medium px-3.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'),
            )}
          >
            {loading ? `${confirmLabel}…` : confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
