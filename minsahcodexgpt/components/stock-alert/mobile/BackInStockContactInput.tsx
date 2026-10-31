'use client';

import { useState } from 'react';
import { Smartphone, CheckCircle, Lock } from 'lucide-react';

interface BackInStockContactInputProps {
  initialContact?: string;
  userName?: string;
  onChangeContact?: (val: string) => void;
}

export function BackInStockContactInput({
  initialContact = '',
  userName = '',
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
        <span className="font-semibold text-[#2D1F18]">
          Contact Number / Email:
        </span>
        {userName ? (
          <span className="text-emerald-800 flex items-center gap-1 font-semibold text-[11px]">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{userName} (Verified)</span>
          </span>
        ) : null}
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-800">
          <Smartphone className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={contact}
          onChange={handleChange}
          readOnly={!isEditing}
          placeholder="01XXXXXXXXX"
          className={`w-full pl-10 pr-20 py-2.5 rounded-2xl bg-white border border-[#EADFD5] text-[#2D1F18] text-xs font-semibold focus:outline-none focus:border-emerald-800 transition-all shadow-xs ${
            !isEditing ? 'cursor-default' : ''
          }`}
        />
        <button
          type="button"
          onClick={() => setIsEditing((prev) => !prev)}
          className="absolute inset-y-1.5 right-1.5 px-3 rounded-xl bg-[#FAF6F2] hover:bg-[#EFE6DE] text-xs text-[#2D1F18] font-semibold border border-[#EADFD5] transition-colors cursor-pointer"
        >
          {isEditing ? 'Save' : 'Change'}
        </button>
      </div>

      <p className="text-[11px] text-[#7A6E65] flex items-center gap-1">
        <Lock className="w-3 h-3 text-emerald-700 shrink-0" />
        <span>Your contact info is safe. No spam or promotional bombardment.</span>
      </p>
    </div>
  );
}
