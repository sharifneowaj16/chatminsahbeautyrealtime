export interface DeliveryPromiseConfig {
  fastZoneDaysCutoffBefore: number;
  fastZoneDaysCutoffAfter: number;
  outsideDhakaDays: number;
  cutoffHour: number;
  timezone: string;
  deliversOnFriday: boolean;
  fastZoneAreas: string[];
}

export const DEFAULT_DELIVERY_PROMISE_CONFIG: DeliveryPromiseConfig = {
  fastZoneDaysCutoffBefore: 1,
  fastZoneDaysCutoffAfter: 2,
  outsideDhakaDays: 2,
  cutoffHour: 15,
  timezone: 'Asia/Dhaka',
  deliversOnFriday: true,
  fastZoneAreas: ['Dhaka', 'Keraniganj', 'Narayanganj', 'Savar'],
};

export interface DeliveryPromiseBilingualText {
  bn: string;
  en: string;
}

export interface DeliveryPromiseSnapshot {
  isFastZone: boolean;
  isBeforeCutoff: boolean;
  estimatedDays: number;
  sameDayDispatch: boolean;
  deliversOnFriday: boolean;
  primaryNote: DeliveryPromiseBilingualText;
  secondaryNote: DeliveryPromiseBilingualText;
  outsideDhakaNote: DeliveryPromiseBilingualText;
  fridayNote: DeliveryPromiseBilingualText;
  disclaimer: DeliveryPromiseBilingualText;
}

export interface ResolveDeliveryPromiseInput {
  config?: Partial<DeliveryPromiseConfig>;
  area?: string | null;
  now?: Date;
}

/**
 * Resolves the official delivery promise based on real business facts (Owner Decision D2):
 * - Fast Zone (Dhaka, Keraniganj, Narayanganj, Savar):
 *     * Order before 3:00 PM: 1 day (same-day dispatch).
 *     * Order after 3:00 PM: 2 days (next-day dispatch).
 * - Outside Dhaka:
 *     * 2 days (48 hours) delivery window.
 * - Friday delivery: Available across all active routes.
 * - Single source of truth for Product Page, Checkout, and Policies.
 */
export function resolveDeliveryPromise(input: ResolveDeliveryPromiseInput = {}): DeliveryPromiseSnapshot {
  const config: DeliveryPromiseConfig = {
    ...DEFAULT_DELIVERY_PROMISE_CONFIG,
    ...input.config,
  };

  const now = input.now ?? new Date();

  // Convert to Asia/Dhaka (UTC+6)
  const bdTime = new Date(now.getTime() + (6 * 60 + now.getTimezoneOffset()) * 60_000);
  const hour = bdTime.getHours();
  const isBeforeCutoff = hour < config.cutoffHour;

  const normalizedArea = (input.area || '').trim().toLowerCase();
  const isExplicitOutside = normalizedArea.includes('outside') || normalizedArea.includes('ঢাকার বাইরে');

  const matchesFastZone = Boolean(
    normalizedArea &&
    !isExplicitOutside &&
    config.fastZoneAreas.some((fz) => normalizedArea.includes(fz.toLowerCase()))
  );

  // If no area specified, default primary promise is Fast Zone, but provide outsideDhakaNote
  const isFastZone = input.area ? matchesFastZone : true;

  const estimatedDays = isFastZone
    ? (isBeforeCutoff ? config.fastZoneDaysCutoffBefore : config.fastZoneDaysCutoffAfter)
    : config.outsideDhakaDays;

  const sameDayDispatch = isFastZone && isBeforeCutoff;

  const fastZoneBeforeNote: DeliveryPromiseBilingualText = {
    bn: 'বিকেল ৩টার আগে অর্ডার করলে ১ দিনে ডেলিভারি (আজই ডিসপ্যাচ)',
    en: 'Order before 3 PM: 1-day delivery (Dispatched today)',
  };

  const fastZoneAfterNote: DeliveryPromiseBilingualText = {
    bn: 'বিকেল ৩টার পরে অর্ডার করলে ২ দিনে ডেলিভারি (আগামীকাল ডিসপ্যাচ)',
    en: 'Order after 3 PM: 2-day delivery (Dispatched tomorrow)',
  };

  const outsideDhakaNote: DeliveryPromiseBilingualText = {
    bn: 'ঢাকার বাইরে ২ দিনে (৪৮ ঘণ্টায়) নিশ্চিত ডেলিভারি',
    en: 'Outside Dhaka: 2-day (48 hrs) delivery',
  };

  const fridayNote: DeliveryPromiseBilingualText = {
    bn: 'শুক্রবারও ডেলিভারি চালু',
    en: 'Friday delivery available',
  };

  const disclaimer: DeliveryPromiseBilingualText = {
    bn: 'কুরিয়ার বা প্রতিকূল আবহাওয়ার কারণে সময় কিছুটা পরিবর্তিত হতে পারে',
    en: 'Delivery time may vary slightly due to courier routing or adverse weather',
  };

  const primaryNote = isFastZone
    ? (isBeforeCutoff ? fastZoneBeforeNote : fastZoneAfterNote)
    : outsideDhakaNote;

  const secondaryNote = isFastZone ? outsideDhakaNote : fastZoneBeforeNote;

  return {
    isFastZone,
    isBeforeCutoff,
    estimatedDays,
    sameDayDispatch,
    deliversOnFriday: config.deliversOnFriday,
    primaryNote,
    secondaryNote,
    outsideDhakaNote,
    fridayNote,
    disclaimer,
  };
}
