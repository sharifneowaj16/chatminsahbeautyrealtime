'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DatabaseZap,
  ExternalLink,
  Lock,
  RefreshCw,
  RotateCcw,
  ServerCrash,
  ShieldAlert,
  ReceiptText,
  SearchCheck,
  ShoppingBag,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

type HealthStatus = 'OK' | 'WARN' | 'CRITICAL';

type TrackingIssue = {
  code: string;
  severity: HealthStatus;
  message: string;
  value?: number | string;
  expected?: number;
  actual?: number;
};

type TrackingSnapshot = {
  status: HealthStatus;
  windowHours: number;
  since: string;
  until: string;
  metrics: {
    ordersCreated: number;
    codPhoneConfirmed: number;
    onlinePaid: number;
    expectedMetaPurchases: number;
    metaPurchaseSent: number;
    gaPurchaseSent: number;
    capiFailures: number;
    capiFinalFailures: number;
    tokenInvalidFailures: number;
    pendingMetaPurchaseOrders: number;
    pendingGaPurchaseOrders: number;
    gaFailures: number;
    gaFinalFailures: number;
    gaRefundEligible: number;
    gaRefundSent: number;
    pendingGaRefundOrders: number;
    gaClientIdMissingOrders: number;
    gaClientIdMissingRate: number;
    referralExclusionsVerified: boolean;
    recentFailureCount: number;
  };
  queue: {
    waiting: number;
    active: number;
    delayed: number;
    failed: number;
    completed: number;
    paused: number;
    waitingChildren: number;
    unknown?: boolean;
    error?: string;
  };
  issues: TrackingIssue[];
  notes: string;
};

type FailureRow = {
  id: string;
  orderId: string | null;
  eventName: string;
  eventId: string | null;
  provider: string;
  statusCode: number | null;
  errorCode: string | null;
  errorSubcode: string | null;
  errorMessage: string | null;
  retryCount: number;
  finalFailed: boolean;
  hasFbp: boolean;
  hasFbc: boolean;
  hasExternalId: boolean;
  hasEmailHash: boolean;
  hasPhoneHash: boolean;
  hasIp: boolean;
  hasUa: boolean;
  createdAt: string;
  updatedAt: string;
};

type HistoryRow = {
  id: string;
  checkDate: string;
  status: HealthStatus;
  ordersCreated: number;
  ordersConfirmed: number;
  metaPurchaseSent: number;
  gaPurchaseSent: number;
  capiFailureCount: number;
  notes: string | null;
  createdAt: string;
};


type Ga4QaSnapshot = {
  ok: boolean;
  windowHours: number;
  env: {
    hasMeasurementId: boolean;
    hasApiSecret: boolean;
    referralExclusionsVerified: boolean;
  };
  metrics: {
    expectedPurchases: number;
    gaPurchaseSent: number;
    missingGaClientOrders: number;
    gaClientMissingRate: number;
    gaFailureCount: number;
    gaFinalFailureCount: number;
    gaRefundEligible: number;
    gaRefundSent: number;
    gaRefundPending: number;
    codCancelledRefundRisk: number;
  };
  referralConfig: {
    verified: boolean;
    flattenedDomains: string[];
    instructions: string[];
    domains: Array<{ gateway: string; domains: string[]; note?: string }>;
  };
  refundPendingOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string | null;
    total: number;
    refundAmount: number;
    refundedAt: string | null;
    updatedAt: string;
  }>;
  recentMissingGaClientOrders: Array<{
    id: string;
    orderNumber: string;
    paymentMethod: string | null;
    paymentStatus: string;
    total: number;
    createdAt: string;
  }>;
  issues: string[];
};


type PrivacyCatalogQaSnapshot = {
  ok: boolean;
  checkedAt: string;
  env: {
    privacyPolicyUrl: string;
    privacyContactEmailConfigured: boolean;
    trackingDisclosureVerified: boolean;
    cookieDisclosureVerified: boolean;
    consentModeRequired: boolean;
    consentModeVerified: boolean;
    clarityEnabled: boolean;
    clarityProjectConfigured: boolean;
    clarityMaskingVerified: boolean;
    metaCatalogConnected: boolean;
    metaCatalogQaVerified: boolean;
  };
  metrics: {
    activeProducts: number;
    productsScanned: number;
    catalogIssueProducts: number;
    criticalCatalogIssueProducts: number;
    missingImageProducts: number;
    missingCanonicalUrlProducts: number;
    canonicalHostMismatchProducts: number;
    missingSkuProducts: number;
    missingPriceProducts: number;
    activeOutOfStockProducts: number;
    variantProducts: number;
    variantMappingRiskProducts: number;
  };
  catalogIssueRows: Array<{
    id: string;
    name: string;
    slug: string;
    sku: string | null;
    contentId: string;
    price: number;
    salePrice: number | null;
    quantity: number;
    variantCount: number;
    defaultImageUrl: string | null;
    canonicalUrl: string | null;
    issues: string[];
    severity: 'WARN' | 'CRITICAL';
  }>;
  issues: string[];
  instructions: string[];
};

type ApiResponse = {
  ok: boolean;
  snapshot: TrackingSnapshot;
  failures: FailureRow[];
  history: HistoryRow[];
  ga4Qa?: Ga4QaSnapshot | null;
  privacyCatalogQa?: PrivacyCatalogQaSnapshot | null;
};

function statusClasses(status: HealthStatus) {
  if (status === 'OK') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'WARN') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

function statusIcon(status: HealthStatus) {
  if (status === 'OK') return <CheckCircle2 className="h-5 w-5" />;
  if (status === 'WARN') return <AlertTriangle className="h-5 w-5" />;
  return <XCircle className="h-5 w-5" />;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Dhaka',
  }).format(new Date(value));
}

function MetricCard({
  title,
  value,
  subtitle,
  tone = 'neutral',
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
}) {
  const toneClass = {
    neutral: 'border-gray-200 bg-white',
    good: 'border-emerald-200 bg-emerald-50',
    warn: 'border-amber-200 bg-amber-50',
    bad: 'border-red-200 bg-red-50',
  }[tone];

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-gray-500">{subtitle}</p> : null}
    </div>
  );
}

function SignalPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
      {label}
    </span>
  );
}

export default function TrackingHealthPage() {
  const { user, isLoading: authLoading } = useAdminAuth();
  const [hours, setHours] = useState(24);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [retryingFailureId, setRetryingFailureId] = useState<string | null>(null);
  const [selectedFailure, setSelectedFailure] = useState<FailureRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canView = user?.role === 'SUPER_ADMIN';

  const loadHealth = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    setError(null);

    try {
      const [healthResponse, ga4QaResponse, privacyCatalogQaResponse] = await Promise.all([
        fetch(`/api/admin/tracking-health?hours=${hours}`, {
          cache: 'no-store',
          credentials: 'include',
        }),
        fetch(`/api/admin/tracking/ga4-qa?hours=${hours}`, {
          cache: 'no-store',
          credentials: 'include',
        }),
        fetch('/api/admin/tracking/privacy-catalog-qa?limit=50', {
          cache: 'no-store',
          credentials: 'include',
        }),
      ]);

      if (!healthResponse.ok) {
        throw new Error(`Failed to load tracking health (${healthResponse.status})`);
      }

      const json = (await healthResponse.json()) as ApiResponse;
      if (ga4QaResponse.ok) {
        const ga4QaJson = (await ga4QaResponse.json()) as { snapshot?: Ga4QaSnapshot };
        json.ga4Qa = ga4QaJson.snapshot ?? null;
      }
      if (privacyCatalogQaResponse.ok) {
        const privacyCatalogQaJson = (await privacyCatalogQaResponse.json()) as { snapshot?: PrivacyCatalogQaSnapshot };
        json.privacyCatalogQa = privacyCatalogQaJson.snapshot ?? null;
      }
      setData(json);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load tracking health');
    } finally {
      setIsLoading(false);
    }
  }, [canView, hours]);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  const runManualCheck = async () => {
    setIsRunningCheck(true);
    setNotice(null);
    setError(null);

    try {
      const response = await fetch('/api/admin/tracking-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'run_check', hours, sendAlert: false }),
      });

      if (!response.ok) {
        throw new Error(`Manual health check failed (${response.status})`);
      }

      setNotice('Manual health check saved.');
      await loadHealth();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Manual health check failed');
    } finally {
      setIsRunningCheck(false);
    }
  };

  const retryFailure = async (failure: FailureRow) => {
    if (!failure.orderId) {
      setError('This failure row has no order ID, so it cannot be retried from the dashboard.');
      return;
    }

    const confirmed = window.confirm(`Queue tracking retry for order ${failure.orderId}? This will not mark the order as sent unless Meta/GA4 accepts the event.`);
    if (!confirmed) return;

    setRetryingFailureId(failure.id);
    setNotice(null);
    setError(null);

    try {
      const response = await fetch('/api/admin/tracking-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'retry_order_tracking',
          failureId: failure.id,
          orderId: failure.orderId,
        }),
      });

      const json = (await response.json()) as { ok?: boolean; message?: string; error?: string };

      if (!response.ok || !json.ok) {
        throw new Error(json.error || `Retry failed (${response.status})`);
      }

      setNotice(json.message || 'Retry queued.');
      await loadHealth();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : 'Retry failed');
    } finally {
      setRetryingFailureId(null);
    }
  };

  const snapshot = data?.snapshot;

  const purchaseGap = useMemo(() => {
    if (!snapshot) return 0;
    return snapshot.metrics.expectedMetaPurchases - snapshot.metrics.metaPurchaseSent;
  }, [snapshot]);

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Checking admin permission...</p>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex h-64 items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <Lock className="mx-auto mb-3 h-8 w-8 text-amber-600" />
          <h1 className="text-lg font-bold text-amber-900">Super Admin only</h1>
          <p className="mt-2 text-sm text-amber-700">Tracking health includes failure details and retry controls, so this page is restricted to SUPER_ADMIN users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tracking Health Dashboard</h1>
          <p className="text-gray-600">Meta CAPI, GA4 purchase, retry queue, and failure monitoring.</p>
          <p className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            <Lock className="mr-1 h-3 w-3" /> SUPER_ADMIN access only
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={hours}
            onChange={(event) => setHours(Number(event.target.value))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value={6}>Last 6 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={72}>Last 3 days</option>
            <option value={168}>Last 7 days</option>
            <option value={720}>Last 30 days</option>
          </select>
          <button
            onClick={() => void loadHealth()}
            disabled={isLoading}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => void runManualCheck()}
            disabled={isRunningCheck}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <DatabaseZap className={`mr-2 h-4 w-4 ${isRunningCheck ? 'animate-pulse' : ''}`} />
            Run Check
          </button>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {notice ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</div> : null}

      {isLoading && !snapshot ? (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-500">Loading tracking health...</div>
      ) : null}

      {snapshot ? (
        <>
          <div className={`rounded-xl border p-5 ${statusClasses(snapshot.status)}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                {statusIcon(snapshot.status)}
                <div>
                  <h2 className="text-lg font-bold">Status: {snapshot.status}</h2>
                  <p className="mt-1 text-sm">{snapshot.notes}</p>
                </div>
              </div>
              <div className="text-sm">
                <p>Window: {snapshot.windowHours}h</p>
                <p>Checked: {formatDateTime(snapshot.until)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Expected Purchases" value={snapshot.metrics.expectedMetaPurchases} subtitle="COD phone confirmed + online paid" />
            <MetricCard
              title="Meta Purchase Sent"
              value={snapshot.metrics.metaPurchaseSent}
              subtitle={purchaseGap > 0 ? `${purchaseGap} pending/gap` : 'Matches expected window'}
              tone={purchaseGap > 0 ? 'warn' : 'good'}
            />
            <MetricCard
              title="GA4 Purchase Sent"
              value={snapshot.metrics.gaPurchaseSent}
              subtitle={`${snapshot.metrics.pendingGaPurchaseOrders} pending GA4 order(s)`}
              tone={snapshot.metrics.pendingGaPurchaseOrders > 0 ? 'warn' : 'good'}
            />
            <MetricCard
              title="CAPI Failures"
              value={snapshot.metrics.capiFailures}
              subtitle={`${snapshot.metrics.capiFinalFailures} final / ${snapshot.metrics.tokenInvalidFailures} token-related`}
              tone={snapshot.metrics.capiFinalFailures > 0 ? 'bad' : snapshot.metrics.capiFailures > 0 ? 'warn' : 'good'}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Orders Created" value={snapshot.metrics.ordersCreated} />
            <MetricCard title="COD Phone Confirmed" value={snapshot.metrics.codPhoneConfirmed} />
            <MetricCard title="Online Paid" value={snapshot.metrics.onlinePaid} />
            <MetricCard title="Pending Meta Orders" value={snapshot.metrics.pendingMetaPurchaseOrders} tone={snapshot.metrics.pendingMetaPurchaseOrders > 0 ? 'warn' : 'good'} />
          </div>

          {data?.ga4Qa ? (
            <div className="rounded-xl border bg-white p-5">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="flex items-center text-lg font-bold text-gray-900">
                    <ReceiptText className="mr-2 h-5 w-5 text-purple-600" />
                    GA4 Purchase / Refund / Referral QA
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">Measurement Protocol env, client ID capture, refund events, and payment gateway referral exclusions.</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${data.ga4Qa.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {data.ga4Qa.ok ? 'GA4 QA OK' : 'Needs QA'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="GA4 Env" value={data.ga4Qa.env.hasMeasurementId && data.ga4Qa.env.hasApiSecret ? 'Ready' : 'Missing'} subtitle="Measurement ID + MP API secret" tone={data.ga4Qa.env.hasMeasurementId && data.ga4Qa.env.hasApiSecret ? 'good' : 'bad'} />
                <MetricCard title="Missing GA Client ID" value={data.ga4Qa.metrics.missingGaClientOrders} subtitle={`${Math.round(data.ga4Qa.metrics.gaClientMissingRate * 100)}% of expected purchases`} tone={data.ga4Qa.metrics.gaClientMissingRate >= 0.3 ? 'warn' : 'good'} />
                <MetricCard title="GA4 Refund Pending" value={data.ga4Qa.metrics.gaRefundPending} subtitle={`${data.ga4Qa.metrics.gaRefundSent} sent / ${data.ga4Qa.metrics.gaRefundEligible} eligible`} tone={data.ga4Qa.metrics.gaRefundPending > 0 ? 'warn' : 'good'} />
                <MetricCard title="Referral Exclusions" value={data.ga4Qa.env.referralExclusionsVerified ? 'Verified' : 'Not verified'} subtitle="bKash/SSLCommerz/Nagad etc." tone={data.ga4Qa.env.referralExclusionsVerified ? 'good' : 'warn'} />
              </div>

              {data.ga4Qa.issues.length ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <p className="mb-2 font-semibold">GA4 QA issues</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {data.ga4Qa.issues.map((issue) => <li key={issue}>{issue}</li>)}
                  </ul>
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold text-gray-900">Payment gateway referral domains</h3>
                  <p className="mt-1 text-xs text-gray-500">Add exact production redirect hosts to GA4 unwanted referrals, then set GA4_PAYMENT_REFERRAL_EXCLUSIONS_VERIFIED=true.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {data.ga4Qa.referralConfig.flattenedDomains.map((domain) => (
                      <span key={domain} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{domain}</span>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold text-gray-900">Pending GA4 refund events</h3>
                  {data.ga4Qa.refundPendingOrders.length ? (
                    <div className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
                      {data.ga4Qa.refundPendingOrders.slice(0, 8).map((order) => (
                        <a key={order.id} href={`/admin/orders/${order.id}`} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 hover:bg-gray-100">
                          <span className="font-medium text-blue-700">{order.orderNumber}</span>
                          <span className="text-gray-600">৳{order.refundAmount.toLocaleString()}</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">No pending GA4 refund event found.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {data?.privacyCatalogQa ? (
            <div className="rounded-xl border bg-white p-5">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="flex items-center text-lg font-bold text-gray-900">
                    <SearchCheck className="mr-2 h-5 w-5 text-emerald-600" />
                    Privacy / Clarity / Meta Catalog QA
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">Tracking disclosure, Clarity masking, and product catalog readiness for dynamic ads.</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${data.privacyCatalogQa.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {data.privacyCatalogQa.ok ? 'Privacy/Catalog OK' : 'Needs QA'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Privacy Disclosure"
                  value={data.privacyCatalogQa.env.trackingDisclosureVerified && data.privacyCatalogQa.env.cookieDisclosureVerified ? 'Verified' : 'Not verified'}
                  subtitle="Meta/CAPI/GA4/Clarity disclosure"
                  tone={data.privacyCatalogQa.env.trackingDisclosureVerified && data.privacyCatalogQa.env.cookieDisclosureVerified ? 'good' : 'warn'}
                />
                <MetricCard
                  title="Clarity Masking"
                  value={data.privacyCatalogQa.env.clarityEnabled ? (data.privacyCatalogQa.env.clarityMaskingVerified ? 'Verified' : 'Needs QA') : 'Disabled'}
                  subtitle={data.privacyCatalogQa.env.clarityProjectConfigured ? 'Project ID configured' : 'Project ID missing'}
                  tone={!data.privacyCatalogQa.env.clarityEnabled || data.privacyCatalogQa.env.clarityMaskingVerified ? 'good' : 'warn'}
                />
                <MetricCard
                  title="Catalog QA"
                  value={data.privacyCatalogQa.env.metaCatalogQaVerified ? 'Verified' : 'Not verified'}
                  subtitle={`${data.privacyCatalogQa.metrics.activeProducts} active products`}
                  tone={data.privacyCatalogQa.env.metaCatalogQaVerified ? 'good' : 'warn'}
                />
                <MetricCard
                  title="Catalog Issues"
                  value={data.privacyCatalogQa.metrics.catalogIssueProducts}
                  subtitle={`${data.privacyCatalogQa.metrics.criticalCatalogIssueProducts} critical`}
                  tone={data.privacyCatalogQa.metrics.criticalCatalogIssueProducts > 0 ? 'bad' : data.privacyCatalogQa.metrics.catalogIssueProducts > 0 ? 'warn' : 'good'}
                />
              </div>

              {data.privacyCatalogQa.issues.length ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <p className="mb-2 font-semibold">Privacy/catalog QA issues</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {data.privacyCatalogQa.issues.map((issue) => <li key={issue}>{issue}</li>)}
                  </ul>
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold text-gray-900">Verification gates</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SignalPill label="Tracking disclosure" ok={data.privacyCatalogQa.env.trackingDisclosureVerified} />
                    <SignalPill label="Cookie disclosure" ok={data.privacyCatalogQa.env.cookieDisclosureVerified} />
                    <SignalPill label="Consent mode" ok={!data.privacyCatalogQa.env.consentModeRequired || data.privacyCatalogQa.env.consentModeVerified} />
                    <SignalPill label="Meta Catalog connected" ok={data.privacyCatalogQa.env.metaCatalogConnected} />
                    <SignalPill label="Catalog QA verified" ok={data.privacyCatalogQa.env.metaCatalogQaVerified} />
                  </div>
                  <a
                    href={data.privacyCatalogQa.env.privacyPolicyUrl}
                    className="mt-4 inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-900"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open privacy policy <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="flex items-center font-semibold text-gray-900">
                    <ShoppingBag className="mr-2 h-4 w-4 text-amber-600" />
                    Top catalog issue products
                  </h3>
                  {data.privacyCatalogQa.catalogIssueRows.length ? (
                    <div className="mt-3 max-h-56 space-y-2 overflow-y-auto text-sm">
                      {data.privacyCatalogQa.catalogIssueRows.slice(0, 8).map((product) => (
                        <a key={product.id} href={`/admin/products/${product.id}`} className="block rounded-lg bg-gray-50 px-3 py-2 hover:bg-gray-100">
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate font-medium text-blue-700">{product.name}</span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${product.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{product.severity}</span>
                          </div>
                          <p className="mt-1 truncate text-xs text-gray-500">{product.issues.join(' • ')}</p>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">No catalog issue found in scanned active products.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-xl border bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center text-lg font-bold text-gray-900">
                  <Activity className="mr-2 h-5 w-5 text-blue-600" />
                  Queue Status
                </h2>
                {snapshot.queue.unknown ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">Unknown</span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">Connected</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <MetricCard title="Waiting" value={snapshot.queue.waiting} />
                <MetricCard title="Active" value={snapshot.queue.active} />
                <MetricCard title="Delayed" value={snapshot.queue.delayed} />
                <MetricCard title="Failed" value={snapshot.queue.failed} tone={snapshot.queue.failed > 0 ? 'warn' : 'good'} />
              </div>
              {snapshot.queue.error ? <p className="mt-3 text-sm text-amber-700">{snapshot.queue.error}</p> : null}
            </div>

            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 flex items-center text-lg font-bold text-gray-900">
                <ShieldAlert className="mr-2 h-5 w-5 text-amber-600" />
                Active Issues
              </h2>
              {snapshot.issues.length === 0 ? (
                <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">No active tracking issue detected in this window.</p>
              ) : (
                <div className="space-y-3">
                  {snapshot.issues.map((issue) => (
                    <div key={issue.code} className={`rounded-lg border p-3 ${statusClasses(issue.severity)}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{issue.code}</p>
                        <span className="text-xs font-bold">{issue.severity}</span>
                      </div>
                      <p className="mt-1 text-sm">{issue.message}</p>
                      {typeof issue.expected === 'number' || typeof issue.actual === 'number' ? (
                        <p className="mt-1 text-xs">Expected: {issue.expected ?? '-'} / Actual: {issue.actual ?? '-'}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center text-lg font-bold text-gray-900">
                <ServerCrash className="mr-2 h-5 w-5 text-red-600" />
                Recent Meta/GA4 Failures
              </h2>
              <span className="text-sm text-gray-500">Latest {data?.failures.length ?? 0}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Time</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Event</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Order</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Status</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Signals</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Error</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {data?.failures.length ? (
                    data.failures.map((failure) => (
                      <tr key={failure.id} className="align-top">
                        <td className="whitespace-nowrap px-3 py-3 text-gray-600">{formatDateTime(failure.createdAt)}</td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedFailure(failure)}
                            className="font-medium text-blue-700 hover:text-blue-900"
                          >
                            {failure.provider}:{failure.eventName}
                          </button>
                          <p className="max-w-[220px] truncate text-xs text-gray-500">{failure.eventId || 'No event_id'}</p>
                        </td>
                        <td className="px-3 py-3 text-gray-700">
                          {failure.orderId ? (
                            <a
                              href={`/admin/orders/${failure.orderId}`}
                              className="inline-flex items-center text-blue-700 hover:text-blue-900"
                            >
                              {failure.orderId}
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${failure.finalFailed ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {failure.finalFailed ? 'Final failed' : 'Retrying/logged'}
                          </span>
                          <p className="mt-1 text-xs text-gray-500">HTTP {failure.statusCode ?? '-'} / retry {failure.retryCount}</p>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex max-w-[260px] flex-wrap gap-1">
                            <SignalPill label="fbp" ok={failure.hasFbp} />
                            <SignalPill label="fbc" ok={failure.hasFbc} />
                            <SignalPill label="ext" ok={failure.hasExternalId} />
                            <SignalPill label="em" ok={failure.hasEmailHash} />
                            <SignalPill label="ph" ok={failure.hasPhoneHash} />
                            <SignalPill label="ip" ok={failure.hasIp} />
                            <SignalPill label="ua" ok={failure.hasUa} />
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <p className="max-w-[320px] truncate font-medium text-gray-800">{failure.errorCode || 'No code'}</p>
                          <p className="max-w-[320px] truncate text-xs text-gray-500">{failure.errorMessage || 'No message'}</p>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedFailure(failure)}
                              className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Details
                            </button>
                            <button
                              onClick={() => void retryFailure(failure)}
                              disabled={!failure.orderId || retryingFailureId === failure.id}
                              className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <RotateCcw className={`mr-1 h-3 w-3 ${retryingFailureId === failure.id ? 'animate-spin' : ''}`} />
                              Retry
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-gray-500">No failure rows found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <h2 className="mb-4 flex items-center text-lg font-bold text-gray-900">
              <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
              Saved Health Check History
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Checked</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Status</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Orders</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Confirmed/Paid</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Meta</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">GA4</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Failures</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {data?.history.length ? (
                    data.history.map((row) => (
                      <tr key={row.id}>
                        <td className="whitespace-nowrap px-3 py-3 text-gray-600">
                          <span className="inline-flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            {formatDateTime(row.createdAt)}
                          </span>
                        </td>
                        <td className="px-3 py-3"><span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusClasses(row.status)}`}>{row.status}</span></td>
                        <td className="px-3 py-3 text-gray-700">{row.ordersCreated}</td>
                        <td className="px-3 py-3 text-gray-700">{row.ordersConfirmed}</td>
                        <td className="px-3 py-3 text-gray-700">{row.metaPurchaseSent}</td>
                        <td className="px-3 py-3 text-gray-700">{row.gaPurchaseSent}</td>
                        <td className="px-3 py-3 text-gray-700">{row.capiFailureCount}</td>
                        <td className="max-w-[420px] truncate px-3 py-3 text-gray-500">{row.notes || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-gray-500">No saved health checks yet. Click Run Check or configure cron.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {selectedFailure ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setSelectedFailure(null)}>
          <div
            className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Failure detail</h2>
                <p className="mt-1 text-sm text-gray-500">Safe debugging summary only. Raw PII/token payloads are not shown.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFailure(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="rounded-lg border bg-gray-50 p-4">
                <p className="font-semibold text-gray-900">{selectedFailure.provider}:{selectedFailure.eventName}</p>
                <p className="mt-1 break-all text-gray-600">Event ID: {selectedFailure.eventId || '-'}</p>
                <p className="mt-1 text-gray-600">Created: {formatDateTime(selectedFailure.createdAt)}</p>
                <p className="mt-1 text-gray-600">Updated: {formatDateTime(selectedFailure.updatedAt)}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MetricCard title="HTTP status" value={selectedFailure.statusCode ?? '-'} />
                <MetricCard title="Retry count" value={selectedFailure.retryCount} tone={selectedFailure.finalFailed ? 'bad' : 'warn'} />
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="mb-2 font-semibold text-gray-900">Matching signals</h3>
                <div className="flex flex-wrap gap-2">
                  <SignalPill label="fbp" ok={selectedFailure.hasFbp} />
                  <SignalPill label="fbc" ok={selectedFailure.hasFbc} />
                  <SignalPill label="external_id" ok={selectedFailure.hasExternalId} />
                  <SignalPill label="email hash" ok={selectedFailure.hasEmailHash} />
                  <SignalPill label="phone hash" ok={selectedFailure.hasPhoneHash} />
                  <SignalPill label="ip" ok={selectedFailure.hasIp} />
                  <SignalPill label="ua" ok={selectedFailure.hasUa} />
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="mb-2 font-semibold text-gray-900">Error</h3>
                <p className="text-gray-700">Code: {selectedFailure.errorCode || '-'}</p>
                <p className="text-gray-700">Subcode: {selectedFailure.errorSubcode || '-'}</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-gray-600">{selectedFailure.errorMessage || 'No message'}</p>
              </div>

              <div className="flex gap-3">
                {selectedFailure.orderId ? (
                  <a
                    href={`/admin/orders/${selectedFailure.orderId}`}
                    className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Open order
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => void retryFailure(selectedFailure)}
                  disabled={!selectedFailure.orderId || retryingFailureId === selectedFailure.id}
                  className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw className={`mr-2 h-4 w-4 ${retryingFailureId === selectedFailure.id ? 'animate-spin' : ''}`} />
                  Queue retry
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
