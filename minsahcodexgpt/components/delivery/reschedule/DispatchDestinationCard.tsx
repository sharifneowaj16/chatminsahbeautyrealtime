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
    <div className="bg-white border border-[#EADFD5] rounded-2xl p-4 flex items-start justify-between gap-3 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#FAF6F2] border border-[#EADFD5] flex items-center justify-center text-emerald-800 mt-0.5 shrink-0">
          <MapPin className="w-5 h-5 text-emerald-700" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#2D1F18]">
              Dispatch Destination
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded font-bold border border-emerald-200">
              {address.label}
            </span>
          </div>
          <p className="text-xs text-[#2D1F18] font-medium mt-1 leading-snug">
            {address.addressLine}
          </p>
          <p className="text-[11px] text-[#7A6E65] mt-0.5">
            {address.areaCity} • 📞 {address.phone}
          </p>
        </div>
      </div>

      {onChangeAddress && (
        <button
          type="button"
          onClick={onChangeAddress}
          className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-0.5 transition underline-offset-4 hover:underline py-1 px-2 rounded-lg hover:bg-[#FAF6F2] shrink-0 cursor-pointer"
        >
          <span>Change</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
