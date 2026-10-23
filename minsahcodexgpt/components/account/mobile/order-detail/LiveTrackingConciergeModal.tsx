'use client';

import React from 'react';
import { X, PhoneCall, MessageCircle, ChevronRight } from 'lucide-react';

interface LiveTrackingConciergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  whatsappUrl?: string;
  hotlinePhone?: string;
}

export default function LiveTrackingConciergeModal({
  isOpen,
  onClose,
  whatsappUrl = 'https://wa.me/8801700000000',
  hotlinePhone = '+8801700646724',
}: LiveTrackingConciergeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[10000] select-none flex flex-col justify-end"
    >
      <div
        className="fixed inset-0 bg-[#062402]/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-h-[80vh] bg-white rounded-t-[32px] p-5 pb-8 flex flex-col gap-3.5 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-center pt-1">
          <div className="w-12 h-1.5 rounded-full bg-[#c3c8bc]/60" />
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#062402]">Dhaka Concierge Support</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#43483f]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#43483f] leading-relaxed">
          Have questions regarding flight KE-691 or the local Banani delivery schedule? Our beauty
          advisors are ready to assist.
        </p>

        <div className="flex flex-col gap-2 pt-1">
          <a
            href={`tel:${hotlinePhone}`}
            className="p-3.5 rounded-2xl bg-[#efeeeb] flex items-center justify-between hover:bg-[#EAF7D8] transition-all"
          >
            <div className="flex items-center gap-3">
              <PhoneCall className="w-5 h-5 text-[#4b6723]" />
              <div>
                <span className="text-xs font-bold text-[#062402] block">Hotline Support</span>
                <span className="text-[10px] text-[#43483f]">+880 1700-MINSAH</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#43483f]" />
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="p-3.5 rounded-2xl bg-[#efeeeb] flex items-center justify-between hover:bg-[#EAF7D8] transition-all"
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-[#4b6723]" />
              <div>
                <span className="text-xs font-bold text-[#062402] block">
                  WhatsApp Instant Desk
                </span>
                <span className="text-[10px] text-[#43483f]">Typical reply time: 2 mins</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#43483f]" />
          </a>
        </div>
      </div>
    </div>
  );
}
