'use client';

import { Phone, Calendar, Bike, Link as LinkIcon } from 'lucide-react';

interface ReturnStatusHeroCardProps {
  returnNumber: string;
  orderNumber: string;
  pickupWindow?: string;
  riderName?: string;
  riderPhone?: string;
  onReschedule?: () => void;
}

export function ReturnStatusHeroCard({
  returnNumber,
  orderNumber,
  pickupWindow = '3:00 PM – 5:30 PM',
  riderName,
  riderPhone,
  onReschedule,
}: ReturnStatusHeroCardProps) {
  return (
    <section className="w-full bg-[#1c3a13] rounded-[26px] p-5 text-white relative overflow-hidden shadow-sm">
      <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-[#D4F6A2]/10 blur-2xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[#ccee9b]/10 blur-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col space-y-4">
        {/* Header reference and status pill */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-[#acd19b] uppercase tracking-wider">
              Return Reference
            </span>
            <span className="text-xl font-bold tracking-tight text-white">
              #{returnNumber}
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4F6A2]/20 text-[#D4F6A2]">
            <span className="w-2 h-2 rounded-full bg-[#D4F6A2] animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Pickup Scheduled
            </span>
          </div>
        </div>

        {/* Linked Order Subtext */}
        <div className="flex items-center gap-1.5 text-[#acd19b] text-xs">
          <LinkIcon className="w-3.5 h-3.5" />
          <span>
            Linked to Order{' '}
            <strong className="text-white font-semibold">#{orderNumber}</strong>
          </span>
        </div>

        {/* Pickup Time Slot Card */}
        <div className="bg-[#062402]/50 rounded-[20px] p-3.5 flex items-start gap-3 backdrop-blur-sm border border-white/5">
          <div className="w-10 h-10 rounded-full bg-[#D4F6A2]/20 flex items-center justify-center text-[#D4F6A2] shrink-0 mt-0.5">
            <Bike className="w-5 h-5" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#acd19b]">
                Pickup Window
              </span>
              <span className="text-[10px] font-bold text-[#D4F6A2] uppercase tracking-wider">
                Today
              </span>
            </div>
            <span className="text-base font-bold text-white tracking-tight mt-0.5">
              {pickupWindow}
            </span>
            <p className="text-[11px] text-[#acd19b] truncate mt-0.5">
              Paperfly Reverse Express{riderName ? ` • ${riderName} Assigned` : ' • Rider assigning soon'}
            </p>
          </div>
        </div>

        {/* Hero Quick Actions */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {riderPhone ? (
            <a
              href={`tel:${riderPhone}`}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-full bg-[#D4F6A2] text-[#062402] text-xs font-bold tracking-wide active:scale-95 transition-all shadow-md hover:shadow-lg"
            >
              <Phone className="w-4 h-4" />
              <span>Call Rider</span>
            </a>
          ) : (
            <div className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-full bg-white/10 text-white/60 text-xs font-medium">
              <span>Rider pending</span>
            </div>
          )}
          <button
            type="button"
            onClick={onReschedule}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-[#062402]/60 hover:bg-[#062402]/80 border border-white/10 text-white text-xs font-bold tracking-wide active:scale-95 transition-all shadow-md"
          >
            <Calendar className="w-4 h-4 text-[#D4F6A2]" />
            <span>Reschedule</span>
          </button>
        </div>
      </div>
    </section>
  );
}
