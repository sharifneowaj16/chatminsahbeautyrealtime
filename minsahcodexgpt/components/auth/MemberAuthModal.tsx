'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { sanitizeRedirectPath } from '@/lib/auth/redirect';
import { UnifiedAuthPanel } from './UnifiedAuthPanel';
import type { AuthStep, OpenAuthModalDetail } from './types';

interface MemberAuthModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  initialStep?: AuthStep;
}

export function MemberAuthModal({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onSuccess,
  initialStep = 'phone',
}: MemberAuthModalProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [step, setStep] = useState<AuthStep>(initialStep);
  const [prefillPhone, setPrefillPhone] = useState('');
  const [redirectTo, setRedirectTo] = useState<string | undefined>(undefined);
  const [reasonNotice, setReasonNotice] = useState<string | null>(null);

  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const detail = (e as CustomEvent<OpenAuthModalDetail | undefined>).detail;
      setPrefillPhone(detail?.phone || '');
      setRedirectTo(detail?.redirectTo);
      setReasonNotice(detail?.reason || null);
      setStep(detail?.mode === 'signup' ? 'signup' : 'phone');
      setInternalOpen(true);
    };

    const handleCloseEvent = () => setInternalOpen(false);

    window.addEventListener('minsah:open-auth-modal', handleOpen);
    window.addEventListener('minsah:close-auth-modal', handleCloseEvent);
    return () => {
      window.removeEventListener('minsah:open-auth-modal', handleOpen);
      window.removeEventListener('minsah:close-auth-modal', handleCloseEvent);
    };
  }, []);

  const handleClose = () => {
    if (controlledOnClose) controlledOnClose();
    else setInternalOpen(false);
  };

  const handleAuthenticated = () => {
    handleClose();
    if (onSuccess) {
      onSuccess();
      return;
    }
    if (redirectTo) {
      router.push(sanitizeRedirectPath(redirectTo, '/account'));
    }
    router.refresh();
  };

  const modalTitle =
    step === 'signup'
      ? 'Create Minsah Account'
      : step === 'otp'
        ? 'Verify 6-Digit Code'
        : step === 'locked'
          ? 'Verification Paused'
          : 'Welcome to Minsah Beauty';

  return (
    <Modal
      open={isModalOpen}
      onClose={handleClose}
      badge={
        <>
          <ShieldCheck className="h-3.5 w-3.5 text-[#4b6723]" />
          <span>MINSAH VIP &bull; 100% Authentic</span>
        </>
      }
      title={modalTitle}
      description="Sign in or join to track orders, redeem Glow Points, and unlock member offers"
      closeLabel="Close account modal"
    >
      <UnifiedAuthPanel
        initialStep={step}
        initialPhone={prefillPhone}
        redirectTo={redirectTo}
        noticeBanner={reasonNotice}
        onStepChange={setStep}
        onAuthenticated={handleAuthenticated}
        onClose={handleClose}
      />
    </Modal>
  );
}

export default MemberAuthModal;
