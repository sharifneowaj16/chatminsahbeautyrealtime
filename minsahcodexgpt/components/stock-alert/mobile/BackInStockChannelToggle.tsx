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
        <label className="text-xs font-bold text-[#181C1A] flex items-center gap-1.5">
          <span>নোটিফিকেশনের মাধ্যম বেছে নিন</span>
          <span className="text-[11px] text-[#5A615D] font-normal">
            (Channels)
          </span>
        </label>
        <span className="text-[10px] text-[#1c3a13] font-bold bg-[#EAF7D8] px-2 py-0.5 rounded-full">
          ইনস্ট্যান্ট পিং
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* WhatsApp */}
        <div
          className={`p-3 rounded-2xl bg-white border flex items-center justify-between shadow-xs transition-colors ${
            channels.whatsapp ? 'border-[#1c3a13]' : 'border-[#E2DED8]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EAF7D8] flex items-center justify-center text-[#1c3a13]">
              <MessageCircle className="w-4 h-4 text-[#25D366] fill-current" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#181C1A] flex items-center gap-1">
                <span>হোয়াটসঅ্যাপ (WhatsApp)</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[10px] text-[#5A615D]">সরাসরি কনসিয়ার্জ মেসেজ</p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={channels.whatsapp}
            onClick={() => toggle('whatsapp')}
            className={`w-10 h-5.5 rounded-full flex items-center p-0.5 transition-colors ${
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
            channels.sms ? 'border-[#1c3a13]' : 'border-[#E2DED8]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#181C1A]">এসএমএস (SMS)</div>
              <p className="text-[10px] text-[#5A615D]">Dhaka SMS গেটওয়ে</p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={channels.sms}
            onClick={() => toggle('sms')}
            className={`w-10 h-5.5 rounded-full flex items-center p-0.5 transition-colors ${
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
            channels.email ? 'border-[#1c3a13]' : 'border-[#E2DED8]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#181C1A]">ইমেইল (Email)</div>
              <p className="text-[10px] text-[#5A615D]">ইনভয়েস ও বিস্তারিত কুপন</p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={channels.email}
            onClick={() => toggle('email')}
            className={`w-10 h-5.5 rounded-full flex items-center p-0.5 transition-colors ${
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
            channels.push ? 'border-[#1c3a13]' : 'border-[#E2DED8]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#181C1A]">ইন-অ্যাপ পুশ (Push)</div>
              <p className="text-[10px] text-[#5A615D]">অ্যাপ ব্যানার নোটিফিকেশন</p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={channels.push}
            onClick={() => toggle('push')}
            className={`w-10 h-5.5 rounded-full flex items-center p-0.5 transition-colors ${
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
