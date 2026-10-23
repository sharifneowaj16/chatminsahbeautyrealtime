'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import type { AccountNotificationSettings } from './types';

interface AccountNotificationChannelsCardProps {
  notifications: AccountNotificationSettings;
  onToggleChannel: (channel: keyof AccountNotificationSettings) => void;
}

export default function AccountNotificationChannelsCard({
  notifications,
  onToggleChannel,
}: AccountNotificationChannelsCardProps) {
  const channels: Array<{
    key: keyof AccountNotificationSettings;
    title: string;
    subtitle: string;
  }> = [
    {
      key: 'courierTracking',
      title: 'Live Courier Tracking',
      subtitle: 'SMS & WhatsApp updates',
    },
    {
      key: 'restockAlerts',
      title: 'Restock & Price Drops',
      subtitle: 'Wishlist botanical alerts',
    },
    {
      key: 'promotions',
      title: 'Promotions & Flash Sales',
      subtitle: 'Weekly editorial emails',
    },
  ];

  return (
    <section className="w-full bg-[#F8FAF7] rounded-3xl p-5 shadow-xs space-y-4 border border-[#E2DED8]/60">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#c7edb5] flex items-center justify-center text-[#062402]">
          <Bell className="w-4 h-4" />
        </div>
        <h3 className="text-sm text-[#062402] font-bold">Notification Channels</h3>
      </div>

      <div className="space-y-2">
        {channels.map((ch) => {
          const isEnabled = notifications[ch.key];
          return (
            <div
              key={ch.key}
              className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E2DED8]/50 shadow-2xs"
            >
              <div>
                <p className="text-xs font-bold text-[#062402]">{ch.title}</p>
                <p className="text-[11px] text-[#5A615D]">{ch.subtitle}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isEnabled}
                onClick={() => onToggleChannel(ch.key)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                  isEnabled ? 'bg-[#062402]' : 'bg-[#e3e2e0]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
