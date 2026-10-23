'use client';

import { useState } from 'react';
import { Smartphone, CheckCircle, Lock } from 'lucide-react';

interface BackInStockContactInputProps {
  initialContact?: string;
  userName?: string;
  onChangeContact?: (val: string) => void;
}

export function BackInStockContactInput({
  initialContact = '+880 1712-894102',
  userName = 'Tasneem Ahmed',
  onChangeContact,
}: BackInStockContactInputProps) {
  const [contact, setContact] = useState(initialContact);
  const [isEditing, setIsEditing] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContact(e.target.value);
    if (onChangeContact) {
      onChangeContact(e.target.value);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-[#181C1A]">
          যোগাযোগের নম্বর / ইমেইল (Pre-filled):
        </span>
        <span className="text-[#28531c] flex items-center gap-1 font-semibold text-[11px]">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>{userName} (Logged In)</span>
        </span>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#1c3a13]">
          <Smartphone className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={contact}
          onChange={handleChange}
          readOnly={!isEditing}
          className={`w-full pl-10 pr-20 py-2.5 rounded-2xl bg-white border border-[#E2DED8] text-[#181C1A] text-xs font-semibold focus:outline-none focus:border-[#1c3a13] transition-all shadow-xs ${
            !isEditing ? 'cursor-default' : ''
          }`}
        />
        <button
          type="button"
          onClick={() => setIsEditing((prev) => !prev)}
          className="absolute inset-y-1.5 right-1.5 px-3 rounded-xl bg-[#F2F6F0] hover:bg-[#e9e8e5] text-xs text-[#1c3a13] font-semibold border border-[#E2DED8] transition-colors"
        >
          {isEditing ? 'ঠিক আছে' : 'পরিবর্তন'}
        </button>
      </div>

      <p className="text-[11px] text-[#5A615D] flex items-center gap-1">
        <Lock className="w-3 h-3 text-[#28531c] shrink-0" />
        <span>আপনার তথ্য সম্পূর্ণ নিরাপদ। স্প্যাম বা অপ্রয়োজনীয় বার্তা পাঠানো হবে না।</span>
      </p>
    </div>
  );
}
