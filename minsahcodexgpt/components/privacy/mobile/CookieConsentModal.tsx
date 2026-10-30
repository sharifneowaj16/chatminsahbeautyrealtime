'use client';

import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Truck,
  FlaskConical,
  MousePointerClick,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { CookieCategoryCard } from './CookieCategoryCard';
import { CookieComplianceBanner } from './CookieComplianceBanner';
import { CookieRightsLinks } from './CookieRightsLinks';
import { CookiePreferences, DEFAULT_COOKIE_PREFERENCES } from './types';

interface CookieConsentModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

const STORAGE_KEY = 'minsah_cookie_consent_v1';

export function CookieConsentModal({ forceOpen = false, onClose }: CookieConsentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_COOKIE_PREFERENCES);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        const timer = setTimeout(() => setIsOpen(true), 800);
        return () => clearTimeout(timer);
      }
      setPreferences(JSON.parse(saved));
    } catch {}
  }, [forceOpen]);

  const persistAndClose = (next: CookiePreferences) => {
    setPreferences(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
    setIsOpen(false);
    onClose?.();
  };

  return (
    <Modal
      open={isOpen}
      onClose={() =>
        persistAndClose({ necessary: true, logistics: false, regimen: false, ads: false })
      }
      badge={
        <>
          <ShieldCheck className="h-3.5 w-3.5 text-[#4b6723]" />
          <span>GDPR &amp; Meta 4.a Ready</span>
        </>
      }
      title="Your Privacy & Cookie Choices"
      description="Manage batch security, delivery telemetry, and skincare personalization"
      closeLabel="Close privacy preferences"
      footer={
        <div className="flex flex-col gap-2 w-full">
          <button
            type="button"
            onClick={() =>
              persistAndClose({ necessary: true, logistics: true, regimen: true, ads: true })
            }
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#062402] px-5 font-bold text-white shadow-sm transition hover:bg-[#1c3a13]"
          >
            <CheckCircle2 className="h-4 w-4 text-[#D4F6A2]" />
            <span>Accept All &amp; Continue</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => persistAndClose(preferences)}
              className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#B5C4BB] bg-[#EAF7D8] px-3 font-bold text-[#062402]"
            >
              <Sliders className="h-3.5 w-3.5 text-[#4b6723]" />
              <span>Save Choices</span>
            </button>
            <button
              type="button"
              onClick={() =>
                persistAndClose({ necessary: true, logistics: false, regimen: false, ads: false })
              }
              className="flex h-10 items-center justify-center rounded-full border border-[#E2DED8] bg-[#F4F3EF] px-3 font-semibold text-[#5A615D]"
            >
              Essential Only
            </button>
          </div>
        </div>
      }
    >
      <CookieComplianceBanner />
      <div className="space-y-2.5">
        <CookieCategoryCard
          icon={Lock}
          title="Strictly Necessary & Security"
          description="Required for cart persistence, checkout authentication, and batch verification."
          isLocked
          checked
        />
        <CookieCategoryCard
          icon={Truck}
          title="Logistics & Hub Telemetry"
          description="Optimizes live delivery tracking speed across Steadfast & Pathao couriers."
          checked={preferences.logistics}
          onChange={(val) => setPreferences((p) => ({ ...p, logistics: val }))}
        />
        <CookieCategoryCard
          icon={FlaskConical}
          title="Regimen Personalization"
          description="Remembers your skin concerns to recommend compatible formulations."
          checked={preferences.regimen}
          onChange={(val) => setPreferences((p) => ({ ...p, regimen: val }))}
        />
        <CookieCategoryCard
          icon={MousePointerClick}
          title="Partner Measurement"
          description="Meta Pixel and Google Merchant conversion verification."
          checked={preferences.ads}
          onChange={(val) => setPreferences((p) => ({ ...p, ads: val }))}
        />
      </div>
      <CookieRightsLinks />
    </Modal>
  );
}
