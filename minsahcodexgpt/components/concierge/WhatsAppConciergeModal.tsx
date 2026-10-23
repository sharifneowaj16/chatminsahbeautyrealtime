'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { ConciergeSpecialistCard } from './ConciergeSpecialistCard';
import { ConciergeContextProtocolBanner } from './ConciergeContextProtocolBanner';
import { ConciergeTopicSelector, CONCIERGE_TOPICS } from './ConciergeTopicSelector';
import { WhatsAppPreviewBubble } from './WhatsAppPreviewBubble';
import { ConciergeActionButtons } from './ConciergeActionButtons';
import { ConciergeTrustFooter } from './ConciergeTrustFooter';
import { WhatsAppConciergeModalProps, ConciergeTopicKey } from './types';

export function WhatsAppConciergeModal({
  isOpen,
  onClose,
  caseId = 'DH-9482',
  userPhone = '+880 1712–345678',
  userName = 'Tasneem',
  initialTopic = 'unlock',
}: WhatsAppConciergeModalProps) {
  const [selectedTopicKey, setSelectedTopicKey] = useState<ConciergeTopicKey>(initialTopic);

  if (!isOpen) return null;

  const currentTopic =
    CONCIERGE_TOPICS.find((t) => t.key === selectedTopicKey) || CONCIERGE_TOPICS[0];

  const handleLaunchWhatsApp = () => {
    const text = encodeURIComponent(
      `Assalamu Alaikum Minsah Concierge, Case #${caseId} for ${userPhone}. ${currentTopic.suggestedDraft}`
    );
    window.open(`https://wa.me/8801700646724?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-[#062402]/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in">
      {/* 1. Mobile Sheet View (lg:hidden - Screen 19) */}
      <div className="lg:hidden w-full max-h-[92vh] bg-[#faf9f6] rounded-t-[32px] shadow-2xl flex flex-col pt-2 pb-safe border-t border-[#E2DED8]/60 overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
        {/* Drag handle & close anchor */}
        <div className="w-full flex items-center justify-between px-4 pt-1 pb-1">
          <div className="w-10" />
          <div className="w-12 h-1.5 rounded-full bg-[#B5C4BB]/60" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close concierge sheet"
            className="w-9 h-9 rounded-full bg-[#efeeeb] hover:bg-[#E8F0E5] text-[#5A615D] flex items-center justify-center transition-transform active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="px-4 flex flex-col gap-3.5 pb-6 overflow-y-auto overscroll-contain">
          <ConciergeSpecialistCard />
          <ConciergeContextProtocolBanner caseId={caseId} userPhone={userPhone} />
          <ConciergeTopicSelector
            selectedKey={selectedTopicKey}
            onSelect={setSelectedTopicKey}
          />
          <WhatsAppPreviewBubble
            topic={currentTopic}
            onSendDraft={handleLaunchWhatsApp}
          />
          <ConciergeActionButtons
            onOpenWhatsApp={handleLaunchWhatsApp}
            onBack={onClose}
          />
          <ConciergeTrustFooter />
        </div>
      </div>

      {/* 2. Desktop Centered Modal (hidden lg:flex - Screen 20) */}
      <div className="hidden lg:flex relative w-full max-w-[610px] bg-white rounded-[28px] shadow-2xl flex-col overflow-hidden max-h-[92vh] border border-[#E2DED8]/70 animate-in zoom-in-95 duration-200">
        {/* Top subtle brand gradient bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#062402] via-[#4b6723] to-[#c7edb5]" />

        {/* Modal Header Bar */}
        <div className="px-6 pt-5 pb-2 flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="inline-flex items-center gap-1.5 bg-[#EAF7D8] px-2.5 py-0.5 rounded-full w-fit">
              <span className="w-2 h-2 rounded-full bg-[#4b6723] animate-pulse" />
              <span className="text-[11px] text-[#1c3a13] font-semibold tracking-wide">
                Dhaka Specialist Online • Avg reply &lt; 2 mins
              </span>
            </div>
            <h2 className="text-[20px] text-[#062402] font-bold tracking-tight mt-1">
              Direct Concierge Desk
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-full bg-[#efeeeb] hover:bg-[#E8F0E5] text-[#5A615D] hover:text-[#062402] transition-colors flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop Body Container */}
        <div className="px-6 pb-6 flex flex-col gap-3.5 overflow-y-auto">
          <ConciergeSpecialistCard />
          <ConciergeContextProtocolBanner caseId={caseId} userPhone={userPhone} />
          <ConciergeTopicSelector
            selectedKey={selectedTopicKey}
            onSelect={setSelectedTopicKey}
          />
          <WhatsAppPreviewBubble
            topic={currentTopic}
            onSendDraft={handleLaunchWhatsApp}
          />
          <ConciergeActionButtons
            onOpenWhatsApp={handleLaunchWhatsApp}
            onBack={onClose}
          />
          <ConciergeTrustFooter />
        </div>
      </div>
    </div>
  );
}
