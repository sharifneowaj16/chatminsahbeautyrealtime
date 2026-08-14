import 'server-only';

import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';
import {
  getServerTrackingConsentFromCookie,
  getServerTrackingConsentVersionFromCookie,
  TRACKING_CONSENT_VERSION_COOKIE,
  TRACKING_CONSENT_COOKIE,
} from '@/lib/tracking/tracking-consent';
import { resolveTrackingDecision } from '@/lib/privacy/consent-resolver';

const INTERNAL_IP_ENV_KEYS = ['TRACKING_INTERNAL_IPS', 'ANALYTICS_INTERNAL_IPS', 'INTERNAL_TRAFFIC_IPS', 'STAFF_IPS'] as const;
const INTERNAL_DOMAIN_ENV_KEYS = ['TRACKING_INTERNAL_DOMAINS', 'INTERNAL_TRAFFIC_DOMAINS', 'STAFF_DOMAINS'] as const;
const TEST_EMAIL_ENV_KEYS = ['TRACKING_TEST_EMAILS'] as const;
const TEST_PHONE_ENV_KEYS = ['TRACKING_TEST_PHONES'] as const;
const BOT_USER_AGENT_PATTERN = /bot|crawler|spider|crawling|preview|facebookexternalhit|whatsapp|telegrambot|slackbot|discordbot|headlesschrome|pingdom|uptime|monitoring|lighthouse|pagespeed/i;

export type TrackingTrafficReason =
  | 'TEST_ORDER'
  | 'CONSENT_DENIED'
  | 'CONSENT_NOT_GRANTED'
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

type OrderTrackingExclusionInput = {
  request?: NextRequest;
  email?: string | null;
  emails?: Array<string | null | undefined>;
  phone?: string | null;
  phones?: Array<string | null | undefined>;
  /**
   * Storefront orders should be marked test when the request is staff/internal.
   * Admin-created orders should usually leave this false because an admin can create
   * a legitimate customer order from an office IP.
   */
  markInternalRequestAsTest?: boolean;
};

type StoredOrderTrafficInput = {
  isTest?: boolean | null;
  trackingConsent?: string | null;
  trackingConsentVersion?: string | null;
  nonEssentialTrackingAllowed?: boolean | null;
  trackingFilteredReason?: string | null;
  customerIp?: string | null;
  customerUa?: string | null;
  user?: { email?: string | null; phone?: string | null } | null;
  shippingAddress?: { phone?: string | null } | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  email?: string | null;
  phone?: string | null;
};

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function parseCsvEnv(keys: readonly string[]) {
  const values: string[] = [];
  for (const key of keys) {
    const raw = process.env[key];
    if (!raw) continue;
    raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => values.push(item));
  }
  return values;
}

export function normalizeTrackingEmail(email?: string | null) {
  return clean(email)?.toLowerCase().replace(/\s/g, '') ?? null;
}

function getEmailDomain(email?: string | null) {
  const normalized = normalizeTrackingEmail(email);
  const atIndex = normalized?.lastIndexOf('@') ?? -1;
  return atIndex > 0 ? normalized!.slice(atIndex + 1) : null;
}

function normalizeDomain(value?: string | null) {
  const raw = clean(value)?.toLowerCase();
  if (!raw) return null;

  const withoutProtocol = raw.replace(/^https?:\/\//, '').replace(/^www\./, '');
  const emailDomain = getEmailDomain(withoutProtocol);
  const domain = (emailDomain ?? withoutProtocol).split('/')[0].split(':')[0].replace(/^@/, '').trim();
  return domain || null;
}

function domainMatches(domain: string, configuredDomain: string) {
  return domain === configuredDomain || domain.endsWith(`.${configuredDomain}`);
}

export function isConfiguredInternalDomain(value?: string | null) {
  const domain = normalizeDomain(value);
  if (!domain) return false;
  return parseCsvEnv(INTERNAL_DOMAIN_ENV_KEYS)
    .map(normalizeDomain)
    .filter(Boolean)
    .some((configuredDomain) => domainMatches(domain, configuredDomain!));
}

export function isConfiguredTrackingTestEmail(email?: string | null) {
  const normalizedEmail = normalizeTrackingEmail(email);
  if (!normalizedEmail) return false;

  return parseCsvEnv(TEST_EMAIL_ENV_KEYS)
    .map(normalizeTrackingEmail)
    .filter(Boolean)
    .some((configuredEmail) => configuredEmail === normalizedEmail);
}

function normalizePhoneDigits(phone?: string | null) {
  let digits = clean(phone)?.replace(/\D/g, '') ?? '';
  if (!digits) return null;
  if (digits.startsWith('00880')) digits = digits.slice(2);
  return digits || null;
}

function buildPhoneCandidates(phone?: string | null) {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return new Set<string>();

  const candidates = new Set<string>([digits]);

  if (digits.startsWith('8801') && digits.length === 13) {
    candidates.add(`+${digits}`);
    candidates.add(`0${digits.slice(3)}`);
    candidates.add(digits.slice(3));
  } else if (digits.startsWith('01') && digits.length === 11) {
    candidates.add(`880${digits.slice(1)}`);
    candidates.add(`+880${digits.slice(1)}`);
    candidates.add(digits.slice(1));
  } else if (digits.startsWith('1') && digits.length === 10) {
    candidates.add(`01${digits}`);
    candidates.add(`880${digits}`);
    candidates.add(`+880${digits}`);
  }

  if (digits.length >= 10) candidates.add(digits.slice(-10));
  return candidates;
}

export function normalizeTrackingPhone(phone?: string | null) {
  const candidates = buildPhoneCandidates(phone);
  return candidates.values().next().value ?? null;
}

export function isConfiguredTrackingTestPhone(phone?: string | null) {
  const candidates = buildPhoneCandidates(phone);
  if (candidates.size === 0) return false;

  const configured = parseCsvEnv(TEST_PHONE_ENV_KEYS).flatMap((value) => [...buildPhoneCandidates(value)]);
  return configured.some((candidate) => candidates.has(candidate));
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
  return new Set(parseCsvEnv(INTERNAL_IP_ENV_KEYS));
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

export function isInternalTrackingRequest(request: NextRequest) {
  const ip = getFirstClientIp(request.headers);
  return Boolean(hasInternalCookie(request) || hasTrustedInternalHeader(request) || (ip && getConfiguredInternalIps().has(ip)));
}

export function isBotUserAgent(userAgent?: string | null) {
  if (!userAgent?.trim()) return true;
  return BOT_USER_AGENT_PATTERN.test(userAgent);
}

export function classifyTrackingRequest(request: NextRequest): TrackingTrafficClassification {
  const ip = getFirstClientIp(request.headers);
  const userAgent = request.headers.get('user-agent')?.trim() || null;
  const consent = getServerTrackingConsentFromCookie(request.cookies.get(TRACKING_CONSENT_COOKIE)?.value);
  const consentVersion = getServerTrackingConsentVersionFromCookie(
    request.cookies.get(TRACKING_CONSENT_VERSION_COOKIE)?.value
  );
  const decision = resolveTrackingDecision({
    consentState: consent,
    consentVersion,
    eventCategory: 'ADVERTISING',
    internalTraffic: isInternalTrackingRequest(request),
    botTraffic: Boolean(userAgent && isBotUserAgent(userAgent)),
  });

  if (!decision.allowCapiEvent) {
    return {
      allowed: false,
      reason: decision.reason === 'CONSENT_DENIED' || decision.reason === 'CONSENT_WITHDRAWN'
        ? 'CONSENT_DENIED'
        : decision.reason === 'INTERNAL_TRAFFIC'
          ? 'INTERNAL_TRAFFIC'
          : decision.reason === 'BOT_TRAFFIC'
            ? 'BOT_TRAFFIC'
            : 'CONSENT_NOT_GRANTED',
      ip,
      userAgent,
    };
  }

  if (isInternalTrackingRequest(request)) {
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

function getOrderEmails(order: StoredOrderTrafficInput) {
  return [order.user?.email, order.customerEmail, order.email].filter(Boolean) as string[];
}

function getOrderPhones(order: StoredOrderTrafficInput) {
  return [order.user?.phone, order.shippingAddress?.phone, order.customerPhone, order.phone].filter(Boolean) as string[];
}

export function classifyOrderTrackingExclusion(input: OrderTrackingExclusionInput) {
  const emails = [input.email, ...(input.emails ?? [])].filter(Boolean) as string[];
  const phones = [input.phone, ...(input.phones ?? [])].filter(Boolean) as string[];

  if (emails.some(isConfiguredTrackingTestEmail)) {
    return { isTest: true, reason: 'TEST_ORDER' as const };
  }

  if (phones.some(isConfiguredTrackingTestPhone)) {
    return { isTest: true, reason: 'TEST_ORDER' as const };
  }

  if (emails.some(isConfiguredInternalDomain)) {
    return { isTest: true, reason: 'INTERNAL_TRAFFIC' as const };
  }

  if (input.request && input.markInternalRequestAsTest !== false && isInternalTrackingRequest(input.request)) {
    return { isTest: true, reason: 'INTERNAL_TRAFFIC' as const };
  }

  return { isTest: false, reason: undefined };
}

export function buildOrderTrackingExclusionData(input: OrderTrackingExclusionInput) {
  const exclusion = classifyOrderTrackingExclusion(input);
  if (!exclusion.isTest || !exclusion.reason) return {};

  return {
    isTest: true,
    trackingFilteredReason: exclusion.reason,
  };
}

export function classifyStoredOrderTraffic(order: StoredOrderTrafficInput, options: { skipBot?: boolean } = {}) {
  if (order.isTest) {
    return { allowed: false, reason: 'TEST_ORDER' as const, ip: order.customerIp, userAgent: order.customerUa };
  }

  if (getOrderEmails(order).some(isConfiguredTrackingTestEmail) || getOrderPhones(order).some(isConfiguredTrackingTestPhone)) {
    return { allowed: false, reason: 'TEST_ORDER' as const, ip: order.customerIp, userAgent: order.customerUa };
  }

  if (getOrderEmails(order).some(isConfiguredInternalDomain)) {
    return { allowed: false, reason: 'INTERNAL_TRAFFIC' as const, ip: order.customerIp, userAgent: order.customerUa };
  }

  const storedConsent = getServerTrackingConsentFromCookie(order.trackingConsent);
  const storedDecision = resolveTrackingDecision({
    eventCategory: 'ADVERTISING',
    consentState: order.nonEssentialTrackingAllowed === true ? storedConsent : 'UNKNOWN',
    consentVersion: order.trackingConsentVersion,
  });
  if (!storedDecision.allowCapiEvent) {
    return {
      allowed: false,
      reason: storedDecision.reason === 'CONSENT_DENIED' || storedDecision.reason === 'CONSENT_WITHDRAWN'
        ? ('CONSENT_DENIED' as const)
        : ('CONSENT_NOT_GRANTED' as const),
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
