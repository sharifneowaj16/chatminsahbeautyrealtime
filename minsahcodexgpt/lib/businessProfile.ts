// Public business/contact configuration. Only NEXT_PUBLIC_* values are consumed
// so this module can be shared by server and client components safely.

export type BusinessProfile = {
  supportEmail: string;
  supportPhone: string | null;
  supportPhoneHref: string | null;
  supportHours: string | null;
  businessAddress: string | null;
  whatsappNumber: string | null;
  whatsappUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  telegramUrl: string | null;
};

const FALLBACK_SUPPORT_EMAIL = 'support@minsahbeauty.cloud';

const PLACEHOLDER_PATTERNS = [
  /todo/i,
  /replace/i,
  /example/i,
  /your[-_\s]?/i,
  /000000/,
  /^bangladesh$/i,
  /^bd$/i,
  /^n\/a$/i,
  /^none$/i,
  /^null$/i,
];

export function isPlaceholderBusinessValue(value: string | null | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || isPlaceholderBusinessValue(trimmed)) return null;
  return trimmed;
}

function normalizeUrl(value: string | null | undefined): string | null {
  const trimmed = normalizeOptionalText(value);
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return null;
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function normalizeEmail(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed || /todo|replace|example/i.test(trimmed)) return FALLBACK_SUPPORT_EMAIL;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : FALLBACK_SUPPORT_EMAIL;
}

function normalizePhone(value: string | null | undefined): string | null {
  const trimmed = normalizeOptionalText(value);
  if (!trimmed) return null;

  const digits = trimmed.replace(/[^\d]/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  return trimmed;
}

function phoneHref(phone: string | null): string | null {
  if (!phone) return null;
  const normalized = phone.replace(/[^+\d]/g, '');
  return normalized ? `tel:${normalized}` : null;
}

function normalizeBangladeshWhatsAppNumber(value: string | null | undefined): string | null {
  const trimmed = normalizeOptionalText(value);
  if (!trimmed) return null;

  let digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (/^01\d{9}$/.test(digits)) digits = `88${digits}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

export function getBusinessProfile(): BusinessProfile {
  const supportPhone = normalizePhone(process.env.NEXT_PUBLIC_SUPPORT_PHONE);
  const whatsappNumber = normalizeBangladeshWhatsAppNumber(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
  );

  return {
    supportEmail: normalizeEmail(process.env.NEXT_PUBLIC_SUPPORT_EMAIL),
    supportPhone,
    supportPhoneHref: phoneHref(supportPhone),
    supportHours: normalizeOptionalText(process.env.NEXT_PUBLIC_SUPPORT_HOURS),
    businessAddress: normalizeOptionalText(process.env.NEXT_PUBLIC_BUSINESS_ADDRESS),
    whatsappNumber,
    whatsappUrl: whatsappNumber ? `https://wa.me/${whatsappNumber}` : null,
    facebookUrl: normalizeUrl(process.env.NEXT_PUBLIC_FACEBOOK_URL),
    instagramUrl: normalizeUrl(process.env.NEXT_PUBLIC_INSTAGRAM_URL),
    youtubeUrl: normalizeUrl(process.env.NEXT_PUBLIC_YOUTUBE_URL),
    telegramUrl: normalizeUrl(process.env.NEXT_PUBLIC_TELEGRAM_URL),
  };
}
