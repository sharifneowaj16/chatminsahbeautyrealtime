'use client';

import React from 'react';
import { X, Bike, Plane, CheckCircle2, Phone } from 'lucide-react';

interface OrderHistoryLiveTrackingModalProps {
  isOpen: boolean;
  orderNumber: string;
  onClose: () => void;
}

export default function OrderHistoryLiveTrackingModal({
  isOpen,
  orderNumber,
  onClose,
}: OrderHistoryLiveTrackingModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] select-none flex flex-col justify-end"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#062402]/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slide-Up Sheet */}
      <div className="relative z-10 w-full max-h-[85vh] bg-white rounded-t-[32px] p-5 pb-8 overflow-y-auto flex flex-col gap-4 shadow-2xl no-scrollbar animate-in slide-in-from-bottom duration-300">
        {/* Drag Handle */}
        <div className="flex justify-center pt-1 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-[#c3c8bc]/60" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[#E2DED8]/40">
          <div>
            <span className="text-[11px] font-bold text-[#4b6723] uppercase tracking-wider block">
              Live Express Tracking
            </span>
            <h3 className="text-[18px] text-[#062402] font-bold">
              Order {orderNumber}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#43483f] hover:text-[#062402] active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mini Map View */}
        <div
          className="w-full h-44 rounded-2xl bg-cover bg-center relative overflow-hidden flex items-end p-3 shadow-sm border border-[#E2DED8]"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=700&q=80')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#062402]/80 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between w-full text-white">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#c7edb5] animate-ping" />
              <span className="text-xs font-bold">Rider: Shakil M. (Electric Bike)</span>
            </div>
            <a
              href="tel:+8801700000000"
              className="text-xs bg-[#28531c] px-3 py-1 rounded-full text-white font-bold flex items-center gap-1 shadow-xs"
            >
              <Phone className="w-3 h-3" />
              <span>Call</span>
            </a>
          </div>
        </div>

        {/* Tracking Milestones */}
        <div className="flex flex-col gap-3.5 pt-1">
          {/* Milestone 1 */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#062402] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Bike className="w-4 h-4 text-[#c7edb5]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#062402]">Out for Delivery to Banani</h4>
              <p className="text-[11px] text-[#43483f]">
                Arriving today by 4:30 PM • House 14, Road 7, Banani
              </p>
            </div>
          </div>

          {/* Milestone 2 */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#EAF7D8] text-[#516d29] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-[#4b6723]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#062402]">Dhaka Customs Clearance Complete</h4>
              <p className="text-[11px] text-[#43483f]">
                Cleared HS Code 3304.99 with authenticated health pass
              </p>
            </div>
          </div>

          {/* Milestone 3 */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#efeeeb] text-[#43483f] flex items-center justify-center shrink-0">
              <Plane className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#062402]">Dispatched via Steadfast / Pathao</h4>
              <p className="text-[11px] text-[#43483f]">
                Banani Central Hub • Express Courier Transit
              </p>
            </div>
          </div>
        </div>

        {/* Close CTA */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 mt-2 rounded-full bg-[#062402] text-white text-xs font-bold active:scale-95 transition-all shadow-md"
        >
          Close Live View
        </button>
      </div>
    </div>
  );
}
