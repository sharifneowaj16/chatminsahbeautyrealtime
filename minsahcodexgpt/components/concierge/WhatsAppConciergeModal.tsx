'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Phone, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { ConciergeSpecialistCard } from './ConciergeSpecialistCard';
import { ConciergeContextProtocolBanner } from './ConciergeContextProtocolBanner';
import { ConciergeTopicSelector, CONCIERGE_TOPICS } from './ConciergeTopicSelector';
import { WhatsAppPreviewBubble } from './WhatsAppPreviewBubble';
import { ConciergeTrustFooter } from './ConciergeTrustFooter';
import { WhatsAppConciergeModalProps, ConciergeTopicKey } from './types';

export function WhatsAppConciergeModal({
  isOpen,
  onClose,
  caseId = 'DH-9482',
  userPhone = '+880 1712–345678',
  initialTopic = 'unlock',
}: WhatsAppConciergeModalProps) {
  const [selectedTopicKey, setSelectedTopicKey] = useState<ConciergeTopicKey>(initialTopic);

  useEffect(() => {
    setSelectedTopicKey(initialTopic);
  }, [initialTopic]);

  const currentTopic =
    CONCIERGE_TOPICS.find((t) => t.key === selectedTopicKey) || CONCIERGE_TOPICS[0];

  const handleLaunchWhatsApp = () => {
    const text = encodeURIComponent(
      `Assalamu Alaikum Minsah Concierge, Case #${caseId} for ${userPhone}. ${currentTopic.suggestedDraft}`,
    );
    window.open(`https://wa.me/8801700646724?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      badge={
        <>
          <span className="h-2 w-2 rounded-full bg-[#4b6723] animate-pulse" />
          <span>Dhaka Specialist Online • Avg reply &lt; 2 mins</span>
        </>
      }
      title="Direct Concierge Desk"
      description="Gulshan-2 Skincare & Delivery Support (9 AM – 11 PM)"
      closeLabel="Close concierge modal"
      footer={
        <div className="flex flex-col gap-2 w-full">
          <button
            type="button"
            onClick={handleLaunchWhatsApp}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#062402] px-5 font-bold text-white shadow-sm transition hover:bg-[#1c3a13] active:scale-[0.98]"
          >
            <MessageCircle className="h-4 w-4 text-[#25D366]" />
            <span>Open in WhatsApp (Start Chat)</span>
            <ExternalLink className="h-4 w-4 text-[#D4F6A2]" />
          </button>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="tel:+8801700646724"
              className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-[#E2DED8] bg-[#F4F3EF] font-semibold text-[#181C1A] transition hover:bg-[#EAF7D8]"
            >
              <Phone className="h-4 w-4 text-[#4b6723]" />
              <span>Call Desk</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 items-center justify-center rounded-full border border-[#E2DED8] bg-[#F4F3EF] font-semibold text-[#5A615D] transition hover:text-[#181C1A]"
            >
              Close
            </button>
          </div>
        </div>
      }
    >
      <ConciergeSpecialistCard />
      <ConciergeContextProtocolBanner caseId={caseId} userPhone={userPhone} />
      <ConciergeTopicSelector selectedKey={selectedTopicKey} onSelect={setSelectedTopicKey} />
      <WhatsAppPreviewBubble topic={currentTopic} onSendDraft={handleLaunchWhatsApp} />
      <ConciergeTrustFooter />
    </Modal>
  );
}
