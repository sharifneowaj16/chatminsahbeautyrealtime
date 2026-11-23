export type AuthStep = 'phone' | 'otp' | 'locked' | 'signup';

export interface OpenAuthModalDetail {
  mode?: 'signin' | 'signup';
  phone?: string;
  redirectTo?: string;
  reason?: string;
}

export function openGlobalAuthModal(detail?: OpenAuthModalDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<OpenAuthModalDetail>('minsah:open-auth-modal', { detail }));
}
