export interface DateSlotOption {
  dateStr: string;
  dayLabel: string;
  dayNumber: number;
  status: 'past' | 'current' | 'fast' | 'available' | 'full';
  statusLabel: string;
}

export interface TimeSlotOption {
  id: string;
  labelBangla: string;
  labelEnglish: string;
  timeRange: string;
  isPopular?: boolean;
}

export interface DeliveryAddressSummary {
  label: string;
  addressLine: string;
  areaCity: string;
  phone: string;
}

export interface DeliveryRescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber?: string;
  currentSchedule?: {
    date: string;
    timeSlot: string;
  };
  address?: DeliveryAddressSummary;
  onSuccess?: (newDate: string, newTime: string, reason: string, notes: string) => void;
}
