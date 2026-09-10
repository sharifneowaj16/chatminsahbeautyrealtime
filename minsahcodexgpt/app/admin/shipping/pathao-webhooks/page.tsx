'use client';



import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Copy, Loader2, Package, RefreshCw } from 'lucide-react';
import { PERMISSIONS, useAdminAuth } from '@/contexts/AdminAuthContext';

type PathaoWebhookEvent = {
  id: string;
  eventType: string;
  orderRef: string | null;
  consignmentId: string | null;
  hasSignature: boolean;
  processingStatus: string;
  receivedAt: string;
  processedAt: string | null;
  orderId: string | null;
  orderNumber: string | null;
  error: string | null;
};

type PathaoConfigStatus = {
  callbackUrl: string;
  baseUrl: string;
  credentialsConfigured: boolean;
  storeConfigured: boolean;
  webhookSecretConfigured: boolean;
  integrationSecretConfigured: boolean;
  requiredIntegrationSecret: string | null;
  test?: {
    ok: boolean;
    status?: number;
    headerMatched?: boolean;
    error?: string;
  };
};

const REQUIRED_EVENTS = [
  'Order Created',
  'Order Updated',
  'Pickup Requested',
  'Assigned For Pickup',
  'Pickup',
  'Pickup Failed',
  'Pickup Cancelled',
  'At the Sorting Hub',
  'In Transit',
  'Received at Last Mile Hub',
  'Assigned for Delivery',
  'Delivered',
  'Partial Delivery',
  'Return',
  'Delivery Failed',
  'On Hold',
  'Payment Invoice',
  'Paid Return',
  'Exchange',
  'Store Created',
  'Store Updated',
  'Return Id Created',
  'Return In Transit',
  'Returned To Merchant',
];

export default function PathaoWebhooksPage() {
  const { hasPermission, isLoading } = useAdminAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [events, setEvents] = useState<PathaoWebhookEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [configStatus, setConfigStatus] = useState<PathaoConfigStatus | null>(null);
  const [testing, setTesting] = useState(false);

  const callbackUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/api/webhooks/pathao';
    return `${window.location.origin}/api/webhooks/pathao`;
  }, []);

  const loadPage = useCallback(
    async (opts: { append: boolean; cursor?: string | null }) => {
      setError(null);
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: '40' });
        if (statusFilter) params.set('status', statusFilter);
        if (opts.cursor) params.set('cursor', opts.cursor);

        const res = await fetch(`/api/admin/shipping/pathao/webhook-events?${params}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const data = (await res.json()) as {
          events?: PathaoWebhookEvent[];
          nextCursor?: string | null;
          error?: string;
        };
        if (!res.ok) {
          setError(data.error ?? 'Failed to load Pathao webhook events');
          return;
        }

        setEvents((prev) => (opts.append ? [...prev, ...(data.events ?? [])] : data.events ?? []));
        setNextCursor(data.nextCursor ?? null);
      } catch {
        setError('Network error while loading Pathao webhook events');
      } finally {
        setLoading(false);
      }
    },
    [statusFilter]
  );

  const loadConfigStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/shipping/pathao/webhook-test', {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = (await res.json()) as PathaoConfigStatus;
      if (res.ok) setConfigStatus(data);
    } catch {
      // The setup panel still shows static values if this fails.
    }
  }, []);

  useEffect(() => {
    if (isLoading || !hasPermission(PERMISSIONS.ORDERS_VIEW)) return;
    void loadPage({ append: false });
    void loadConfigStatus();
  }, [hasPermission, isLoading, loadConfigStatus, loadPage]);

  const runIntegrationTest = async () => {
    setTesting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/shipping/pathao/webhook-test', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      });
      const data = (await res.json()) as PathaoConfigStatus;
      setConfigStatus(data);
      if (!res.ok || !data.test?.ok) {
        setError(data.test?.error ?? 'Pathao integration test did not return the required 202/header response.');
      }
    } catch {
      setError('Network error while testing Pathao webhook integration');
    } finally {
      setTesting(false);
    }
  };

  const copyCallback = () => {
    navigator.clipboard.writeText(callbackUrl).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  if (!isLoading && !hasPermission(PERMISSIONS.ORDERS_VIEW)) {
    return <div className="p-8 text-[#8a8f98]">You do not have permission to view Pathao webhooks.</div>;
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#F7F8F8]">Pathao webhooks</h1>
            <p className="mt-1 text-sm text-[#8A8F98]">Webhook setup requirements and recent Pathao callback events.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-[#232636] bg-[#161824] text-[#F7F8F8] px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="PROCESSED">Processed</option>
              <option value="NO_ORDER_FOUND">No order match</option>
              <option value="NO_ORDER_REF">No order reference</option>
              <option value="FAILED">Failed</option>
              <option value="IGNORED">Ignored</option>
              <option value="RECEIVED">Received</option>
            </Select>
            <Button
              type="button"
              onClick={() => void loadPage({ append: false })}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-[#232636] bg-[#161824] px-4 py-2 text-sm font-medium text-[#F7F8F8] hover:bg-[#1b1e2c] disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-[#232636] bg-[#161824] p-4 shadow-sm lg:col-span-2">
            <h2 className="text-sm font-semibold text-[#F7F8F8]">Merchant panel setup</h2>
            <div className="mt-4 space-y-3 text-sm text-[#8A8F98]">
              <div>
                <p className="font-medium text-[#F7F8F8]">Callback URL</p>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="flex-1 rounded-lg bg-[#10121b] border border-[#232636] px-3 py-2 text-xs text-[#F7F8F8]">{configStatus?.callbackUrl ?? callbackUrl}</code>
                  <Button
                    type="button"
                    onClick={copyCallback}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] px-3 py-2 text-xs font-semibold text-white hover:bg-white/90"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
              <p>Webhook secret in Pathao merchant panel must match server env <code className="rounded bg-[#10121b] border border-[#232636] px-1 text-[#F7F8F8]">PATHAO_WEBHOOK_SECRET</code>.</p>
              <p>Integration test must receive <code className="rounded bg-[#10121b] border border-[#232636] px-1 text-[#F7F8F8]">202</code> and header <code className="rounded bg-[#10121b] border border-[#232636] px-1 text-[#F7F8F8]">X-Pathao-Merchant-Webhook-Integration-Secret</code>.</p>
              {configStatus?.requiredIntegrationSecret ? (
                <p>Required integration header value: <code className="rounded bg-[#10121b] border border-[#232636] px-1 text-[#F7F8F8]">{configStatus.requiredIntegrationSecret}</code></p>
              ) : (
                <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-rose-400">Set <code>PATHAO_WEBHOOK_INTEGRATION_SECRET</code> before running the merchant integration test.</p>
              )}
              <Button
                type="button"
                onClick={runIntegrationTest}
                disabled={testing}
                className="inline-flex items-center gap-2 rounded-lg bg-[rgba(255,255,255,0.08)] border border-white/[0.15] px-4 py-2 text-xs font-semibold text-[#F7F8F8] hover:bg-[rgba(255,255,255,0.15)] disabled:opacity-60"
              >
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Test Webhook Integration
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-blue-900/50 bg-blue-950/20 p-4 text-sm text-blue-200">
            <div className="flex items-start gap-2">
              <Package className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-semibold">Production checklist</p>
                <p className="mt-2">API URL: <code className="rounded bg-[#10121b] border border-[#232636] px-1 text-[#F7F8F8]">{configStatus?.baseUrl ?? 'https://api-hermes.pathao.com'}</code></p>
                <p className="mt-2">If logs fail to load, run pending Prisma migrations on the live database.</p>
                <div className="mt-3 space-y-1 text-xs">
                  <p>{configStatus?.credentialsConfigured ? 'OK' : 'Missing'}: Pathao credentials</p>
                  <p>{configStatus?.storeConfigured ? 'OK' : 'Missing'}: PATHAO_STORE_ID</p>
                  <p>{configStatus?.webhookSecretConfigured ? 'OK' : 'Missing'}: PATHAO_WEBHOOK_SECRET</p>
                  {configStatus?.test && (
                    <p>{configStatus.test.ok ? 'OK' : 'Failed'}: Integration test {configStatus.test.status ? `(${configStatus.test.status})` : ''}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#232636] bg-[#161824] p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#F7F8F8]">Pathao events to select</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {REQUIRED_EVENTS.map((event) => (
              <span key={event} className="rounded-full bg-[#10121b] border border-[#232636] px-2.5 py-1 text-xs font-medium text-[#8A8F98]">
                {event}
              </span>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-[#232636] bg-[#161824] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#232636] text-sm">
              <thead className="bg-[#10121b]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[#8A8F98]">Received</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#8A8F98]">Event</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#8A8F98]">Order</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#8A8F98]">Consignment</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#8A8F98]">Signature</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#8A8F98]">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232636]">
                {events.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-[#8A8F98]">
                      No Pathao webhook events yet.
                    </td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr key={event.id} className="hover:bg-[#1b1e2c]/70 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 text-[#8A8F98]">{new Date(event.receivedAt).toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#F7F8F8]">{event.eventType}</td>
                      <td className="px-4 py-3">
                        {event.orderNumber ? (
                          <Link href={`/admin/orders?search=${encodeURIComponent(event.orderNumber)}`} className="font-mono text-white hover:text-[#FFFFFF] hover:underline">
                            {event.orderNumber}
                          </Link>
                        ) : (
                          <span className="font-mono text-xs text-[#8A8F98]">{event.orderRef ?? '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#8A8F98]">{event.consignmentId ?? '-'}</td>
                      <td className="px-4 py-3 text-[#F7F8F8]">{event.hasSignature ? 'Present' : 'Missing'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          event.processingStatus === 'PROCESSED'
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : event.processingStatus === 'FAILED'
                              ? 'bg-red-100 text-rose-300'
                              : event.processingStatus === 'NO_ORDER_FOUND' || event.processingStatus === 'NO_ORDER_REF'
                                ? 'bg-amber-500/10 text-amber-900'
                                : 'bg-[#10121b] text-[#d0d6e0]'
                        }`}>
                          {event.processingStatus === 'PROCESSED' && <CheckCircle2 className="h-3 w-3" />}
                          {event.processingStatus}
                        </span>
                        {event.error && <p className="mt-1 line-clamp-2 text-xs text-red-600">{event.error}</p>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {nextCursor && (
          <div className="flex justify-center">
            <Button
              type="button"
              disabled={loading}
              onClick={() => void loadPage({ append: true, cursor: nextCursor })}
              className="rounded-lg bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] px-4 py-2 text-sm font-medium text-white hover:bg-white/90 disabled:opacity-50"
            >
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
