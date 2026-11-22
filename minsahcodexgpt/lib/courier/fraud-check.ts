// lib/courier/fraud-check.ts
// Distributed Courier Verification & Customer Delivery History Engine
// Integrates:
//   1. Steadfast Official Fraud Score API (/api/v1/fraud_check/score/{phone})
//   2. Pathao Merchant Portal Success API (/api/v1/user/success) with Redis token cache + lock
//   3. Minsah Beauty local order history (excluding current order)
// Load-balancer safe across multiple replicas via shared Redis cache (lib/cache/redis.ts).

import prisma from '@/lib/prisma';
import {
  cacheDelete,
  cacheGet,
  cacheIncrement,
  cacheSet,
  withRedisLock,
} from '@/lib/cache/redis';

export type CourierFetchStatus =
  | 'ok'
  | 'unconfigured'
  | 'circuit_open'
  | 'timeout'
  | 'invalid_phone'
  | 'error';

export interface SteadfastVerificationData {
  status: CourierFetchStatus;
  deliveryRatio: number | null;
  cancellationRatio: number | null;
  returnRatio: number | null;
  volumeBand: string | null;
  volumeRange: string | null;
  totalReports: number;
  doubtfulReports: boolean;
  fraudCategories: string[];
  deliveredCount: number | null;
  cancelledCount: number | null;
  totalParcels: number | null;
  score: number | null;
  level: string | null;
  reasons: string[];
  responseMs?: number;
  error?: string;
}

export interface PathaoVerificationData {
  status: CourierFetchStatus;
  version: string | null;
  showCount: boolean;
  customerRating: string | null;
  customerRatingLabel: string | null;
  totalParcels: number | null;
  deliveredCount: number | null;
  cancelledCount: number | null;
  successRate: number | null;
  responseMs?: number;
  error?: string;
}

export interface StoreOrderHistoryData {
  totalOrders: number;
  deliveredCount: number;
  cancelledCount: number;
  returnedCount: number;
  pendingCount: number;
  successRate: number | null;
}

export interface CustomerFraudRiskDetails {
  // Legacy fields kept for backwards compatibility
  totalOrders: number;
  deliveredCount: number;
  cancelledCount: number;
  returnedCount: number;
  successRate: number;
  riskReason: string;
  steadfastHistory?: {
    total_parcels?: number | null;
    delivered_parcels?: number | null;
    cancelled_parcels?: number | null;
    delivery_ratio?: number | null;
    cancellation_ratio?: number | null;
    return_ratio?: number | null;
    volume_range?: string | null;
    volume_band?: string | null;
    total_reports?: number;
  } | null;
  // Structured v2 fields (used by Telegram & upgraded Admin UI)
  version: 2;
  normalizedPhone: string;
  checkedAt: string;
  cached: boolean;
  steadfast: SteadfastVerificationData;
  pathao: PathaoVerificationData;
  storeHistory: StoreOrderHistoryData;
}

export interface CustomerFraudRiskResult {
  phone: string;
  normalizedPhone: string;
  fraudRiskScore: number; // 0 to 100 (informational; admin decides)
  fraudRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  details: CustomerFraudRiskDetails;
}

export interface EvaluateFraudRiskOptions {
  /** Exclude the currently created order so a brand-new order is not counted as past history. */
  excludeOrderId?: string | null;
  /** Bypass the 12-hour Redis cache and force live courier queries. */
  bypassCache?: boolean;
  /** Hard per-courier network timeout in milliseconds (default: 4500ms). */
  timeoutMs?: number;
}

// ??? Redis Keys & Tuning Constants ??????????????????????????????????????????

const COURIER_CACHE_PREFIX = 'courier:verify:v1:';
const COURIER_CACHE_TTL_SECONDS = 12 * 60 * 60; // 12 hours

const STEADFAST_CB_OPEN_KEY = 'courier:cb:steadfast:open';
const STEADFAST_CB_TTL_SECONDS = 60 * 60; // 60 min (prevents Steadfast 429 IP lockout)

const PATHAO_TOKEN_KEY = 'courier:pathao:merchant_token:v1';
const PATHAO_LOGIN_LOCK = 'courier:pathao:login';
const PATHAO_CB_FAILS_KEY = 'courier:cb:pathao:fails';
const PATHAO_CB_OPEN_KEY = 'courier:cb:pathao:open';
const PATHAO_CB_TTL_SECONDS = 45 * 60; // 45 min pause on repeated auth/rate failures

const DEFAULT_TIMEOUT_MS = 4_500;

interface CachedExternalCouriers {
  checkedAt: string;
  steadfast: SteadfastVerificationData;
  pathao: PathaoVerificationData;
}

// ??? Phone & Formatting Helpers ?????????????????????????????????????????????

export function normalizeBangladeshPhone(phone: string | null | undefined): string {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (/^8801\d{9}$/.test(digits)) return digits.slice(2); // -> 01XXXXXXXXX
  if (/^1\d{9}$/.test(digits)) return `0${digits}`;       // -> 01XXXXXXXXX
  if (/^01\d{9}$/.test(digits)) return digits;
  return digits;
}

export function isValidBangladeshMobile(normalizedPhone: string): boolean {
  return /^01[3-9]\d{8}$/.test(normalizedPhone);
}

export function formatPathaoRatingLabel(rating: string | null | undefined): string | null {
  if (!rating) return null;
  const cleaned = String(rating).trim().toLowerCase();
  if (!cleaned) return null;

  const map: Record<string, string> = {
    excellent_customer: 'Excellent Customer',
    good_customer: 'Good Customer',
    moderate_customer: 'Moderate Customer',
    average_customer: 'Average Customer',
    new_customer: 'New Customer',
    risky_customer: 'Risky Customer',
    bad_customer: 'Bad Customer',
    fraud_customer: 'Fraud Customer',
  };

  if (map[cleaned]) return map[cleaned];
  return cleaned
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toFiniteNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<{
  ok: boolean;
  status: number;
  ms: number;
  json: Record<string, unknown> | null;
  timedOut: boolean;
  error?: string;
}> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(500, timeoutMs));

  try {
    const res = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
    const text = await res.text().catch(() => '');
    let json: Record<string, unknown> | null = null;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        json = parsed as Record<string, unknown>;
      }
    } catch {
      json = null;
    }

    return {
      ok: res.ok,
      status: res.status,
      ms: Date.now() - start,
      json,
      timedOut: false,
      error: res.ok ? undefined : `HTTP_${res.status}`,
    };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      status: 0,
      ms: Date.now() - start,
      json: null,
      timedOut: isAbort,
      error: isAbort ? `TIMEOUT_${timeoutMs}MS` : err instanceof Error ? err.message : 'FETCH_ERROR',
    };
  } finally {
    clearTimeout(timer);
  }
}

// ??? Steadfast Official Fraud Score API ?????????????????????????????????????

function emptySteadfast(status: CourierFetchStatus, error?: string, responseMs?: number): SteadfastVerificationData {
  return {
    status,
    deliveryRatio: null,
    cancellationRatio: null,
    returnRatio: null,
    volumeBand: null,
    volumeRange: null,
    totalReports: 0,
    doubtfulReports: false,
    fraudCategories: [],
    deliveredCount: null,
    cancelledCount: null,
    totalParcels: null,
    score: null,
    level: null,
    reasons: [],
    ...(responseMs !== undefined ? { responseMs } : {}),
    ...(error ? { error } : {}),
  };
}

async function querySteadfastFraudScore(
  normalizedPhone: string,
  timeoutMs: number
): Promise<SteadfastVerificationData> {
  const apiKey = process.env.STEADFAST_API_KEY?.trim();
  const secretKey = process.env.STEADFAST_SECRET_KEY?.trim();

  if (!apiKey || !secretKey) {
    return emptySteadfast('unconfigured');
  }

  const cbOpen = await cacheGet<string>(STEADFAST_CB_OPEN_KEY);
  if (cbOpen) {
    return emptySteadfast('circuit_open', 'Steadfast check paused after auth/rate-limit error');
  }

  const res = await fetchJsonWithTimeout(
    `https://portal.packzy.com/api/v1/fraud_check/score/${encodeURIComponent(normalizedPhone)}`,
    {
      method: 'GET',
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
    timeoutMs
  );

  if (res.timedOut) {
    return emptySteadfast('timeout', res.error, res.ms);
  }

  if (res.status === 401 || res.status === 403 || res.status === 429) {
    await cacheSet(STEADFAST_CB_OPEN_KEY, `HTTP_${res.status}`, STEADFAST_CB_TTL_SECONDS);
    console.warn(`[CourierCheck] Steadfast circuit breaker opened for 60m due to HTTP ${res.status}`);
    return emptySteadfast('circuit_open', `HTTP_${res.status}`, res.ms);
  }

  if (!res.ok || !res.json) {
    return emptySteadfast('error', res.error || 'INVALID_RESPONSE', res.ms);
  }

  const payload =
    res.json.data && typeof res.json.data === 'object'
      ? (res.json.data as Record<string, unknown>)
      : res.json;

  const deliveredCount = toFiniteNumberOrNull(payload.delivered_count ?? payload.delivered_parcels);
  const cancelledCount = toFiniteNumberOrNull(payload.cancelled_count ?? payload.cancelled_parcels);
  const explicitTotal = toFiniteNumberOrNull(payload.total_parcels);
  const totalParcels =
    explicitTotal !== null
      ? explicitTotal
      : deliveredCount !== null && cancelledCount !== null
        ? deliveredCount + cancelledCount
        : null;

  const deliveryRatio = toFiniteNumberOrNull(payload.delivery_ratio);
  const cancellationRatio = toFiniteNumberOrNull(payload.cancellation_ratio);
  const returnRatio = toFiniteNumberOrNull(payload.return_ratio);
  const totalReports = toFiniteNumberOrNull(payload.total_reports) ?? 0;

  return {
    status: 'ok',
    deliveryRatio,
    cancellationRatio,
    returnRatio,
    volumeBand: typeof payload.volume_band === 'string' ? payload.volume_band : null,
    volumeRange: typeof payload.volume_range === 'string' ? payload.volume_range : null,
    totalReports,
    doubtfulReports: Boolean(payload.doubtful_reports),
    fraudCategories: Array.isArray(payload.fraud_categories)
      ? payload.fraud_categories.map(String)
      : [],
    deliveredCount,
    cancelledCount,
    totalParcels,
    score: toFiniteNumberOrNull(payload.score),
    level: typeof payload.level === 'string' ? payload.level : null,
    reasons: Array.isArray(payload.reasons) ? payload.reasons.map(String) : [],
    responseMs: res.ms,
  };
}

// ??? Pathao Merchant Portal Success API (Distributed Token Cache + Lock) ????

function emptyPathao(status: CourierFetchStatus, error?: string, responseMs?: number): PathaoVerificationData {
  return {
    status,
    version: null,
    showCount: false,
    customerRating: null,
    customerRatingLabel: null,
    totalParcels: null,
    deliveredCount: null,
    cancelledCount: null,
    successRate: null,
    ...(responseMs !== undefined ? { responseMs } : {}),
    ...(error ? { error } : {}),
  };
}

function getPathaoFraudCredentials() {
  const username = (
    process.env.PATHAO_FRAUD_USERNAME ||
    process.env.PATHAO_USERNAME ||
    ''
  ).trim();
  const password = (
    process.env.PATHAO_FRAUD_PASSWORD ||
    process.env.PATHAO_PASSWORD ||
    ''
  ).trim();
  return { username, password };
}

async function recordPathaoAuthFailure(statusCode: number) {
  if (statusCode === 429) {
    await cacheSet(PATHAO_CB_OPEN_KEY, 'HTTP_429', PATHAO_CB_TTL_SECONDS);
    console.warn('[CourierCheck] Pathao circuit breaker opened for 45m due to HTTP 429');
    return;
  }

  const fails = await cacheIncrement(PATHAO_CB_FAILS_KEY, 600);
  if (fails >= 2) {
    await cacheSet(PATHAO_CB_OPEN_KEY, `HTTP_${statusCode}`, PATHAO_CB_TTL_SECONDS);
    console.warn(`[CourierCheck] Pathao circuit breaker opened for 45m after ${fails} failures (HTTP ${statusCode})`);
  }
}

async function getPathaoMerchantToken(
  timeoutMs: number,
  forceRefresh = false
): Promise<{ token: string | null; status: CourierFetchStatus; error?: string }> {
  const { username, password } = getPathaoFraudCredentials();
  if (!username || !password) {
    return { token: null, status: 'unconfigured' };
  }

  if (!forceRefresh) {
    const cachedToken = await cacheGet<string>(PATHAO_TOKEN_KEY);
    if (cachedToken) {
      return { token: cachedToken, status: 'ok' };
    }
  } else {
    await cacheDelete(PATHAO_TOKEN_KEY);
  }

  const lockResult = await withRedisLock(PATHAO_LOGIN_LOCK, 8_000, async () => {
    if (!forceRefresh) {
      const doubleChecked = await cacheGet<string>(PATHAO_TOKEN_KEY);
      if (doubleChecked) {
        return { token: doubleChecked, status: 'ok' as CourierFetchStatus };
      }
    }

    const loginRes = await fetchJsonWithTimeout(
      'https://merchant.pathao.com/api/v1/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ username, password }),
      },
      Math.min(timeoutMs, 3_000)
    );

    if (loginRes.timedOut) {
      return { token: null, status: 'timeout' as CourierFetchStatus, error: loginRes.error };
    }

    if (loginRes.status === 401 || loginRes.status === 403 || loginRes.status === 429) {
      await recordPathaoAuthFailure(loginRes.status);
      return { token: null, status: 'circuit_open' as CourierFetchStatus, error: `LOGIN_HTTP_${loginRes.status}` };
    }

    const dataObj =
      loginRes.json?.data && typeof loginRes.json.data === 'object'
        ? (loginRes.json.data as Record<string, unknown>)
        : null;

    const rawToken =
      loginRes.json?.access_token ??
      loginRes.json?.token ??
      dataObj?.access_token ??
      dataObj?.token;

    const token = typeof rawToken === 'string' && rawToken.trim() ? rawToken.trim() : null;
    if (!loginRes.ok || !token) {
      return { token: null, status: 'error' as CourierFetchStatus, error: loginRes.error || 'LOGIN_NO_TOKEN' };
    }

    const expiresIn = toFiniteNumberOrNull(loginRes.json?.expires_in ?? dataObj?.expires_in) ?? 43_200;
    const ttlSeconds = Math.min(Math.max(300, Math.floor(expiresIn - 300)), 18 * 60 * 60);
    await cacheSet(PATHAO_TOKEN_KEY, token, ttlSeconds);

    return { token, status: 'ok' as CourierFetchStatus };
  });

  if (lockResult.acquired) {
    return lockResult.value;
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const sharedToken = await cacheGet<string>(PATHAO_TOKEN_KEY);
    if (sharedToken) {
      return { token: sharedToken, status: 'ok' };
    }
  }

  return { token: null, status: 'timeout', error: 'TOKEN_LOCK_WAIT_TIMEOUT' };
}

async function queryPathaoSuccessRate(
  normalizedPhone: string,
  timeoutMs: number
): Promise<PathaoVerificationData> {
  const { username, password } = getPathaoFraudCredentials();
  if (!username || !password) {
    return emptyPathao('unconfigured');
  }

  const cbOpen = await cacheGet<string>(PATHAO_CB_OPEN_KEY);
  if (cbOpen) {
    return emptyPathao('circuit_open', 'Pathao check paused after auth/rate-limit error');
  }

  const start = Date.now();
  const remaining = () => Math.max(500, timeoutMs - (Date.now() - start));

  let auth = await getPathaoMerchantToken(remaining(), false);
  if (!auth.token) {
    return emptyPathao(auth.status, auth.error, Date.now() - start);
  }

  const callSuccessApi = (token: string) =>
    fetchJsonWithTimeout(
      'https://merchant.pathao.com/api/v1/user/success',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ phone: normalizedPhone }),
      },
      remaining()
    );

  let res = await callSuccessApi(auth.token);

  if (res.status === 401 && remaining() > 1_200) {
    auth = await getPathaoMerchantToken(remaining(), true);
    if (!auth.token) {
      return emptyPathao(auth.status, auth.error, Date.now() - start);
    }
    res = await callSuccessApi(auth.token);
  }

  if (res.timedOut) {
    return emptyPathao('timeout', res.error, Date.now() - start);
  }

  if (res.status === 401 || res.status === 403 || res.status === 429) {
    await recordPathaoAuthFailure(res.status);
    return emptyPathao('circuit_open', `HTTP_${res.status}`, Date.now() - start);
  }

  if (!res.ok || !res.json) {
    return emptyPathao('error', res.error || 'INVALID_RESPONSE', Date.now() - start);
  }

  const data =
    res.json.data && typeof res.json.data === 'object'
      ? (res.json.data as Record<string, unknown>)
      : res.json;

  const customerObj =
    data.customer && typeof data.customer === 'object'
      ? (data.customer as Record<string, unknown>)
      : null;

  const version = typeof data.version === 'string' ? data.version : null;
  const showCount = Boolean(data.show_count);
  const customerRating =
    typeof data.customer_rating === 'string'
      ? data.customer_rating
      : typeof customerObj?.rating === 'string'
        ? customerObj.rating
        : null;

  const totalParcels = toFiniteNumberOrNull(
    customerObj?.total_delivery ?? data.total_delivery ?? data.total_parcels
  );
  const deliveredCount = toFiniteNumberOrNull(
    customerObj?.successful_delivery ?? data.successful_delivery ?? data.delivered_parcels
  );
  const explicitCancelled = toFiniteNumberOrNull(
    customerObj?.cancelled_delivery ?? data.cancelled_delivery ?? data.cancelled_parcels
  );
  const cancelledCount =
    explicitCancelled !== null
      ? explicitCancelled
      : totalParcels !== null && deliveredCount !== null
        ? Math.max(0, totalParcels - deliveredCount)
        : null;

  const successRate =
    totalParcels !== null && totalParcels > 0 && deliveredCount !== null
      ? Math.round((deliveredCount / totalParcels) * 100)
      : null;

  return {
    status: 'ok',
    version,
    showCount,
    customerRating,
    customerRatingLabel: formatPathaoRatingLabel(customerRating),
    totalParcels,
    deliveredCount,
    cancelledCount,
    successRate,
    responseMs: Date.now() - start,
  };
}

// ??? Local Minsah Beauty Order History (Always Live, Excludes Current Order) ?

async function queryLocalStoreHistory(
  normalizedPhone: string,
  excludeOrderId?: string | null
): Promise<StoreOrderHistoryData> {
  if (!normalizedPhone) {
    return {
      totalOrders: 0,
      deliveredCount: 0,
      cancelledCount: 0,
      returnedCount: 0,
      pendingCount: 0,
      successRate: null,
    };
  }

  const localOrders = await prisma.order.findMany({
    where: {
      ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
      isTest: false,
      OR: [
        { shippingAddress: { phone: { contains: normalizedPhone } } },
        { user: { phone: { contains: normalizedPhone } } },
      ],
    },
    select: {
      id: true,
      status: true,
      deliveredAt: true,
      cancelledAt: true,
      returnedAt: true,
    },
  });

  let deliveredCount = 0;
  let cancelledCount = 0;
  let returnedCount = 0;
  let pendingCount = 0;

  for (const order of localOrders) {
    if (order.status === 'DELIVERED') deliveredCount++;
    else if (order.status === 'CANCELLED') cancelledCount++;
    else if (order.status === 'REFUNDED' || order.returnedAt != null) returnedCount++;
    else pendingCount++;
  }

  const completedCount = deliveredCount + cancelledCount + returnedCount;
  const successRate =
    completedCount > 0 ? Math.round((deliveredCount / completedCount) * 100) : null;

  return {
    totalOrders: localOrders.length,
    deliveredCount,
    cancelledCount,
    returnedCount,
    pendingCount,
    successRate,
  };
}

// ??? Informational Score Computation (Admin Always Decides From Raw Data) ???

function computeInformationalRiskScore(
  storeHistory: StoreOrderHistoryData,
  steadfast: SteadfastVerificationData,
  pathao: PathaoVerificationData
): { score: number; level: 'LOW' | 'MEDIUM' | 'HIGH'; reason: string } {
  let score = 15;
  const reasons: string[] = [];

  if (storeHistory.totalOrders >= 2 && storeHistory.successRate !== null) {
    if (storeHistory.successRate < 50) {
      score = Math.max(score, 85);
      reasons.push(`Minsah delivery rate ${storeHistory.successRate}%`);
    } else if (storeHistory.successRate < 75) {
      score = Math.max(score, 55);
      reasons.push(`Minsah delivery rate ${storeHistory.successRate}%`);
    }
  }

  if (steadfast.status === 'ok') {
    if (steadfast.totalReports >= 2) {
      score = Math.max(score, 85);
      reasons.push(`Steadfast ${steadfast.totalReports} merchant reports`);
    } else if (steadfast.totalReports === 1) {
      score = Math.max(score, 55);
      reasons.push('Steadfast 1 merchant report');
    }

    if (steadfast.deliveryRatio !== null) {
      if (steadfast.deliveryRatio < 60) {
        score = Math.max(score, 85);
        reasons.push(`Steadfast delivery ratio ${steadfast.deliveryRatio}%`);
      } else if (steadfast.deliveryRatio < 85) {
        score = Math.max(score, 50);
        reasons.push(`Steadfast delivery ratio ${steadfast.deliveryRatio}%`);
      }
    }
  }

  if (pathao.status === 'ok') {
    const rating = (pathao.customerRating || '').toLowerCase();
    if (rating.includes('fraud') || rating.includes('risky') || rating.includes('bad')) {
      score = Math.max(score, 80);
      reasons.push(`Pathao rating: ${pathao.customerRatingLabel || rating}`);
    } else if (pathao.successRate !== null && (pathao.totalParcels ?? 0) >= 3) {
      if (pathao.successRate < 60) {
        score = Math.max(score, 80);
        reasons.push(`Pathao success ${pathao.successRate}%`);
      } else if (pathao.successRate < 80) {
        score = Math.max(score, 50);
        reasons.push(`Pathao success ${pathao.successRate}%`);
      }
    }
  }

  const level: 'LOW' | 'MEDIUM' | 'HIGH' =
    score >= 75 ? 'HIGH' : score >= 45 ? 'MEDIUM' : 'LOW';

  const reason =
    reasons.length > 0
      ? reasons.join(' | ')
      : 'No negative courier or store signals found';

  return { score, level, reason };
}

// ??? Main Public Entrypoint ?????????????????????????????????????????????????

/**
 * Evaluate customer courier & store delivery history by phone number.
 * - Uses 12-hour Redis cache for Steadfast + Pathao results (shared across replicas).
 * - Always fetches live local Minsah store history (excluding current order when provided).
 * - Strictly bounded by timeoutMs (default 4.5s) via parallel AbortController requests.
 */
export async function evaluateCustomerFraudRisk(
  phone: string,
  options: EvaluateFraudRiskOptions = {}
): Promise<CustomerFraudRiskResult> {
  const normalizedPhone = normalizeBangladeshPhone(phone);
  const timeoutMs = Math.max(1_000, Math.min(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, 10_000));
  const validMobile = isValidBangladeshMobile(normalizedPhone);
  const cacheKey = `${COURIER_CACHE_PREFIX}${normalizedPhone}`;

  const localHistoryPromise = queryLocalStoreHistory(normalizedPhone, options.excludeOrderId);

  let steadfast: SteadfastVerificationData;
  let pathao: PathaoVerificationData;
  let checkedAt = new Date().toISOString();
  let cached = false;

  if (!validMobile) {
    steadfast = emptySteadfast('invalid_phone', 'Invalid BD mobile format');
    pathao = emptyPathao('invalid_phone', 'Invalid BD mobile format');
  } else {
    const cachedExternal = !options.bypassCache
      ? await cacheGet<CachedExternalCouriers>(cacheKey)
      : null;

    if (cachedExternal) {
      steadfast = cachedExternal.steadfast;
      pathao = cachedExternal.pathao;
      checkedAt = cachedExternal.checkedAt;
      cached = true;
    } else {
      const [sfOutcome, pathaoOutcome] = await Promise.allSettled([
        querySteadfastFraudScore(normalizedPhone, timeoutMs),
        queryPathaoSuccessRate(normalizedPhone, timeoutMs),
      ]);

      steadfast =
        sfOutcome.status === 'fulfilled'
          ? sfOutcome.value
          : emptySteadfast('error', String(sfOutcome.reason));

      pathao =
        pathaoOutcome.status === 'fulfilled'
          ? pathaoOutcome.value
          : emptyPathao('error', String(pathaoOutcome.reason));

      checkedAt = new Date().toISOString();

      if (steadfast.status === 'ok' || pathao.status === 'ok') {
        await cacheSet<CachedExternalCouriers>(
          cacheKey,
          { checkedAt, steadfast, pathao },
          COURIER_CACHE_TTL_SECONDS
        );
      }
    }
  }

  const storeHistory = await localHistoryPromise;
  const computed = computeInformationalRiskScore(storeHistory, steadfast, pathao);

  const details: CustomerFraudRiskDetails = {
    totalOrders: storeHistory.totalOrders,
    deliveredCount: storeHistory.deliveredCount,
    cancelledCount: storeHistory.cancelledCount,
    returnedCount: storeHistory.returnedCount,
    successRate: storeHistory.successRate ?? 100,
    riskReason: computed.reason,
    steadfastHistory:
      steadfast.status === 'ok'
        ? {
            total_parcels: steadfast.totalParcels,
            delivered_parcels: steadfast.deliveredCount,
            cancelled_parcels: steadfast.cancelledCount,
            delivery_ratio: steadfast.deliveryRatio,
            cancellation_ratio: steadfast.cancellationRatio,
            return_ratio: steadfast.returnRatio,
            volume_range: steadfast.volumeRange,
            volume_band: steadfast.volumeBand,
            total_reports: steadfast.totalReports,
          }
        : null,
    version: 2,
    normalizedPhone,
    checkedAt,
    cached,
    steadfast,
    pathao,
    storeHistory,
  };

  return {
    phone,
    normalizedPhone,
    fraudRiskScore: computed.score,
    fraudRiskLevel: computed.level,
    details,
  };
}
