'use client';

import {
  canLoadNonEssentialTracking,
  getClientTrackingConsent,
} from '@/lib/tracking/tracking-consent';

const BOT_UA_PATTERN = /bot|crawler|spider|crawling|preview|facebookexternalhit|whatsapp|telegrambot|slackbot|discordbot|headlesschrome|pingdom|uptime|monitoring|lighthouse|pagespeed/i;

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match) return undefined;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function isLikelyAutomatedClient(userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '') {
  if (!userAgent) return true;
  return BOT_UA_PATTERN.test(userAgent);
}

export function hasInternalTrafficMarker() {
  if (typeof document === 'undefined') return false;
  return readCookie('minsah_staff') === '1' || readCookie('mb_internal_traffic') === '1';
}

export function canRunClientTracking() {
  if (typeof window === 'undefined') return false;
  if (!canLoadNonEssentialTracking(getClientTrackingConsent())) return false;
  if (hasInternalTrafficMarker()) return false;
  if (isLikelyAutomatedClient()) return false;
  return true;
}

export function getClientTrackingBlockReason() {
  if (typeof window === 'undefined') return 'SERVER_SIDE';
  if (!canLoadNonEssentialTracking(getClientTrackingConsent())) return 'CONSENT_DENIED_OR_REQUIRED';
  if (hasInternalTrafficMarker()) return 'INTERNAL_TRAFFIC';
  if (isLikelyAutomatedClient()) return 'BOT_OR_AUTOMATED_TRAFFIC';
  return null;
}
