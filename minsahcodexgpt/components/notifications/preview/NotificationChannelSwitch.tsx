'use client';

import React from 'react';
import { MessageSquareText } from 'lucide-react';
import { NotificationChannelType } from './types';

interface NotificationChannelSwitchProps {
  activeChannel: NotificationChannelType;
  onChange: (channel: NotificationChannelType) => void;
}

export default function NotificationChannelSwitch({
  activeChannel,
  onChange,
}: NotificationChannelSwitchProps) {
  return (
    <div className="bg-[#E8F0E5]/80 p-1 rounded-2xl flex items-center gap-1.5 border border-[#E2DED8]">
      {/* WhatsApp Tab */}
      <button
        type="button"
        onClick={() => onChange('whatsapp')}
        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
          activeChannel === 'whatsapp'
            ? 'bg-white text-[#1c3a13] shadow-xs'
            : 'text-[#5A615D] hover:text-[#1c3a13]'
        }`}
      >
        <span className="w-2.5 h-2.5 rounded-full bg-[#25D366]" />
        <span>WhatsApp Preview</span>
      </button>

      {/* SMS Tab */}
      <button
        type="button"
        onClick={() => onChange('sms')}
        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
          activeChannel === 'sms'
            ? 'bg-white text-[#1c3a13] shadow-xs'
            : 'text-[#5A615D] hover:text-[#1c3a13]'
        }`}
      >
        <MessageSquareText className="w-4 h-4" />
        <span>SMS Preview</span>
      </button>
    </div>
  );
}
