'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Lock,
  RefreshCw,
  Rocket,
  ServerCog,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

type DeployGateStatus = 'READY' | 'WARN' | 'BLOCKED';
type GateSeverity = 'PASS' | 'WARN' | 'BLOCKER';

type GateCheck = {
  code: string;
  label: string;
  severity: GateSeverity;
  message: string;
  category: 'environment' | 'queue_worker' | 'tracking_health' | 'privacy_catalog' | 'ga4_attribution' | 'manual_qa' | 'documentation';
  hint?: string;
  value?: number | string | boolean | null;
};

type ManualQaStep = {
  key: string;
  phase: string;
  title: string;
  expected: string;
  evidence: string;
  blocker: boolean;
  envKey: string;
  evidenceEnvKey: string;
  verified: boolean;
  evidenceUrl: string | null;
};

type ProductionQaSnapshot = {
  status: DeployGateStatus;
  checkedAt: string;
  windowHours: number;
  queue: {
    reachable: boolean;
    waiting: number;
    active: number;
    delayed: number;
    failed: number;
    completed: number;
    paused: number;
    waitingChildren: number;
    error?: string;
  };
  worker: {
    embeddedWorkersEnabled: boolean;
    startedInThisProcess: boolean;
    startedAt: string | null;
    lastHeartbeatAt: string | null;
    completedJobs: number;
    failedJobs: number;
    lastError: string | null;
    externalWorkerRequired: boolean;
  };
  latestHealthCheck: {
    id: string;
    status: string;
    notes: string | null;
    checkDate: string;
    createdAt: string;
    ageHours: number;
  } | null;
  liveTrackingHealth: {
    status: 'OK' | 'WARN' | 'CRITICAL';
    issues: Array<{ code: string; severity: 'OK' | 'WARN' | 'CRITICAL'; message: string }>;
    metrics: {
      expectedMetaPurchases: number;
      metaPurchaseSent: number;
      gaPurchaseSent: number;
      capiFailures: number;
      capiFinalFailures: number;
      pendingMetaPurchaseOrders: number;
      pendingGaPurchaseOrders: number;
      pendingGaRefundOrders: number;
    };
  };
  privacyCatalog: {
    ok: boolean;
    metrics: {
      activeProducts: number;
      catalogIssueProducts: number;
      criticalCatalogIssueProducts: number;
    };
    issues: string[];
  };
  checks: GateCheck[];
  manualQaSteps: ManualQaStep[];
  summary: {
    blockerCount: number;
    warningCount: number;
    passCount: number;
    deployMessage: string;
    manualQaTotal: number;
    manualQaRequired: number;
    manualQaRequiredVerified: number;
    manualQaMissingRequired: string[];
  };
};

type ApiResponse = {
  ok: boolean;
  snapshot: ProductionQaSnapshot;
  error?: string;
};

const categoryLabels: Record<GateCheck['category'], string> = {
  environment: 'Environment',
  queue_worker: 'Queue / Worker',
  tracking_health: 'Tracking Health',
  privacy_catalog: 'Privacy / Catalog',
  ga4_attribution: 'GA4 Attribution',
  manual_qa: 'Manual QA',
  documentation: 'Documentation',
};

function statusClass(status: DeployGateStatus) {
  if (status === 'READY') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'WARN') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-red-200 bg-red-50 text-red-800';
}

function severityClass(severity: GateSeverity) {
  if (severity === 'PASS') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (severity === 'WARN') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-red-200 bg-red-50 text-red-700';
}

function severityIcon(severity: GateSeverity) {
  if (severity === 'PASS') return <CheckCircle2 className="h-4 w-4" />;
  if (severity === 'WARN') return <AlertTriangle className="h-4 w-4" />;
  return <XCircle className="h-4 w-4" />;
}

function formatDateTime(value: string | null) {
  if (!value) return 'Not observed';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Dhaka',
  }).format(new Date(value));
}

function Metric({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {note ? <p className="mt-1 text-xs text-gray-500">{note}</p> : null}
    </div>
  );
}

export default function ProductionQaPage() {
  const { user, isLoading } = useAdminAuth();
  const [range, setRange] = useState(24);
  const [data, setData] = useState<ProductionQaSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const load = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/production-qa?hours=${range}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Failed to load production QA gate');
      }
      setData(payload.snapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, range]);

  useEffect(() => {
    void load();
  }, [load]);

  const groupedChecks = useMemo(() => {
    const groups = new Map<GateCheck['category'], GateCheck[]>();
    (data?.checks ?? []).forEach((check) => {
      const rows = groups.get(check.category) ?? [];
      rows.push(check);
      groups.set(check.category, rows);
    });
    return Array.from(groups.entries());
  }, [data]);

  if (isLoading) {
    return <div className="p-6 text-gray-600">Checking admin permissions...</div>;
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
          <div className="flex items-center text-lg font-bold"><Lock className="mr-2 h-5 w-5" /> SUPER_ADMIN required</div>
          <p className="mt-2 text-sm">Production QA deploy gate can expose sensitive infrastructure readiness. Ask a SUPER_ADMIN to run this gate.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center text-2xl font-bold text-gray-900">
            <Rocket className="mr-2 h-7 w-7 text-blue-600" /> Production QA Deploy Gate
          </h1>
          <p className="mt-1 text-sm text-gray-500">Final pre-deploy gate for tracking, queue/worker, GA4, privacy/catalog, cron, and manual flow QA.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[24, 168, 720].map((hours) => (
            <button
              key={hours}
              onClick={() => setRange(hours)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${range === hours ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700'}`}
            >
              {hours === 24 ? '24h' : hours === 168 ? '7d' : '30d'}
            </button>
          ))}
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      {data ? (
        <>
          <div className={`rounded-2xl border p-6 ${statusClass(data.status)}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-wide">Deploy gate status</div>
                <div className="mt-1 text-4xl font-black">{data.status}</div>
                <p className="mt-2 max-w-3xl text-sm">{data.summary.deployMessage}</p>
              </div>
              <div className="rounded-xl bg-white/70 p-4 text-sm">
                <p>Checked: {formatDateTime(data.checkedAt)}</p>
                <p>Window: {data.windowHours}h</p>
                <p>SUPER_ADMIN verified</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="Blockers" value={data.summary.blockerCount} note="Must be zero before deploy" />
            <Metric label="Warnings" value={data.summary.warningCount} note="Review before deploy" />
            <Metric label="Pass checks" value={data.summary.passCount} note="Readiness checks passing" />
            <Metric label="Manual QA" value={`${data.summary.manualQaRequiredVerified}/${data.summary.manualQaRequired}`} note="Required evidence flags verified" />
            <Metric label="Live health" value={data.liveTrackingHealth.status} note={`${data.liveTrackingHealth.issues.length} issue(s)`} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border bg-white p-5">
              <h2 className="flex items-center font-bold text-gray-900"><ServerCog className="mr-2 h-5 w-5 text-blue-600" /> Queue / Worker</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><dt>Queue reachable</dt><dd className="font-semibold">{data.queue.reachable ? 'Yes' : 'No'}</dd></div>
                <div className="flex justify-between"><dt>Waiting + delayed</dt><dd className="font-semibold">{data.queue.waiting + data.queue.delayed}</dd></div>
                <div className="flex justify-between"><dt>Failed retained</dt><dd className="font-semibold">{data.queue.failed}</dd></div>
                <div className="flex justify-between"><dt>Embedded worker</dt><dd className="font-semibold">{data.worker.startedInThisProcess ? 'Observed' : data.worker.externalWorkerRequired ? 'External required' : 'Not observed'}</dd></div>
                <div className="flex justify-between"><dt>Last heartbeat</dt><dd className="font-semibold text-right">{formatDateTime(data.worker.lastHeartbeatAt)}</dd></div>
              </dl>
            </div>

            <div className="rounded-xl border bg-white p-5">
              <h2 className="flex items-center font-bold text-gray-900"><Clock className="mr-2 h-5 w-5 text-amber-600" /> Cron / Health</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><dt>Latest saved check</dt><dd className="font-semibold">{data.latestHealthCheck ? data.latestHealthCheck.status : 'None'}</dd></div>
                <div className="flex justify-between"><dt>Age</dt><dd className="font-semibold">{data.latestHealthCheck ? `${Math.round(data.latestHealthCheck.ageHours * 10) / 10}h` : 'N/A'}</dd></div>
                <div className="flex justify-between"><dt>Meta Purchase sent</dt><dd className="font-semibold">{data.liveTrackingHealth.metrics.metaPurchaseSent}</dd></div>
                <div className="flex justify-between"><dt>GA4 Purchase sent</dt><dd className="font-semibold">{data.liveTrackingHealth.metrics.gaPurchaseSent}</dd></div>
                <div className="flex justify-between"><dt>CAPI final failures</dt><dd className="font-semibold">{data.liveTrackingHealth.metrics.capiFinalFailures}</dd></div>
              </dl>
            </div>

            <div className="rounded-xl border bg-white p-5">
              <h2 className="flex items-center font-bold text-gray-900"><ShieldCheck className="mr-2 h-5 w-5 text-emerald-600" /> Privacy / Catalog</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><dt>Status</dt><dd className="font-semibold">{data.privacyCatalog.ok ? 'OK' : 'Needs QA'}</dd></div>
                <div className="flex justify-between"><dt>Active products</dt><dd className="font-semibold">{data.privacyCatalog.metrics.activeProducts}</dd></div>
                <div className="flex justify-between"><dt>Catalog issues</dt><dd className="font-semibold">{data.privacyCatalog.metrics.catalogIssueProducts}</dd></div>
                <div className="flex justify-between"><dt>Critical issues</dt><dd className="font-semibold">{data.privacyCatalog.metrics.criticalCatalogIssueProducts}</dd></div>
              </dl>
              <a href="/admin/tracking-health" className="mt-4 inline-flex items-center text-sm font-semibold text-blue-700 hover:underline">
                Open tracking health <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <h2 className="text-lg font-bold text-gray-900">Deploy gate checks</h2>
            <div className="mt-4 space-y-5">
              {groupedChecks.map(([category, checks]) => (
                <div key={category}>
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">{categoryLabels[category]}</h3>
                  <div className="space-y-2">
                    {checks.map((check) => (
                      <div key={check.code} className={`rounded-lg border p-3 ${severityClass(check.severity)}`}>
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="flex items-center font-semibold">{severityIcon(check.severity)} <span className="ml-2">{check.label}</span></p>
                            <p className="mt-1 text-sm opacity-90">{check.message}</p>
                            {check.hint ? <p className="mt-1 text-xs opacity-80">Fix: {check.hint}</p> : null}
                          </div>
                          <code className="rounded bg-white/70 px-2 py-1 text-xs">{check.code}</code>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <h2 className="text-lg font-bold text-gray-900">Full Phase 8 QA matrix</h2>
            <p className="mt-1 text-sm text-gray-500">Required items must be tested in staging or controlled production mode and marked with their QA_* environment flag before final live deploy.</p>
            <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
              {data.manualQaSteps.map((step) => (
                <div key={step.key} className={`rounded-lg border p-4 ${step.blocker ? 'border-red-100 bg-red-50/40' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-gray-900">{step.title}</h3>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${step.verified ? 'bg-emerald-100 text-emerald-700' : step.blocker ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{step.verified ? 'Verified' : step.blocker ? 'Required' : 'Recommended'}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700"><strong>Expected:</strong> {step.expected}</p>
                  <p className="mt-1 text-sm text-gray-500"><strong>Evidence:</strong> {step.evidence}</p>
                  <p className="mt-2 rounded bg-white/70 px-2 py-1 font-mono text-xs text-gray-600">{step.envKey}=true</p>
                  {step.evidenceUrl ? <a href={step.evidenceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center text-xs font-semibold text-blue-700 hover:underline">Open evidence <ExternalLink className="ml-1 h-3 w-3" /></a> : <p className="mt-1 text-xs text-gray-400">Optional evidence URL env: {step.evidenceEnvKey}</p>}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : loading ? (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-600">Loading production QA gate...</div>
      ) : null}
    </div>
  );
}
