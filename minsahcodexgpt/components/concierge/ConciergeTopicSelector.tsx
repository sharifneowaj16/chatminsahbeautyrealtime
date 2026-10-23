'use client';

import { CheckCircle2 } from 'lucide-react';
import { ConciergeTopicKey, ConciergeTopic } from './types';

export const CONCIERGE_TOPICS: ConciergeTopic[] = [
  {
    key: 'unlock',
    label: '🔐 Unlock My Account & OTP',
    iconName: 'lock_open',
    incomingMessage:
      'Assalamu Alaikum Tasneem! 🌿 I see your OTP entry was paused. Would you like me to send an instant 1-tap WhatsApp security login token, or verify via voice call?',
    suggestedDraft: 'Yes please, send my login token on WhatsApp →',
  },
  {
    key: 'delivery',
    label: '📦 Track Dhaka Delivery',
    iconName: 'local_shipping',
    incomingMessage:
      'Hello Tasneem! 📦 I have your Dhaka city courier manifest loaded. Would you like me to send the live rider contact & ETA to your WhatsApp?',
    suggestedDraft: 'Please share my Dhaka delivery rider details →',
  },
  {
    key: 'routine',
    label: '🌿 Routine Consultation',
    iconName: 'spa',
    incomingMessage:
      "Welcome Tasneem! 🌿 Looking to adjust your hydration step for the Dhaka humidity? Let's curate your customized regimen right now.",
    suggestedDraft: "I'd love recommendations for daytime routine →",
  },
  {
    key: 'authenticity',
    label: '🛡️ Batch Authenticity',
    iconName: 'verified',
    incomingMessage:
      'Assalamu Alaikum Tasneem! 🛡️ Ready to verify your batch certificate. Please send your 6-digit bottle stamp or packaging QR code directly in our chat.',
    suggestedDraft: 'Here is my product batch number for check →',
  },
];

interface ConciergeTopicSelectorProps {
  selectedKey: ConciergeTopicKey;
  onSelect: (key: ConciergeTopicKey) => void;
}

export function ConciergeTopicSelector({
  selectedKey,
  onSelect,
}: ConciergeTopicSelectorProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] font-bold text-[#5A615D] uppercase tracking-wider px-1">
        SELECT CONCIERGE TOPIC
      </p>

      <div className="flex flex-wrap gap-1.5">
        {CONCIERGE_TOPICS.map((topic) => {
          const isSelected = selectedKey === topic.key;
          return (
            <button
              key={topic.key}
              type="button"
              onClick={() => onSelect(topic.key)}
              className={`h-9 px-4 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                isSelected
                  ? 'bg-[#062402] text-white ring-1 ring-[#062402]'
                  : 'bg-[#F2F6F0] text-[#1c3a13] hover:bg-[#E8F0E5] border border-[#E2DED8]/70'
              }`}
            >
              {isSelected && (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#D4F6A2]" />
              )}
              <span>{topic.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
