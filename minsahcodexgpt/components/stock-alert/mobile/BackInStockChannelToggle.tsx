'use client';

import { MessageCircle, MessageSquare, Mail, Bell } from 'lucide-react';
import { NotificationChannels } from './types';

interface BackInStockChannelToggleProps {
  channels: NotificationChannels;
  onChange: (channels: NotificationChannels) => void;
}

export function BackInStockChannelToggle({
  channels,
  onChange,
}: BackInStockChannelToggleProps) {
  const toggle = (key: keyof NotificationChannels) => {
    onChange({
      ...channels,
      [key]: !channels[key],
    });
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-[#2D1F18] flex items-center gap-1.5">
          <span>Choose Notification Channels</span>
        </label>
        <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
          Instant Ping
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* WhatsApp */}
        <div
          className={`p-3 rounded-2xl bg-white border flex items-center justify-between shadow-xs transition-colors ${
            channels.whatsapp ? 'border-emerald-800' : 'border-[#EADFD5]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-800">
              <MessageCircle className="w-4 h-4 text-[#25D366] fill-current" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#2D1F18] flex items-center gap-1">
                <span>WhatsApp</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[10px] text-[#7A6E65]">Direct VIP concierge message</p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={channels.whatsapp}
            onClick={() => toggle('whatsapp')}
            className={`w-10 h-5.5 rounded-full flex items-center p-0.5 transition-colors cursor-pointer ${
              channels.whatsapp ? 'bg-[#1c3a13]' : 'bg-[#e3e2e0]'
            }`}
          >
            <span
              className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${
                channels.whatsapp ? 'transform translate-x-4.5' : 'transform translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* SMS */}
        <div
          className={`p-3 rounded-2xl bg-white border flex items-center justify-between shadow-xs transition-colors ${
            channels.sms ? 'border-emerald-800' : 'border-[#EADFD5]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#2D1F18]">SMS Text</div>
              <p className="text-[10px] text-[#7A6E65]">Direct mobile SMS alert</p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={channels.sms}
            onClick={() => toggle('sms')}
            className={`w-10 h-5.5 rounded-full flex items-center p-0.5 transition-colors cursor-pointer ${
              channels.sms ? 'bg-[#1c3a13]' : 'bg-[#e3e2e0]'
            }`}
          >
            <span
              className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${
                channels.sms ? 'transform translate-x-4.5' : 'transform translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Email */}
        <div
          className={`p-3 rounded-2xl bg-white border flex items-center justify-between shadow-xs transition-colors ${
            channels.email ? 'border-emerald-800' : 'border-[#EADFD5]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#2D1F18]">Email</div>
              <p className="text-[10px] text-[#7A6E65]">Restock invoice &amp; voucher code</p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={channels.email}
            onClick={() => toggle('email')}
            className={`w-10 h-5.5 rounded-full flex items-center p-0.5 transition-colors cursor-pointer ${
              channels.email ? 'bg-[#1c3a13]' : 'bg-[#e3e2e0]'
            }`}
          >
            <span
              className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${
                channels.email ? 'transform translate-x-4.5' : 'transform translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Push */}
        <div
          className={`p-3 rounded-2xl bg-white border flex items-center justify-between shadow-xs transition-colors ${
            channels.push ? 'border-emerald-800' : 'border-[#EADFD5]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#2D1F18]">In-App Push</div>
              <p className="text-[10px] text-[#7A6E65]">Mobile banner notification</p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={channels.push}
            onClick={() => toggle('push')}
            className={`w-10 h-5.5 rounded-full flex items-center p-0.5 transition-colors cursor-pointer ${
              channels.push ? 'bg-[#1c3a13]' : 'bg-[#e3e2e0]'
            }`}
          >
            <span
              className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${
                channels.push ? 'transform translate-x-4.5' : 'transform translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
