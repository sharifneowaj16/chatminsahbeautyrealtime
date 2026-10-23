'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import WelcomeSparklesLayer from './WelcomeSparklesLayer';
import WelcomeBadgeHeader from './WelcomeBadgeHeader';
import WelcomeProductCollage from './WelcomeProductCollage';
import WelcomeCountdownTimer from './WelcomeCountdownTimer';
import WelcomeContactInput from './WelcomeContactInput';
import WelcomeActionButtons from './WelcomeActionButtons';

export default function WelcomeDiscountModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [contactValue, setContactValue] = useState('017');
  const [isClaimed, setIsClaimed] = useState(false);

  useEffect(() => {
    // Check if previously dismissed or claimed
    try {
      const alreadyDismissed = localStorage.getItem('minsah_welcome_discount_dismissed');
      const alreadyClaimed = localStorage.getItem('minsah_welcome_discount_claimed');
      if (!alreadyDismissed && !alreadyClaimed) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 3500);
        return () => clearTimeout(timer);
      }
    } catch {
      // LocalStorage unavailable
    }
  }, []);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    try {
      localStorage.setItem('minsah_welcome_discount_dismissed', 'true');
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    window.addEventListener('minsah:open-welcome-modal', handleOpen);
    return () => {
      window.removeEventListener('minsah:open-welcome-modal', handleOpen);
    };
  }, [handleOpen]);

  const handleClaim = () => {
    setIsClaimed(true);
    try {
      localStorage.setItem('minsah_welcome_discount_claimed', 'true');
      localStorage.setItem('minsah_applied_promo_code', 'WELCOME15');
    } catch {
      // ignore
    }

    setTimeout(() => {
      handleClose();
    }, 2200);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 md:p-10 select-none overflow-y-auto overflow-x-hidden no-scrollbar"
    >
      {/* Glass Backdrop covering entire screen including header */}
      <div
        className="fixed inset-0 bg-[#181C1A]/60 backdrop-blur-md transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Sparkle Particles Layer */}
      <WelcomeSparklesLayer />

      {/* Centered Luxury Popup Card with Balanced 4-Sided Spacing */}
      <div className="relative w-full max-w-[390px] max-h-[min(84vh,580px)] bg-white border border-[#E2DED8] rounded-[24px] sm:rounded-[28px] overflow-y-auto overflow-x-hidden overscroll-contain text-[#181C1A] flex flex-col p-4 sm:p-5 shadow-2xl transition-all duration-300 transform scale-100 z-10 no-scrollbar my-auto shrink-0">
        {/* Ambient Glow Spotlights */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-gradient-to-br from-[#EAF7D8] to-[#FDF6E2] rounded-full blur-3xl pointer-events-none opacity-80" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-gradient-to-tr from-[#EAF7D8]/70 to-[#FCEEEA]/80 rounded-full blur-3xl pointer-events-none opacity-80" />

        {/* Dedicated Close Button */}
        <button
          type="button"
          aria-label="Close Modal"
          onClick={handleClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 w-8 h-8 rounded-full bg-[#F2F6F0]/90 hover:bg-[#E3E8E0] active:scale-90 border border-[#E2DED8] flex items-center justify-center text-[#1c3a13] hover:text-black transition-all shadow-xs cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header & Badges */}
        <WelcomeBadgeHeader onClose={handleClose} />

        {/* Product Collage */}
        <WelcomeProductCollage />

        {/* Countdown */}
        <WelcomeCountdownTimer />

        {/* Contact Input */}
        <WelcomeContactInput
          value={contactValue}
          onChange={setContactValue}
          disabled={isClaimed}
        />

        {/* Action Buttons */}
        <WelcomeActionButtons
          onClaim={handleClaim}
          onDismiss={handleClose}
          isClaimed={isClaimed}
        />
      </div>
    </div>
  );
}
