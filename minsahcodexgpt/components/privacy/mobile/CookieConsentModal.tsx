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
import { CookieCategoryCard } from './CookieCategoryCard';
import { CookieComplianceBanner } from './CookieComplianceBanner';
import { CookieRightsLinks } from './CookieRightsLinks';
import { CookiePreferences, DEFAULT_COOKIE_PREFERENCES } from './types';

interface CookieConsentModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

const STORAGE_KEY = 'minsah_cookie_consent_v1';

export function CookieConsentModal({
  forceOpen = false,
  onClose,
}: CookieConsentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_COOKIE_PREFERENCES);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        // Show after a brief delay for smoother UX
        const timer = setTimeout(() => setIsOpen(true), 800);
        return () => clearTimeout(timer);
      } else {
        setPreferences(JSON.parse(saved));
      }
    } catch {
      // Ignore storage errors
    }
  }, [forceOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
      setIsOpen(false);
      onClose?.();
    }, 1500);
  };

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      logistics: true,
      regimen: true,
      ads: true,
    };
    setPreferences(allAccepted);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allAccepted));
    } catch {}
    showToast('All botanical & logistics cookies enabled');
  };

  const handleSavePreferences = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {}
    showToast('Custom privacy profile saved');
  };

  const handleRejectOptional = () => {
    const essentialOnly: CookiePreferences = {
      necessary: true,
      logistics: false,
      regimen: false,
      ads: false,
    };
    setPreferences(essentialOnly);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(essentialOnly));
    } catch {}
    showToast('Essential batch security only retained');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#062402]/40 backdrop-blur-sm flex items-end justify-center animate-fadeIn">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-24 left-4 right-4 bg-[#062402] text-white rounded-full px-4 py-3 flex items-center justify-between shadow-2xl z-50 border border-[#ccee9b]/40 animate-bounce">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#ccee9b]" />
            <span className="text-xs font-bold">{toastMessage}</span>
          </div>
          <span className="text-[10px] text-[#ccee9b] uppercase tracking-wider font-bold">
            Minsah Verified
          </span>
        </div>
      )}

      {/* Sheet Container */}
      <div className="w-full max-w-lg bg-white rounded-t-[32px] max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl p-5 flex flex-col border-t border-[#E2DED8] animate-slideUp">
        {/* Drag Handle */}
        <div className="w-12 h-1.5 bg-[#E2DED8] rounded-full mx-auto mb-4 opacity-70 shrink-0" />

        {/* Icon & Title */}
        <div className="flex items-start gap-3.5 mb-3.5">
          <div className="relative w-12 h-12 rounded-full bg-[#EAF7D8] flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck className="w-6 h-6 text-[#4b6723]" />
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#D4F6A2] rounded-full flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-[#062402] rounded-full animate-pulse" />
            </span>
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[#062402] tracking-tight">
              Your Privacy &amp; Cookie Choices
            </h2>
            <p className="text-xs text-[#5A615D] mt-1 leading-snug">
              We use cookies &amp; local storage to authenticate batches, safeguard doorstep checkout across Bangladesh, and tailor your skincare regimen.
            </p>
          </div>
        </div>

        {/* Regulatory Compliance Badge */}
        <CookieComplianceBanner />

        {/* Categories */}
        <div className="flex flex-col gap-2.5 mb-3.5">
          <CookieCategoryCard
            icon={Lock}
            title="Strictly Necessary & Security"
            description="Required for cart persistence, bKash/Nagad checkout authentication, and anti-counterfeit batch verification."
            isLocked={true}
            checked={true}
          />

          <CookieCategoryCard
            icon={Truck}
            title="Logistics & Hub Telemetry"
            description="Optimizes live delivery tracking speed between Banani central hub and Steadfast & Pathao express courier routing."
            checked={preferences.logistics}
            onChange={(val) => setPreferences((p) => ({ ...p, logistics: val }))}
          />

          <CookieCategoryCard
            icon={FlaskConical}
            title="Regimen Personalization"
            description="Remembers your skin concerns (e.g., Glass Skin, Barrier Repair) to recommend compatible formulation pairings."
            checked={preferences.regimen}
            onChange={(val) => setPreferences((p) => ({ ...p, regimen: val }))}
          />

          <CookieCategoryCard
            icon={MousePointerClick}
            title="Partner Measurement"
            description="Meta Pixel and Google Merchant conversion verification with zero data reselling or unauthenticated sharing."
            checked={preferences.ads}
            onChange={(val) => setPreferences((p) => ({ ...p, ads: val }))}
          />
        </div>

        {/* Rights & Transparency */}
        <CookieRightsLinks />

        {/* Action CTAs */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handleAcceptAll}
            className="w-full bg-[#062402] text-white py-3.5 px-6 rounded-full font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-transform"
          >
            <CheckCircle2 className="w-4 h-4 text-[#ccee9b]" />
            <span>Accept All &amp; Continue</span>
          </button>

          <button
            type="button"
            onClick={handleSavePreferences}
            className="w-full bg-[#E8F0E5] text-[#062402] py-3 px-6 rounded-full font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.99] transition-transform border border-[#B5C4BB]/40"
          >
            <Sliders className="w-4 h-4 text-[#4b6723]" />
            <span>Save Preferences</span>
          </button>

          <button
            type="button"
            onClick={handleRejectOptional}
            className="w-full py-2 text-center text-[#5A615D] text-xs hover:text-[#062402] transition-colors underline decoration-[#E2DED8] underline-offset-4 font-medium"
          >
            Reject Non-Essential Cookies
          </button>
        </div>
      </div>
    </div>
  );
}
