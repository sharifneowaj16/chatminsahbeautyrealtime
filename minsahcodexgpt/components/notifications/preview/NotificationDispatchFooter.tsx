'use client';

import React from 'react';
import { Send } from 'lucide-react';
import { NotificationChannelType } from './types';

interface NotificationDispatchFooterProps {
  activeChannel: NotificationChannelType;
  phone: string;
  onSendTest: () => void;
  onClose: () => void;
}

export default function NotificationDispatchFooter({
  activeChannel,
  phone,
  onSendTest,
  onClose,
}: NotificationDispatchFooterProps) {
  const channelLabel =
    activeChannel === 'whatsapp'
      ? 'Send Live Test Message to WhatsApp'
      : `Send Live Test SMS to ${phone}`;

  return (
    <div className="flex flex-col gap-2 pt-2">
      <button
        type="button"
        onClick={onSendTest}
        className="w-full py-3.5 rounded-full bg-[#1c3a13] hover:bg-[#28531c] text-white text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
      >
        <Send className="w-4 h-4 text-[#D4F6A2]" />
        <span>{channelLabel}</span>
      </button>

      <button
        type="button"
        onClick={onClose}
        className="w-full py-2.5 rounded-full bg-white hover:bg-[#F2F6F0] border border-[#E2DED8] text-[#5A615D] hover:text-[#1c3a13] text-xs font-semibold active:scale-95 transition-all flex items-center justify-center cursor-pointer"
      >
        <span>Close Preview</span>
      </button>
    </div>
  );
}
