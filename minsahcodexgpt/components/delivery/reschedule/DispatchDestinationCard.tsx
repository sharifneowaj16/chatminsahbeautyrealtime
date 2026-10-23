'use client';

import { MapPin, ChevronRight } from 'lucide-react';
import { DeliveryAddressSummary } from './types';

interface DispatchDestinationCardProps {
  address?: DeliveryAddressSummary;
  onChangeAddress?: () => void;
}

export function DispatchDestinationCard({
  address = {
    label: 'Home',
    addressLine: 'House 14, Road 7, Block E, Banani Model Town',
    areaCity: 'Dhaka-1213',
    phone: '+880 1712-894102',
  },
  onChangeAddress,
}: DispatchDestinationCardProps) {
  return (
    <div className="bg-white border border-[#E2DED8] rounded-2xl p-4 flex items-start justify-between gap-3 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#F2F6F0] border border-[#B5C4BB] flex items-center justify-center text-[#1c3a13] mt-0.5 shrink-0">
          <MapPin className="w-5 h-5 text-[#1c3a13]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#181C1A]">
              ডেলিভারি ঠিকানা (Dispatch Destination)
            </span>
            <span className="text-[10px] bg-[#ccee9b] text-[#1c3a13] px-1.5 py-0.2 rounded font-bold border border-[#B5C4BB]">
              {address.label}
            </span>
          </div>
          <p className="text-xs text-[#181C1A] font-medium mt-1 leading-snug">
            {address.addressLine}
          </p>
          <p className="text-[11px] text-[#5A615D] mt-0.5">
            {address.areaCity} • 📞 {address.phone}
          </p>
        </div>
      </div>

      {onChangeAddress && (
        <button
          type="button"
          onClick={onChangeAddress}
          className="text-xs font-bold text-[#1c3a13] hover:text-[#28531c] flex items-center gap-0.5 transition underline-offset-4 hover:underline py-1 px-2 rounded-lg hover:bg-[#F2F6F0] shrink-0"
        >
          <span>Change</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
