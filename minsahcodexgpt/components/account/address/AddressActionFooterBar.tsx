"use client";

import React from "react";

interface AddressActionFooterBarProps {
  onSave: () => void;
  onCancel?: () => void;
  showToast?: boolean;
}

export function AddressActionFooterBar({
  onSave,
  onCancel,
  showToast = false,
}: AddressActionFooterBarProps) {
  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
    } else {
      window.history.back();
    }
  };

  return (
    <>
      {/* Sticky Bottom Elevation Action CTA Bar */}
      <aside className="sticky bottom-0 inset-x-0 w-full z-40 px-4 py-3 bg-white/95 backdrop-blur-xl shadow-lg border-t border-[#E2DED8]/60 flex flex-col gap-2">
        {/* Primary CTA: Save Address */}
        <button
          type="button"
          onClick={onSave}
          className="w-full py-3.5 px-6 rounded-full bg-[#062402] hover:bg-[#1c3a13] active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 group"
        >
          <span className="material-symbols-outlined text-[20px] text-[#ccee9b] group-hover:scale-110 transition-transform">
            check_circle
          </span>
          <span className="text-sm text-white font-bold tracking-wide">
            Save &amp; Deliver Here
          </span>
        </button>

        {/* Secondary CTA: Return / Cancel */}
        <div className="flex items-center justify-center pb-0.5">
          <button
            type="button"
            onClick={handleCancelClick}
            className="text-xs font-semibold text-[#43483f] hover:text-[#062402] py-1 px-4 rounded-full active:scale-95 transition-all"
          >
            Cancel &amp; Return to Cart
          </button>
        </div>
      </aside>

      {/* Confirmation Toast */}
      {showToast && (
        <div className="fixed inset-x-4 bottom-24 z-50 bg-[#062402] text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between border border-[#ccee9b]/30 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#ccee9b]/20 flex items-center justify-center text-[#ccee9b] shrink-0">
              <span className="material-symbols-outlined text-[20px]">check</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Address Verified &amp; Saved</span>
              <span className="text-[10px] text-[#e3e2e0]">
                Default set to Banani Model Town
              </span>
            </div>
          </div>
          <span className="text-[9px] uppercase font-bold text-[#ccee9b] bg-[#ccee9b]/15 px-2 py-0.5 rounded-full tracking-wider shrink-0 border border-[#ccee9b]/30">
            Express Delivery
          </span>
        </div>
      )}
    </>
  );
}
