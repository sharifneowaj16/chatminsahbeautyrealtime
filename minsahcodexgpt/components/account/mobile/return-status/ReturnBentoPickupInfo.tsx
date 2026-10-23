'use client';

import { MapPin, CheckSquare, CheckCircle2 } from 'lucide-react';

interface ReturnBentoPickupInfoProps {
  address?: {
    street: string;
    area: string;
    city: string;
    note?: string;
  };
  onChangeAddress?: () => void;
}

export function ReturnBentoPickupInfo({
  address = {
    street: 'House 14, Road 7, Block E',
    area: 'Banani',
    city: 'Dhaka-1213',
    note: 'Note: Handover at 3rd Floor Reception if unavailable.',
  },
  onChangeAddress,
}: ReturnBentoPickupInfoProps) {
  return (
    <section className="grid grid-cols-1 gap-3 w-full">
      {/* Pickup Location Bento */}
      <div className="bg-white rounded-[26px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-[#E2DED8]/60 flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#f4f3f1] flex items-center justify-center text-[#062402]">
              <MapPin className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-[#1a1c1a] uppercase tracking-wider">
              Pickup Location
            </span>
          </div>
          <button
            type="button"
            onClick={onChangeAddress}
            className="text-xs font-bold text-[#4b6723] hover:underline"
          >
            Change
          </button>
        </div>

        <div className="bg-[#f4f3f1] rounded-[18px] p-3.5 flex flex-col border border-[#E2DED8]/40">
          <span className="text-xs font-bold text-[#1a1c1a]">
            {address.street}
          </span>
          <span className="text-xs text-[#43483f]">
            {address.area}, {address.city}
          </span>
          {address.note && (
            <span className="text-[11px] text-[#43483f] mt-1.5 font-medium">
              {address.note}
            </span>
          )}
        </div>
      </div>

      {/* Preparation Checklist Bento */}
      <div className="bg-white rounded-[26px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-[#E2DED8]/60 flex flex-col space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-[#f4f3f1] flex items-center justify-center text-[#062402]">
            <CheckSquare className="w-4 h-4" />
          </span>
          <span className="text-xs font-bold text-[#1a1c1a] uppercase tracking-wider">
            Preparation Checklist
          </span>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#4b6723] shrink-0 mt-0.5" />
            <p className="text-xs text-[#1a1c1a] leading-relaxed">
              Keep the original Korean brand box and untouched accessories ready.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#4b6723] shrink-0 mt-0.5" />
            <p className="text-xs text-[#1a1c1a] leading-relaxed">
              No need to print labels — Rider will scan digital QR code from your phone screen.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#4b6723] shrink-0 mt-0.5" />
            <p className="text-xs text-[#1a1c1a] leading-relaxed">
              Ensure the authenticity security sticker is intact and free from heavy damage.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
