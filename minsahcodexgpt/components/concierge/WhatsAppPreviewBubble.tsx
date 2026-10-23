'use client';

import { MessageCircle, Lock, CheckCheck, CornerDownRight, Send } from 'lucide-react';
import { ConciergeTopic } from './types';

interface WhatsAppPreviewBubbleProps {
  topic: ConciergeTopic;
  onSendDraft: () => void;
}

export function WhatsAppPreviewBubble({
  topic,
  onSendDraft,
}: WhatsAppPreviewBubbleProps) {
  return (
    <div className="bg-[#F8FAF7] rounded-2xl p-4 flex flex-col gap-3 relative border border-[#E2DED8]/60">
      {/* WhatsApp Mini Header */}
      <div className="flex items-center justify-between pb-1 border-b border-[#E2DED8]/40">
        <div className="flex items-center gap-1.5 text-[#5A615D]">
          <div className="w-5 h-5 rounded-full bg-[#25D366] flex items-center justify-center text-white">
            <MessageCircle className="w-3 h-3 fill-current" />
          </div>
          <span className="text-[11px] font-bold text-[#062402] uppercase tracking-wider">
            WhatsApp Direct Preview
          </span>
        </div>
        <div className="flex items-center gap-1 text-[#5A615D]/80">
          <Lock className="w-3 h-3 text-[#4b6723]" />
          <span className="text-[10px] tracking-wide font-medium">Encrypted Session</span>
        </div>
      </div>

      {/* Incoming Message Bubble */}
      <div className="flex flex-col items-start max-w-[94%] self-start">
        <div className="bg-white text-[#181C1A] rounded-2xl rounded-tl-sm p-3 shadow-xs border border-[#E2DED8]/50 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 pb-0.5">
            <span className="text-[11px] font-bold text-[#4b6723]">
              Minsah Beauty Concierge
            </span>
            <span className="text-[10px] text-[#5A615D]">10:42 AM</span>
          </div>

          <p className="text-[13px] leading-relaxed text-[#181C1A]">
            {topic.incomingMessage}
          </p>

          <div className="flex items-center justify-end gap-1 text-[#5A615D]/70 pt-0.5">
            <CheckCheck className="w-3.5 h-3.5 text-[#25D366]" />
          </div>
        </div>
      </div>

      {/* Suggested Outgoing Action Draft */}
      <button
        type="button"
        onClick={onSendDraft}
        className="self-end max-w-[94%] bg-[#EAF7D8] hover:bg-[#ccee9b] text-[#1c3a13] rounded-2xl rounded-tr-sm px-3.5 py-2 text-left flex items-center justify-between gap-2 transition-all group shadow-xs active:scale-95"
      >
        <div className="flex items-center gap-1.5 truncate">
          <CornerDownRight className="w-3.5 h-3.5 text-[#4b6723] shrink-0" />
          <span className="text-[12px] font-semibold truncate">
            {topic.suggestedDraft}
          </span>
        </div>
        <Send className="w-3.5 h-3.5 text-[#4b6723] group-hover:translate-x-0.5 transition-transform shrink-0" />
      </button>
    </div>
  );
}
