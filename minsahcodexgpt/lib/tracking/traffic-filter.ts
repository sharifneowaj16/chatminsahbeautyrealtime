import 'server-only';

import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';
import {
  getServerTrackingConsentFromCookie,
  isConsentDenied,
  TRACKING_CONSENT_COOKIE,
} from '@/lib/tracking/tracking-consent';

const INTERNAL_IP_ENV_KEYS = ['ANALYTICS_INTERNAL_IPS', 'INTERNAL_TRAFFIC_IPS', 'STAFF_IPS'] as const;
const BOT_USER_AGENT_PATTERN = /bot|crawler|spider|crawling|preview|facebookexternalhit|whatsapp|telegrambot|slackbot|discordbot|headlesschrome|pingdom|uptime|monitoring|lighthouse|pagespeed/i;

export type TrackingTrafficReason =
  | 'TEST_ORDER'
  | 'CONSENT_DENIED'
  | 'INTERNAL_TRAFFIC'
  | 'BOT_TRAFFIC'
  | 'MISSING_USER_AGENT'
  | 'ALLOWED';

export type TrackingTrafficClassification = {
  allowed: boolean;
  reason: TrackingTrafficReason;
  ip?: string | null;
  userAgent?: string | null;
  visitorHash?: string | null;
};

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function getFirstClientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (
    forwarded ||
    headers.get('x-real-ip')?.trim() ||
    headers.get('x-vercel-forwarded-for')?.trim() ||
    headers.get('cf-connecting-ip')?.trim() ||
    null
  );
}

function getConfiguredInternalIps(): Set<string> {
  const ips = new Set<string>();
  for (const key of INTERNAL_IP_ENV_KEYS) {
    const raw = process.env[key];
    if (!raw) continue;
    raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((ip) => ips.add(ip));
  }
  return ips;
}

function hasTrustedInternalHeader(request: NextRequest) {
  const marker = request.headers.get('x-minsah-internal-traffic') === '1';
  if (!marker) return false;

  const secret = process.env.INTERNAL_TRAFFIC_HEADER_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return request.headers.get('x-minsah-internal-secret') === secret;
}

function hasInternalCookie(request: NextRequest) {
  return request.cookies.get('minsah_staff')?.value === '1' || request.cookies.get('mb_internal_traffic')?.value === '1';
}

export function isBotUserAgent(userAgent?: string | null) {
  if (!userAgent?.trim()) return true;
  return BOT_USER_AGENT_PATTERN.test(userAgent);
}

export function classifyTrackingRequest(request: NextRequest): TrackingTrafficClassification {
  const ip = getFirstClientIp(request.headers);
  const userAgent = request.headers.get('user-agent')?.trim() || null;
  const consent = getServerTrackingConsentFromCookie(request.cookies.get(TRACKING_CONSENT_COOKIE)?.value);

  if (isConsentDenied(consent)) {
    return { allowed: false, reason: 'CONSENT_DENIED', ip, userAgent };
  }

  if (hasInternalCookie(request) || hasTrustedInternalHeader(request) || (ip && getConfiguredInternalIps().has(ip))) {
    return { allowed: false, reason: 'INTERNAL_TRAFFIC', ip, userAgent };
  }

  if (!userAgent) {
    return { allowed: false, reason: 'MISSING_USER_AGENT', ip, userAgent };
  }

  if (isBotUserAgent(userAgent)) {
    return { allowed: false, reason: 'BOT_TRAFFIC', ip, userAgent };
  }

  const mbVid = request.cookies.get('mb_vid')?.value?.trim().toLowerCase();

  return {
    allowed: true,
    reason: 'ALLOWED',
    ip,
    userAgent,
    visitorHash: mbVid ? sha256(`mb_vid:${mbVid}`) : null,
  };
}

export function shouldSkipServerTrackingRequest(request: NextRequest) {
  const classification = classifyTrackingRequest(request);
  return classification.allowed ? null : classification;
}

export function shouldSkipProductAnalyticsRequest(request: NextRequest) {
  return shouldSkipServerTrackingRequest(request);
}

export function classifyStoredOrderTraffic(order: {
  isTest?: boolean | null;
  nonEssentialTrackingAllowed?: boolean | null;
  trackingFilteredReason?: string | null;
  customerIp?: string | null;
  customerUa?: string | null;
}, options: { skipBot?: boolean } = {}) {
  if (order.isTest) {
    return { allowed: false, reason: 'TEST_ORDER' as const, ip: order.customerIp, userAgent: order.customerUa };
  }

  if (order.nonEssentialTrackingAllowed === false) {
    return {
      allowed: false,
      reason: 'CONSENT_DENIED' as const,
      ip: order.customerIp,
      userAgent: order.customerUa,
    };
  }

  if (order.customerIp && getConfiguredInternalIps().has(order.customerIp)) {
    return { allowed: false, reason: 'INTERNAL_TRAFFIC' as const, ip: order.customerIp, userAgent: order.customerUa };
  }

  if (options.skipBot && isBotUserAgent(order.customerUa)) {
    return { allowed: false, reason: 'BOT_TRAFFIC' as const, ip: order.customerIp, userAgent: order.customerUa };
  }

  return { allowed: true, reason: 'ALLOWED' as const, ip: order.customerIp, userAgent: order.customerUa };
}
