'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  Toast,
  type ToastAction,
  type ToastTone,
} from '@/components/ui/Toast';
import { ConfirmDialog, type ConfirmDialogTone } from '@/components/ui/ConfirmDialog';

export type ToastInput = {
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  duration?: number | null;
  action?: ToastAction;
  dismissLabel?: string;
};

type ToastRecord = Omit<ToastInput, 'id' | 'tone' | 'duration'> & {
  id: string;
  tone: ToastTone;
  duration: number | null;
};

export type ConfirmationInput = {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
};

type PendingConfirmation = ConfirmationInput & {
  resolve: (confirmed: boolean) => void;
};

export type ToastContextValue = {
  pushToast: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  requestConfirmation: (confirmation: ConfirmationInput) => Promise<boolean>;
};

export type ToastProviderProps = {
  children: ReactNode;
  defaultDuration?: number | null;
  maxToasts?: number;
};

const ToastContext = createContext<ToastContextValue | null>(null);
let toastSequence = 0;

function createToastId(): string {
  toastSequence += 1;
  return `minsah-toast-${Date.now()}-${toastSequence}`;
}

export function ToastProvider({
  children,
  defaultDuration = 5000,
  maxToasts = 4,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const pushToast = useCallback(
    (input: ToastInput) => {
      const id = input.id ?? createToastId();
      const record: ToastRecord = {
        ...input,
        id,
        tone: input.tone ?? 'info',
        duration: input.duration === undefined ? defaultDuration : input.duration,
      };

      setToasts((current) => {
        const withoutDuplicate = current.filter((toast) => toast.id !== id);
        return [...withoutDuplicate, record].slice(-Math.max(1, maxToasts));
      });

      return id;
    },
    [defaultDuration, maxToasts],
  );

  const requestConfirmation = useCallback((confirmation: ConfirmationInput) => {
    return new Promise<boolean>((resolve) => {
      setPendingConfirmation((current) => {
        current?.resolve(false);
        return { ...confirmation, resolve };
      });
    });
  }, []);

  const settleConfirmation = useCallback((confirmed: boolean) => {
    setPendingConfirmation((current) => {
      current?.resolve(confirmed);
      return null;
    });
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({ pushToast, dismissToast, clearToasts, requestConfirmation }),
    [clearToasts, dismissToast, pushToast, requestConfirmation],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length ? (
        <div
          className="minsah-toast-viewport pointer-events-none fixed inset-x-4 z-[100] flex flex-col-reverse gap-3 sm:left-auto sm:right-6 sm:w-96"
          role="region"
          aria-label="Notifications"
        >
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} onDismiss={dismissToast} />
          ))}
        </div>
      ) : null}
      <ConfirmDialog
        open={Boolean(pendingConfirmation)}
        onClose={() => settleConfirmation(false)}
        onConfirm={() => settleConfirmation(true)}
        title={pendingConfirmation?.title ?? 'Confirm action'}
        description={pendingConfirmation?.description}
        confirmLabel={pendingConfirmation?.confirmLabel}
        cancelLabel={pendingConfirmation?.cancelLabel}
        tone={pendingConfirmation?.tone}
      />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider.');
  }
  return context;
}
