'use client';

import { useState } from 'react';
import { CalendarClock, X } from 'lucide-react';
import { CurrentScheduleBanner } from './CurrentScheduleBanner';
import { DatePickerGrid, NEXT_7_DAYS } from './DatePickerGrid';
import { TimeSlotSelector, TIME_SLOTS } from './TimeSlotSelector';
import { DispatchDestinationCard } from './DispatchDestinationCard';
import { RescheduleReasonDropdown, RESCHEDULE_REASONS } from './RescheduleReasonDropdown';
import { RiderNotesTextarea } from './RiderNotesTextarea';
import { RescheduleSummaryStickyFooter } from './RescheduleSummaryStickyFooter';
import { RescheduleSuccessOverlay } from './RescheduleSuccessOverlay';
import { DeliveryRescheduleModalProps, TimeSlotOption } from './types';

export function DeliveryRescheduleModal({
  isOpen,
  onClose,
  orderNumber = '#KR-88294',
  currentSchedule = {
    date: 'আজ, ১৫ নভেম্বর (Friday)',
    timeSlot: '1pm - 5pm',
  },
  address,
  onSuccess,
}: DeliveryRescheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>(NEXT_7_DAYS[2].dateStr);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotOption>(TIME_SLOTS[1]);
  const [selectedReason, setSelectedReason] = useState<string>(RESCHEDULE_REASONS[0].value);
  const [riderNotes, setRiderNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      if (onSuccess) {
        onSuccess(selectedDate, selectedSlot.timeRange, selectedReason, riderNotes);
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-[#062402]/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in">
      {/* 1. Mobile Bottom Sheet (Screen 23 - lg:hidden) */}
      <div className="lg:hidden w-full bg-[#faf9f6] border-t border-[#E2DED8] rounded-t-[32px] shadow-[0_-15px_40px_rgba(0,0,0,0.15)] max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-8 duration-300 overflow-hidden relative">
        {/* Drag Handle */}
        <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-14 h-1.5 bg-[#B5C4BB] rounded-full" />
        </div>

        {/* Mobile Header */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-[#E2DED8] bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#ccee9b] border border-[#B5C4BB] flex items-center justify-center text-[#1c3a13]">
              <CalendarClock className="w-5 h-5 text-[#1c3a13]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#181C1A] flex items-center gap-1.5">
                <span>ডেলিভারি রিশিডিউল করুন</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#F2F6F0] text-[#1c3a13] font-bold border border-[#B5C4BB]">
                  K-Beauty Express
                </span>
              </h2>
              <p className="text-[11px] text-[#5A615D]">
                Reschedule Delivery Date &amp; Time Slot
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-[#f4f3f1] hover:bg-[#e9e8e5] text-[#181C1A] flex items-center justify-center transition border border-[#E2DED8]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto px-5 py-4 space-y-4 overscroll-contain flex-1">
          <CurrentScheduleBanner
            date={currentSchedule.date}
            timeSlot={currentSchedule.timeSlot}
          />
          <DatePickerGrid
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
          <TimeSlotSelector
            selectedSlotId={selectedSlot.id}
            onSelectSlot={setSelectedSlot}
          />
          <DispatchDestinationCard address={address} />
          <RescheduleReasonDropdown
            selectedReason={selectedReason}
            onSelectReason={setSelectedReason}
          />
          <RiderNotesTextarea
            notes={riderNotes}
            onChangeNotes={setRiderNotes}
          />
        </div>

        {/* Sticky Footer Action */}
        <RescheduleSummaryStickyFooter
          dateStr={selectedDate}
          timeStr={selectedSlot.timeRange}
          isSubmitting={isSubmitting}
          onConfirm={handleConfirm}
        />

        {/* Success Overlay */}
        {isSuccess && (
          <RescheduleSuccessOverlay
            orderNumber={orderNumber}
            finalDate={selectedDate}
            finalTime={selectedSlot.timeRange}
            onReturnToTracking={onClose}
            onClose={onClose}
          />
        )}
      </div>

      {/* 2. Desktop Centered Dialog (Screen 24 - hidden lg:flex) */}
      <div className="hidden lg:flex relative w-full max-w-2xl bg-[#faf9f6] border border-[#E2DED8] rounded-[32px] shadow-2xl max-h-[92vh] flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Desktop Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-[#E2DED8] bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#ccee9b] border border-[#B5C4BB] flex items-center justify-center text-[#1c3a13]">
              <CalendarClock className="w-5 h-5 text-[#1c3a13]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#181C1A] flex items-center gap-2">
                <span>ডেলিভারি রিশিডিউল করুন</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F2F6F0] text-[#1c3a13] font-bold border border-[#B5C4BB]">
                  Steadfast &amp; Pathao Express
                </span>
              </h2>
              <p className="text-xs text-[#5A615D]">
                Reschedule Delivery Date &amp; Time Slot • Order {orderNumber}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-full bg-[#f4f3f1] hover:bg-[#e9e8e5] text-[#181C1A] flex items-center justify-center transition border border-[#E2DED8]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
          <CurrentScheduleBanner
            date={currentSchedule.date}
            timeSlot={currentSchedule.timeSlot}
          />
          <DatePickerGrid
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
          <TimeSlotSelector
            selectedSlotId={selectedSlot.id}
            onSelectSlot={setSelectedSlot}
          />
          <DispatchDestinationCard address={address} />
          <RescheduleReasonDropdown
            selectedReason={selectedReason}
            onSelectReason={setSelectedReason}
          />
          <RiderNotesTextarea
            notes={riderNotes}
            onChangeNotes={setRiderNotes}
          />
        </div>

        {/* Sticky Footer */}
        <RescheduleSummaryStickyFooter
          dateStr={selectedDate}
          timeStr={selectedSlot.timeRange}
          isSubmitting={isSubmitting}
          onConfirm={handleConfirm}
        />

        {/* Success Overlay */}
        {isSuccess && (
          <RescheduleSuccessOverlay
            orderNumber={orderNumber}
            finalDate={selectedDate}
            finalTime={selectedSlot.timeRange}
            onReturnToTracking={onClose}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
