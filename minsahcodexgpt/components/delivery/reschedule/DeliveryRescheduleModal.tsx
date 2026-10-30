'use client';

import { useState } from 'react';
import { CalendarCheck, CalendarClock, CheckCircle2, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { CurrentScheduleBanner } from './CurrentScheduleBanner';
import { DatePickerGrid, NEXT_7_DAYS } from './DatePickerGrid';
import { TimeSlotSelector, TIME_SLOTS } from './TimeSlotSelector';
import { DispatchDestinationCard } from './DispatchDestinationCard';
import { RescheduleReasonDropdown, RESCHEDULE_REASONS } from './RescheduleReasonDropdown';
import { RiderNotesTextarea } from './RiderNotesTextarea';
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

  const handleConfirm = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      onSuccess?.(selectedDate, selectedSlot.timeRange, selectedReason, riderNotes);
    }, 600);
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      badge={
        <>
          <CalendarClock className="h-3.5 w-3.5 text-[#4b6723]" />
          <span>Steadfast &amp; Pathao Express</span>
        </>
      }
      title="ডেলিভারি রিশিডিউল করুন"
      description={`Reschedule Delivery Date & Time Slot • Order ${orderNumber}`}
      closeLabel="Close reschedule modal"
      footer={
        isSuccess ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-full items-center justify-center rounded-full bg-[#062402] px-5 font-bold text-white transition hover:bg-[#1c3a13]"
          >
            অর্ডার ট্র্যাকিং এ ফিরে যান (Done)
          </button>
        ) : (
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center justify-between text-xs text-[#5A615D]">
              <span>নতুন শিডিউল:</span>
              <span className="font-bold text-[#062402]">
                {selectedDate} • {selectedSlot.timeRange}
              </span>
            </div>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirm}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#062402] px-5 font-bold text-white shadow-sm transition hover:bg-[#1c3a13] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#D4F6A2]" />
                  <span>প্রসেসিং হচ্ছে...</span>
                </>
              ) : (
                <>
                  <CalendarCheck className="h-4 w-4 text-[#D4F6A2]" />
                  <span>নিশ্চিত করুন (Confirm Reschedule)</span>
                </>
              )}
            </button>
          </div>
        )
      }
    >
      {isSuccess ? (
        <div className="space-y-4 py-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF7D8] text-[#1c3a13]">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div>
            <h3 className="font-bold text-[#062402]">ডেলিভারি সময় সফলভাবে আপডেট হয়েছে!</h3>
            <p className="mt-1 text-xs text-[#5A615D]">
              কুরিয়ার রাইডারকে নতুন শিডিউল পাঠানো হয়েছে ({selectedDate} • {selectedSlot.timeRange})।
            </p>
          </div>
        </div>
      ) : (
        <>
          <CurrentScheduleBanner date={currentSchedule.date} timeSlot={currentSchedule.timeSlot} />
          <DatePickerGrid selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          <TimeSlotSelector selectedSlotId={selectedSlot.id} onSelectSlot={setSelectedSlot} />
          <DispatchDestinationCard address={address} />
          <RescheduleReasonDropdown
            selectedReason={selectedReason}
            onSelectReason={setSelectedReason}
          />
          <RiderNotesTextarea notes={riderNotes} onChangeNotes={setRiderNotes} />
        </>
      )}
    </Modal>
  );
}
