'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, BarChart3, CheckCircle2, Clock3, Database, FileClock,
  RefreshCw, RotateCcw, ShieldCheck, Users, Workflow, Siren, SearchCheck, Tags,
} from 'lucide-react';
import { adminFetchJson } from '@/lib/adminFetch';
import { Button } from '@/components/ui/Button';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import ProviderHealthPanel from './ProviderHealthPanel';
import MetaJobsPanel from './MetaJobsPanel';

type Counts = Record<string, number>;
type AdminFailure = { code: string; classification?: string; summary?: string; retryAt?: string; reconciliationRequired?: boolean } | null;
type FailureItem = {
  id: string; status: string; updatedAt: string; eventName?: string; eventId?: string; orderId?: string | null;
  queueName?: string; jobName?: string; externalJobId?: string | null; attempts: number;
  failure: AdminFailure;
};
type Summary = {
  checkedAt: string;
  health: { connection: string; openApprovals: number; failedCatalogItems: number; failedEvents: number; deadLetterJobs: number; overdueLeads: number };
  domains: { catalog: { items: Counts; batches: Counts }; events: Counts; jobs: Counts; leads: Counts; approvals: Counts; attribution: { windowDays: number; attributedOrders: number; totalOrders: number; coverage: number | null } };
  connection: null | { name: string; status: string; graphApiVersion: string; lastCheckedAt: string | null; lastSuccessfulAt: string | null; failure: AdminFailure };
  failures: { events: FailureItem[]; jobs: FailureItem[] };
  recentAudits: Audit[];
};
type Approval = {
  id: string; actionKey: string; risk: string; resourceType: string; resourceId: string | null; payload: Record<string, unknown>;
  reason: string; status: string; requestedAt: string; expiresAt: string;
  requestedBy: { id: string; name: string }; approvedBy?: { id: string; name: string } | null;
};
type Diagnostic = {
  id: string; catalogId: string; issueType: string; severity: string; title: string; description: string | null;
  affectedItemCount: number; status: string; correlationId: string | null; firstSeenAt: string; lastSeenAt: string; resolvedAt: string | null;
  items: Array<{ id: string; retailerId: string; providerItemId: string | null; status: string; firstSeenAt: string; lastSeenAt: string }>;
};
type Incident = {
  id: string; incidentType: string; severity: string; status: string; resourceType: string; resourceId: string | null; summary: string;
  correlationId: string | null; runbookUrl: string | null; occurrenceCount: number; firstSeenAt: string; lastSeenAt: string; cooldownUntil: string | null;
};
type TraceEvent = { source: string; resourceId: string; status: string; occurredAt: string; summary: string; details?: Record<string, unknown> | null };
type TraceResult = { correlationId: string; eventCount: number; events: TraceEvent[] };
type Audit = {
  id: string; actionKey: string; risk: string; resourceType: string; resourceId: string | null; outcome: string; reason: string | null;
  createdAt: string; actor: { id: string; name: string };
};
type AttributionCampaign = { sourceModel: 'FIRST_PARTY'; utmSource: string; utmMedium: string; utmCampaign: string; sessions: number; leads: number; orders: number; revenue: number; attributedOrders: number };
type AttributionReport = {
  generatedAt: string; windowDays: number;
  coverage: { totalOrders: number; attributedOrders: number; unattributedOrders: number; coverage: number | null; withFbp: number; withFbc: number; consentDenied: number; leadLinkedOrders: number };
  dataQuality: { total?: number; missingClickId?: number; missingFbp?: number; missingFirstTouch?: number; missingLastTouch?: number; consentDenied?: number };
  models: {
    firstParty: { label: string; comparable: false; rows: AttributionCampaign[] };
    metaReported: { label: string; comparable: false; rows: []; availability: string };
  };
};
type ProductSetRule = { combinator: 'AND' | 'OR'; conditions: Array<{ field: string; operator: string; value: string | number | boolean | Array<string | number | boolean> }> };
type ProductSet = {
  id: string; catalogId: string; name: string; slug: string; description: string | null; status: string; syncStatus: string;
  providerProductSetId: string | null; ruleVersion: number; ruleJson: ProductSetRule; ruleHash: string; membershipHash: string | null;
  memberCount: number; autoSync: boolean; previewedAt: string | null; previewExpiresAt: string | null; lastSyncAt: string | null;
  lastSucceededAt: string | null; updatedAt: string;
  versions: Array<{ id: string; version: number; memberCount: number; reason: string | null; createdAt: string }>;
  previews: Array<{ id: string; ruleVersion: number; membershipHash: string; memberCount: number; expiresAt: string; consumedAt: string | null }>;
};

type AdsSnapshot = {
  id: string; level: string; entityId: string; entityName: string | null; dateStart: string; dateStop: string;
  spend: number; impressions: number; clicks: number; ctr: number; cpc: number; purchases: number; purchaseValue: number; roas: number; frequency: number;
};
type AdsRecommendation = {
  id: string; entityType: string; entityId: string; entityName: string | null; type: string; status: string; severity: string; rationale: string; proposedMutation: Record<string, unknown>; expiresAt: string;
};
type AdsExecution = { id: string; operation: string; entityType: string; entityId: string | null; status: string; approvalId: string; startedAt: string; completedAt: string | null };
type AdsReport = {
  level: string;
  snapshots: AdsSnapshot[];
  recommendations: AdsRecommendation[];
  executions: AdsExecution[];
  summary: { spend: number; impressions: number; clicks: number; purchases: number; purchaseValue: number; ctr: number; cpc: number; roas: number };
  stability: { stable: boolean; successfulRuns: number; requiredSuccessfulRuns: number; latestCompletedAt: string | null; stale: boolean; reason: string };
  safetyCaps: { maxDailyBudgetBdt: number; maxLifetimeBudgetBdt: number; maxBidAmountBdt: number; maxBudgetIncreasePercent: number };
};
type Tab = 'overview' | 'connection' | 'catalog' | 'product-sets' | 'ads' | 'instagram' | 'diagnostics' | 'incidents' | 'trace' | 'events' | 'leads' | 'jobs' | 'approvals' | 'attribution' | 'audit';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' }, { id: 'connection', label: 'Connection' }, { id: 'catalog', label: 'Catalog' }, { id: 'product-sets', label: 'Product sets' }, { id: 'ads', label: 'Ads insights' }, { id: 'instagram', label: 'Instagram CRM' },
  { id: 'diagnostics', label: 'Diagnostics' }, { id: 'incidents', label: 'Incidents' }, { id: 'trace', label: 'Trace' }, { id: 'events', label: 'Events' }, { id: 'leads', label: 'Leads' }, { id: 'jobs', label: 'Jobs' },
  { id: 'approvals', label: 'Approvals' }, { id: 'attribution', label: 'Attribution' }, { id: 'audit', label: 'Audit logs' },
];

function tone(value: string): BadgeTone {
  if (['HEALTHY', 'ACTIVE', 'SENT', 'SUCCEEDED', 'EXECUTED', 'APPROVED'].includes(value)) return 'success';
  if (['FAILED', 'FAILED_PERMANENT', 'DEAD_LETTER', 'INVALID_TOKEN', 'ERROR', 'CRITICAL', 'REJECTED'].includes(value)) return 'danger';
  if (['DEGRADED', 'VERSION_WARNING', 'MISSING_PERMISSION', 'PENDING', 'SUBMITTED', 'RETRYING', 'EXECUTING', 'WARNING', 'OPEN', 'ACKNOWLEDGED'].includes(value)) return 'warning';
  return 'neutral';
}
function date(value?: string | null) { return value ? new Date(value).toLocaleString('en-BD') : '—'; }
function count(counts: Counts, ...keys: string[]) { return keys.reduce((total, key) => total + (counts[key] ?? 0), 0); }
function adminFailureText(failure: AdminFailure) { return failure ? [failure.code, failure.classification, failure.summary].filter(Boolean).join(' · ') : '—'; }

export default function MetaOperationsCenterPage() {
  const { user, hasPermission } = useAdminAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [productSets, setProductSets] = useState<ProductSet[]>([]);
  const [attributionReport, setAttributionReport] = useState<AttributionReport | null>(null);
  const [adsReport, setAdsReport] = useState<AdsReport | null>(null);
  const [traceQuery, setTraceQuery] = useState('');
  const [trace, setTrace] = useState<TraceResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setBusy(true); setMessage('');
    try {
      const canView = hasPermission(PERMISSIONS.META_OPS_VIEW);
      const [summaryResult, approvalResult, auditResult, diagnosticResult, incidentResult, productSetResult, attributionResult, adsResult] = await Promise.all([
        adminFetchJson<{ ok: true } & Summary>('/api/admin/meta/operations/summary'),
        canView ? adminFetchJson<{ approvals: Approval[] }>('/api/admin/meta/approvals?limit=100') : Promise.resolve({ approvals: [] }),
        hasPermission(PERMISSIONS.META_OPS_AUDIT) ? adminFetchJson<{ audits: Audit[] }>('/api/admin/meta/audit-logs?limit=100') : Promise.resolve({ audits: [] }),
        canView ? adminFetchJson<{ diagnostics: Diagnostic[] }>('/api/admin/meta/diagnostics?status=ACTIVE&limit=100') : Promise.resolve({ diagnostics: [] }),
        canView ? adminFetchJson<{ incidents: Incident[] }>('/api/admin/meta/incidents?limit=100') : Promise.resolve({ incidents: [] }),
        canView ? adminFetchJson<{ productSets: ProductSet[] }>('/api/admin/meta/product-sets') : Promise.resolve({ productSets: [] }),
        canView ? adminFetchJson<{ ok: true } & AttributionReport>('/api/admin/meta/attribution?windowDays=30&limit=25') : Promise.resolve(null),
        canView ? adminFetchJson<{ ok: true } & AdsReport>('/api/admin/meta/insights?level=campaign&limit=100') : Promise.resolve(null),
      ]);
      setSummary(summaryResult);
      setApprovals(approvalResult.approvals ?? []);
      setAudits(auditResult.audits ?? summaryResult.recentAudits ?? []);
      setDiagnostics(diagnosticResult.diagnostics ?? []);
      setIncidents(incidentResult.incidents ?? []);
      setProductSets(productSetResult.productSets ?? []);
      setAttributionReport(attributionResult && 'models' in attributionResult ? attributionResult : null);
      setAdsReport(adsResult && 'snapshots' in adsResult ? adsResult : null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Meta Operations Center load failed');
    } finally { setBusy(false); }
  }, [hasPermission]);

  useEffect(() => { void load(); }, [load]);

  async function mutate(endpoint: string, json: Record<string, unknown>, success: string, method = 'POST') {
    setBusy(true); setMessage('');
    try {
      await adminFetchJson(endpoint, { method, json });
      setMessage(success); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Action failed'); setBusy(false); }
  }

  async function loadTrace() {
    const correlationId = traceQuery.trim();
    if (!correlationId) { setMessage('Enter a correlation ID.'); return; }
    setBusy(true); setMessage('');
    try {
      const result = await adminFetchJson<{ ok: true } & TraceResult>(`/api/admin/meta/correlations/${encodeURIComponent(correlationId)}`);
      setTrace(result);
    } catch (error) { setTrace(null); setMessage(error instanceof Error ? error.message : 'Correlation timeline load failed'); }
    finally { setBusy(false); }
  }

  async function requestApproval(actionKey: 'META_EVENT_REPLAY' | 'META_JOB_REPLAY', item: FailureItem) {
    const resourceType = actionKey === 'META_EVENT_REPLAY' ? 'META_EVENT_OUTBOX' : 'META_JOB_AUDIT';
    const payload = actionKey === 'META_EVENT_REPLAY' ? { outboxId: item.id } : { auditId: item.id };
    await mutate('/api/admin/meta/approvals', {
      actionKey, resourceType, resourceId: item.id, payload,
      reason: actionKey === 'META_EVENT_REPLAY' ? `Review duplicate risk before replaying ${item.eventName ?? 'Meta event'}.` : `Review queue state before replaying ${item.jobName ?? 'Meta job'}.`,
    }, 'Approval request created. A different authorized approver must review it.');
  }

  async function requestProductSetSync(item: ProductSet) {
    const preview = item.previews[0];
    if (!preview || preview.consumedAt || new Date(preview.expiresAt).getTime() <= Date.now()) {
      setMessage('Generate a fresh product set preview before requesting synchronization approval.');
      return;
    }
    await mutate('/api/admin/meta/approvals', {
      actionKey: 'META_PRODUCT_SET_SYNC', resourceType: 'META_PRODUCT_SET', resourceId: item.id,
      payload: { productSetId: item.id, previewId: preview.id },
      reason: `Approve preview-validated synchronization for ${item.name} (${preview.memberCount} members).`,
    }, 'Product set synchronization approval requested. A different authorized approver must review it.');
  }

  async function requestAdsMutation(payload: Record<string, unknown>, reason: string) {
    const resourceId = typeof payload.resourceId === 'string' ? payload.resourceId : null;
    await mutate('/api/admin/meta/approvals', {
      actionKey: 'META_AD_MUTATION', resourceType: 'META_AD_ENTITY', resourceId, payload, reason,
    }, 'Ads mutation approval requested. A different authorized approver must review it.');
  }

  async function decide(approval: Approval, decision: 'approve' | 'reject') {
    await mutate(`/api/admin/meta/approvals/${approval.id}`, { decision, reason: `${decision === 'approve' ? 'Approved' : 'Rejected'} from Meta Operations Center` }, `Approval ${decision}d.`, 'PATCH');
  }

  async function executeApproval(approval: Approval) {
    if (approval.actionKey === 'META_EVENT_REPLAY') {
      await mutate('/api/admin/meta/events', { outboxId: approval.resourceId, approvalId: approval.id, reason: approval.reason }, 'Approved event replay was queued.');
    } else if (approval.actionKey === 'META_JOB_REPLAY' || approval.actionKey === 'META_JOB_CANCEL') {
      const action = approval.actionKey === 'META_JOB_REPLAY' ? 'replay' : 'cancel';
      await mutate('/api/admin/meta/jobs', { action, auditId: approval.resourceId, approvalId: approval.id, reason: approval.reason }, action === 'replay' ? 'Approved job replay was queued.' : 'Approved job cancellation completed.');
    } else if (approval.actionKey === 'META_PRODUCT_SET_SYNC') {
      const previewId = typeof approval.payload.previewId === 'string' ? approval.payload.previewId : '';
      if (!approval.resourceId || !previewId) { setMessage('Approved product set payload is incomplete.'); return; }
      await mutate(`/api/admin/meta/product-sets/${approval.resourceId}/sync`, { previewId, approvalId: approval.id, reason: approval.reason }, 'Approved product set synchronization completed.');
    } else if (approval.actionKey === 'META_AD_MUTATION') {
      const operation = typeof approval.payload.operation === 'string' ? approval.payload.operation : '';
      const input = approval.payload.input && typeof approval.payload.input === 'object' && !Array.isArray(approval.payload.input) ? approval.payload.input as Record<string, unknown> : {};
      const resourceId = typeof approval.payload.resourceId === 'string' ? approval.payload.resourceId : approval.resourceId;
      const routes: Record<string, { endpoint: string; method: 'POST' | 'PATCH'; idKey?: string }> = {
        CREATE_CAMPAIGN: { endpoint: '/api/admin/meta/campaigns', method: 'POST' }, UPDATE_CAMPAIGN: { endpoint: '/api/admin/meta/campaigns', method: 'PATCH', idKey: 'campaignId' },
        CREATE_ADSET: { endpoint: '/api/admin/meta/adsets', method: 'POST' }, UPDATE_ADSET: { endpoint: '/api/admin/meta/adsets', method: 'PATCH', idKey: 'adSetId' },
        CREATE_CREATIVE: { endpoint: '/api/admin/meta/creatives', method: 'POST' }, UPDATE_CREATIVE: { endpoint: '/api/admin/meta/creatives', method: 'PATCH', idKey: 'creativeId' },
        CREATE_AD: { endpoint: '/api/admin/meta/ads', method: 'POST' }, UPDATE_AD: { endpoint: '/api/admin/meta/ads', method: 'PATCH', idKey: 'adId' },
      };
      const route = routes[operation];
      if (!route || (route.idKey && !resourceId)) { setMessage('Approved ad mutation payload is incomplete.'); return; }
      await mutate(route.endpoint, { ...input, ...(route.idKey ? { [route.idKey]: resourceId } : {}), approvalId: approval.id, reason: approval.reason }, 'Approved Meta ad mutation executed.', route.method);
    }
  }

  const pendingApprovals = useMemo(() => approvals.filter((item) => item.status === 'PENDING'), [approvals]);
  const canOperate = hasPermission(PERMISSIONS.META_OPS_OPERATE);
  const canApprove = hasPermission(PERMISSIONS.META_OPS_APPROVE);

  return <div className="space-y-6 p-4 md:p-6">
    <header className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold text-gray-900">Meta Operations Center</h1><Badge tone="info">Phase 13</Badge></div>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">Read-only Ads Insights, approval-based ad automation, deterministic product sets, first-party attribution, diagnostics, incidents, approvals and immutable audits in one redacted control plane.</p>
      </div>
      <div className="flex flex-wrap gap-2"><Link href="/admin/meta-business"><Button variant="secondary">Legacy Meta tools</Button></Link><Button variant="secondary" onClick={() => void load()} disabled={busy}><RefreshCw className="h-4 w-4" /> Refresh</Button></div>
    </header>

    {message && <div className="rounded-xl border bg-white px-4 py-3 text-sm" role="status">{message}</div>}

    <nav className="flex gap-2 overflow-x-auto rounded-2xl border bg-white p-2" aria-label="Meta operations sections">
      {TABS.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`min-h-11 shrink-0 rounded-xl px-3 text-sm font-semibold ${tab === item.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{item.label}</button>)}
    </nav>

    {!summary && <section className="rounded-2xl border bg-white p-8 text-center text-sm text-gray-500">{busy ? 'Loading Meta operational state…' : 'No operational snapshot available.'}</section>}
    {summary && tab === 'overview' && <Overview summary={summary} pendingApprovals={pendingApprovals.length} />}
    {summary && tab === 'connection' && <section className="space-y-4"><Panel title="Connection and permission health" icon={ShieldCheck}>
      <div className="grid gap-4 md:grid-cols-2"><KeyValue label="Connection" value={summary.connection?.name ?? 'primary'} /><KeyValue label="Final state" value={summary.connection?.status ?? 'UNCONFIGURED'} badge /><KeyValue label="Graph API version" value={summary.connection?.graphApiVersion ?? '—'} /><KeyValue label="Last checked" value={date(summary.connection?.lastCheckedAt)} /></div>
      {summary.connection?.failure && <Callout>{adminFailureText(summary.connection.failure)}</Callout>}
      {canOperate && <Button onClick={() => mutate('/api/admin/meta/connection', { action: 'recheck', connectionName: summary.connection?.name ?? 'primary', reason: 'Operator requested full token, permission, asset and version recheck' }, 'Connection health recheck queued.')} disabled={busy}><RotateCcw className="h-4 w-4" /> Recheck connection</Button>}
    </Panel><ProviderHealthPanel /></section>}
    {summary && tab === 'catalog' && <section className="space-y-4"><Panel title="Catalog final-state monitor" icon={Database}>
      <StatusGrid counts={summary.domains.catalog.items} />
      <p className="text-sm text-gray-600">Submitted and delete-submitted items remain pending; they are not counted as successful until Meta returns a final state.</p>
      {canOperate && <div className="flex flex-wrap gap-2"><Button onClick={() => mutate('/api/admin/meta/catalogs/sync', { inventoryOnly: false, reason: 'Operator requested incremental catalog sync' }, 'Incremental catalog sync queued.')} disabled={busy}>Incremental sync</Button><Button variant="secondary" onClick={() => mutate('/api/admin/meta/catalogs/sync', { inventoryOnly: true, reason: 'Operator requested inventory-only catalog sync' }, 'Inventory sync queued.')} disabled={busy}>Inventory sync</Button></div>}
    </Panel></section>}
    {tab === 'product-sets' && <ProductSetsPanel productSets={productSets} canOperate={canOperate} busy={busy}
      onCreate={(input) => mutate('/api/admin/meta/product-sets', input, 'Product set rule created. Generate a preview before synchronization.')}
      onPreview={(item) => mutate(`/api/admin/meta/product-sets/${item.id}/preview`, { reason: `Preview ${item.name} membership` }, 'Product set membership preview generated.')}
      onRequestSync={(item) => void requestProductSetSync(item)}
      onRollback={(item, targetVersion) => mutate(`/api/admin/meta/product-sets/${item.id}/rollback`, { targetVersion, expectedVersion: item.ruleVersion, reason: `Rollback ${item.name} to version ${targetVersion}` }, 'Product set rule rolled back. Generate a new preview before synchronization.')} />}
    {tab === 'ads' && <AdsPanel report={adsReport} canOperate={canOperate} busy={busy}
      onSync={() => mutate('/api/admin/meta/insights', { level: 'CAMPAIGN', reason: 'Operator requested read-only Ads Insights synchronization' }, 'Ads Insights synchronized and recommendations refreshed.')}
      onGenerate={() => mutate('/api/admin/meta/ads/recommendations', { reason: 'Operator requested Ads recommendation generation' }, 'Ads recommendations regenerated.')}
      onDismiss={(id) => mutate('/api/admin/meta/ads/recommendations', { recommendationId: id, reason: 'Dismiss recommendation from Operations Center' }, 'Recommendation dismissed.', 'PATCH')}
      onRequestMutation={(payload, reason) => void requestAdsMutation(payload, reason)} />}
    {tab === 'instagram' && <section><Panel title="Instagram Messaging & Social CRM" icon={Users}><p className="mb-4 text-sm text-gray-600">Secure signed webhook ingestion, deduplicated conversations, policy-aware replies, assignment and verified customer/lead/product/order links.</p><Link href="/admin/meta/instagram"><Button>Open Instagram Social CRM</Button></Link></Panel></section>}
    {tab === 'diagnostics' && <DiagnosticsPanel diagnostics={diagnostics} canOperate={canOperate} busy={busy} onImport={() => mutate('/api/admin/meta/diagnostics', { reason: 'Operator requested Catalog Diagnostics import' }, 'Catalog Diagnostics import queued.')} />}
    {tab === 'incidents' && <IncidentsPanel incidents={incidents} canOperate={canOperate} busy={busy} onAction={(incident, action) => mutate(`/api/admin/meta/incidents/${incident.id}`, { action, reason: `Incident ${action} from Meta Operations Center` }, `Incident ${action}d.`, 'PATCH')} />}
    {tab === 'trace' && <TracePanel query={traceQuery} trace={trace} busy={busy} onQuery={setTraceQuery} onLoad={() => void loadTrace()} />}
    {summary && tab === 'events' && <FailurePanel title="Permanent CAPI failures" items={summary.failures.events} canOperate={canOperate} busy={busy} onRequest={(item) => requestApproval('META_EVENT_REPLAY', item)} />}
    {summary && tab === 'leads' && <section className="space-y-4"><Panel title="Lead Ads CRM" icon={Users}><StatusGrid counts={summary.domains.leads} /><Callout>{summary.health.overdueLeads} new lead(s) exceed the 15-minute first-contact target.</Callout><Link href="/admin/meta-business/leads"><Button>Open lead lifecycle workspace</Button></Link></Panel></section>}
    {summary && tab === 'jobs' && <section className="space-y-4"><MetaJobsPanel canOperate={canOperate} /><FailurePanel title="Recent failed and dead-letter jobs" items={summary.failures.jobs} canOperate={canOperate} busy={busy} onRequest={(item) => requestApproval('META_JOB_REPLAY', item)} /></section>}
    {tab === 'approvals' && <ApprovalsPanel approvals={approvals} currentUserId={user?.id ?? ''} canApprove={canApprove} canOperate={canOperate} busy={busy} onDecide={decide} onExecute={executeApproval} />}
    {tab === 'attribution' && <AttributionPanel report={attributionReport} fallback={summary?.domains.attribution ?? null} />}
    {tab === 'audit' && <AuditPanel audits={audits} />}
  </div>;
}


function AdsPanel({ report, canOperate, busy, onSync, onGenerate, onDismiss, onRequestMutation }: {
  report: AdsReport | null; canOperate: boolean; busy: boolean;
  onSync: () => void; onGenerate: () => void; onDismiss: (id: string) => void;
  onRequestMutation: (payload: Record<string, unknown>, reason: string) => void;
}) {
  const [entityType, setEntityType] = useState<'CAMPAIGN' | 'ADSET' | 'AD'>('CAMPAIGN');
  const [resourceId, setResourceId] = useState('');
  const [status, setStatus] = useState('');
  const [dailyBudget, setDailyBudget] = useState('');
  const [reason, setReason] = useState('Review and approve controlled Meta ad update');
  function request() {
    const input: Record<string, unknown> = {};
    if (status) input.status = status;
    if (dailyBudget) input.dailyBudgetBdt = Number(dailyBudget);
    if (!resourceId.trim() || Object.keys(input).length === 0) return;
    onRequestMutation({ operation: `UPDATE_${entityType}`, entityType, resourceId: resourceId.trim(), input }, reason);
  }
  if (!report) return <section><Panel title="Ads Insights & approval automation" icon={BarChart3}><p className="text-sm text-gray-500">No persisted Ads Insights snapshot is available.</p>{canOperate && <Button disabled={busy} onClick={onSync}>Run first read-only sync</Button>}</Panel></section>;
  return <section className="space-y-4">
    <Panel title="Read-only Ads Insights stability gate" icon={BarChart3}>
      <div className="grid gap-3 md:grid-cols-5"><KeyValue label="Spend" value={`৳${report.summary.spend.toLocaleString('en-BD')}`} /><KeyValue label="Purchases" value={report.summary.purchases} /><KeyValue label="ROAS" value={report.summary.roas.toFixed(2)} /><KeyValue label="CTR" value={`${report.summary.ctr.toFixed(2)}%`} /><KeyValue label="Stable runs" value={`${report.stability.successfulRuns}/${report.stability.requiredSuccessfulRuns}`} /></div>
      <Callout>{report.stability.reason} Ad writes remain blocked until this gate is stable.</Callout>
      <div className="flex flex-wrap gap-2">{canOperate && <Button disabled={busy} onClick={onSync}>Sync read-only insights</Button>}{canOperate && <Button variant="secondary" disabled={busy} onClick={onGenerate}>Regenerate recommendations</Button>}<Badge tone={report.stability.stable ? 'success' : 'warning'}>{report.stability.stable ? 'WRITE GATE OPEN' : 'READ-ONLY'}</Badge></div>
    </Panel>
    <Panel title="Server-side mutation safety caps" icon={ShieldCheck}>
      <div className="grid gap-3 md:grid-cols-4"><KeyValue label="Daily budget cap" value={`৳${report.safetyCaps.maxDailyBudgetBdt.toLocaleString('en-BD')}`} /><KeyValue label="Lifetime cap" value={`৳${report.safetyCaps.maxLifetimeBudgetBdt.toLocaleString('en-BD')}`} /><KeyValue label="Bid cap" value={`৳${report.safetyCaps.maxBidAmountBdt.toLocaleString('en-BD')}`} /><KeyValue label="Per-approval increase" value={`${report.safetyCaps.maxBudgetIncreasePercent}%`} /></div>
    </Panel>
    {canOperate && <Panel title="Request an exact ad mutation approval" icon={ShieldCheck}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><select className="min-h-11 rounded-xl border px-3" value={entityType} onChange={(e) => setEntityType(e.target.value as 'CAMPAIGN' | 'ADSET' | 'AD')}><option value="CAMPAIGN">Campaign</option><option value="ADSET">Ad set</option><option value="AD">Ad</option></select><input className="min-h-11 rounded-xl border px-3" value={resourceId} onChange={(e) => setResourceId(e.target.value)} placeholder="Provider resource ID" /><select className="min-h-11 rounded-xl border px-3" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">No status change</option><option value="PAUSED">PAUSED</option><option value="ACTIVE">ACTIVE</option></select><input className="min-h-11 rounded-xl border px-3" type="number" min="0" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} placeholder="Daily budget BDT" /><Button disabled={busy || !resourceId.trim() || (!status && !dailyBudget)} onClick={request}>Request approval</Button></div>
      <input className="min-h-11 w-full rounded-xl border px-3" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Approval reason" />
    </Panel>}
    <Panel title="Optimization recommendations — never auto-applied" icon={SearchCheck}>
      {report.recommendations.length === 0 ? <p className="text-sm text-gray-500">No active recommendations.</p> : <div className="space-y-3">{report.recommendations.map((item) => <article key={item.id} className="rounded-xl border p-4"><div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between"><div><div className="flex flex-wrap gap-2"><strong>{item.entityName ?? item.entityId}</strong><Badge tone={tone(item.severity)}>{item.severity}</Badge><Badge>{item.type}</Badge></div><p className="mt-2 text-sm text-gray-700">{item.rationale}</p><p className="mt-1 text-xs text-gray-500">{item.entityType} · {item.entityId} · expires {date(item.expiresAt)}</p></div>{canOperate && <Button variant="secondary" disabled={busy} onClick={() => onDismiss(item.id)}>Dismiss</Button>}</div></article>)}</div>}
    </Panel>
    <Panel title="Persisted campaign snapshots" icon={BarChart3}>
      {report.snapshots.length === 0 ? <p className="text-sm text-gray-500">No snapshot rows.</p> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Campaign</th><th className="p-2">Spend</th><th className="p-2">Purchases</th><th className="p-2">ROAS</th><th className="p-2">CTR</th><th className="p-2">Window</th></tr></thead><tbody>{report.snapshots.slice(0, 100).map((row) => <tr key={row.id} className="border-b"><td className="p-2"><strong>{row.entityName ?? row.entityId}</strong><div className="text-xs text-gray-500">{row.entityId}</div></td><td className="p-2">৳{row.spend.toLocaleString('en-BD')}</td><td className="p-2">{row.purchases}</td><td className="p-2">{row.roas.toFixed(2)}</td><td className="p-2">{row.ctr.toFixed(2)}%</td><td className="p-2 text-xs">{new Date(row.dateStart).toLocaleDateString('en-BD')}–{new Date(row.dateStop).toLocaleDateString('en-BD')}</td></tr>)}</tbody></table></div>}
    </Panel>
    <Panel title="Approved mutation reconciliation ledger" icon={FileClock}>
      {report.executions.length === 0 ? <p className="text-sm text-gray-500">No approved ad mutation has been executed.</p> : <div className="space-y-2">{report.executions.map((item) => <div key={item.id} className="flex flex-col gap-1 rounded-xl border p-3 md:flex-row md:items-center md:justify-between"><div><strong className="text-sm">{item.operation}</strong><p className="text-xs text-gray-500">{item.entityType} · {item.entityId ?? 'provider ID pending'}</p></div><div className="flex items-center gap-2"><Badge tone={tone(item.status)}>{item.status}</Badge><span className="text-xs text-gray-500">{date(item.startedAt)}</span></div></div>)}</div>}
    </Panel>
  </section>;
}

function Overview({ summary, pendingApprovals }: { summary: Summary; pendingApprovals: number }) {
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <Metric icon={ShieldCheck} label="Connection" value={summary.health.connection} status={summary.health.connection} />
      <Metric icon={Database} label="Catalog failed" value={summary.health.failedCatalogItems} status={summary.health.failedCatalogItems ? 'FAILED' : 'HEALTHY'} />
      <Metric icon={Activity} label="CAPI failed" value={summary.health.failedEvents} status={summary.health.failedEvents ? 'FAILED' : 'HEALTHY'} />
      <Metric icon={Workflow} label="Dead letters" value={summary.health.deadLetterJobs} status={summary.health.deadLetterJobs ? 'FAILED' : 'HEALTHY'} />
      <Metric icon={Clock3} label="Lead SLA overdue" value={summary.health.overdueLeads} status={summary.health.overdueLeads ? 'DEGRADED' : 'HEALTHY'} />
      <Metric icon={FileClock} label="Pending approvals" value={pendingApprovals} status={pendingApprovals ? 'PENDING' : 'HEALTHY'} />
    </div>
    <div className="grid gap-6 xl:grid-cols-2"><Panel title="Provider state policy" icon={CheckCircle2}><p className="text-sm text-gray-600">Submission acceptance is displayed as pending. Only terminal provider states are reported as final success or failure.</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><KeyValue label="Catalog pending" value={count(summary.domains.catalog.items, 'SUBMITTED', 'DELETE_SUBMITTED')} /><KeyValue label="Events pending" value={count(summary.domains.events, 'PENDING', 'DISPATCHED', 'PROCESSING', 'RETRY_SCHEDULED')} /><KeyValue label="Jobs pending" value={count(summary.domains.jobs, 'QUEUED', 'RUNNING', 'RETRYING')} /></div></Panel><Panel title="Recent immutable actions" icon={FileClock}><AuditRows audits={summary.recentAudits.slice(0, 6)} /></Panel></div>
  </div>;
}


function ProductSetsPanel({ productSets, canOperate, busy, onCreate, onPreview, onRequestSync, onRollback }: {
  productSets: ProductSet[]; canOperate: boolean; busy: boolean;
  onCreate: (input: Record<string, unknown>) => void; onPreview: (item: ProductSet) => void;
  onRequestSync: (item: ProductSet) => void; onRollback: (item: ProductSet, targetVersion: number) => void;
}) {
  const [name, setName] = useState('');
  const [field, setField] = useState('CUSTOM_LABEL_2');
  const [operator, setOperator] = useState('EQUALS');
  const [value, setValue] = useState('');
  const [autoSync, setAutoSync] = useState(false);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  useEffect(() => {
    const refreshCurrentTime = () => setCurrentTime(Date.now());
    refreshCurrentTime();
    const timer = window.setInterval(refreshCurrentTime, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const create = () => {
    if (!name.trim() || !value.trim()) return;
    const parsedValue: string | number | boolean = ['PRICE', 'SALE_PRICE'].includes(field) ? Number(value) : field === 'HAS_SALE' ? value === 'true' : value;
    onCreate({ name: name.trim(), autoSync, rule: { combinator: 'AND', conditions: [{ field, operator, value: parsedValue }] }, reason: 'Create product set from Operations Center rule builder' });
    setName(''); setValue('');
  };
  return <section className="space-y-4">
    <Panel title="Deterministic product set rule builder" icon={Tags}>
      <Callout>Rules are evaluated locally against canonical catalog items. Meta synchronization is blocked until a fresh preview hash is approved.</Callout>
      {canOperate && <div className="grid gap-3 lg:grid-cols-5">
        <input aria-label="Product set name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Eid sale skincare" className="min-h-11 rounded-xl border px-3 text-sm" />
        <select aria-label="Rule field" value={field} onChange={(event) => setField(event.target.value)} className="min-h-11 rounded-xl border px-3 text-sm"><option>CUSTOM_LABEL_2</option><option>BRAND</option><option>PRODUCT_TYPE</option><option>AVAILABILITY</option><option>PRICE</option><option>SALE_PRICE</option><option>HAS_SALE</option><option>CUSTOM_LABEL_0</option><option>CUSTOM_LABEL_1</option><option>CUSTOM_LABEL_3</option><option>COLOR</option><option>SIZE</option><option>SOURCE_TYPE</option></select>
        <select aria-label="Rule operator" value={operator} onChange={(event) => setOperator(event.target.value)} className="min-h-11 rounded-xl border px-3 text-sm"><option>EQUALS</option><option>NOT_EQUALS</option><option>CONTAINS</option><option>GTE</option><option>LTE</option></select>
        <input aria-label="Rule value" value={value} onChange={(event) => setValue(event.target.value)} placeholder={field === 'HAS_SALE' ? 'true or false' : 'Rule value'} className="min-h-11 rounded-xl border px-3 text-sm" />
        <div className="flex items-center gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={autoSync} onChange={(event) => setAutoSync(event.target.checked)} /> Auto-sync</label><Button disabled={busy || !name.trim() || !value.trim()} onClick={create}>Create</Button></div>
      </div>}
    </Panel>
    <Panel title="Product sets and synchronized membership" icon={Database}>
      {productSets.length === 0 ? <p className="text-sm text-gray-500">No deterministic product sets exist.</p> : <div className="space-y-3">{productSets.map((item) => {
        const preview = item.previews[0];
        const previous = item.versions.find((version) => version.version < item.ruleVersion);
        const previewFresh = Boolean(preview && currentTime !== null && !preview.consumedAt && new Date(preview.expiresAt).getTime() > currentTime && preview.ruleVersion === item.ruleVersion && preview.membershipHash === item.membershipHash);
        return <article key={item.id} className="rounded-xl border p-4"><div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between"><div><div className="flex flex-wrap items-center gap-2"><strong>{item.name}</strong><Badge tone={tone(item.status)}>{item.status}</Badge><Badge tone={tone(item.syncStatus)}>{item.syncStatus}</Badge>{item.autoSync && <Badge tone="info">AUTO</Badge>}</div><p className="mt-1 text-xs text-gray-500">v{item.ruleVersion} · {item.memberCount} member(s) · catalog {item.catalogId}</p><p className="mt-2 break-all text-xs text-gray-500">Rule {item.ruleHash.slice(0, 12)}… · membership {item.membershipHash?.slice(0, 12) ?? 'not previewed'}…</p><p className="mt-2 text-sm text-gray-700">{item.ruleJson.combinator}: {item.ruleJson.conditions.map((condition) => `${condition.field} ${condition.operator} ${Array.isArray(condition.value) ? condition.value.join(', ') : String(condition.value)}`).join(' · ')}</p>{preview && <p className="mt-2 text-xs text-gray-500">Preview {preview.memberCount} members · expires {date(preview.expiresAt)}{preview.consumedAt ? ' · consumed' : ''}</p>}</div>{canOperate && <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={() => onPreview(item)}>Preview</Button><Button disabled={busy || !previewFresh || item.memberCount === 0} onClick={() => onRequestSync(item)}>Request sync approval</Button>{previous && <Button variant="secondary" disabled={busy} onClick={() => onRollback(item, previous.version)}>Rollback to v{previous.version}</Button>}</div>}</div></article>;
      })}</div>}
    </Panel>
  </section>;
}

function DiagnosticsPanel({ diagnostics, canOperate, busy, onImport }: { diagnostics: Diagnostic[]; canOperate: boolean; busy: boolean; onImport: () => void }) {
  return <section><Panel title="Catalog Diagnostics" icon={SearchCheck}>
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><p className="text-sm text-gray-600">Persisted Meta diagnostic issues with sampled affected retailer IDs and correlation context.</p>{canOperate && <Button disabled={busy} onClick={onImport}><RefreshCw className="h-4 w-4" /> Import diagnostics</Button>}</div>
    {diagnostics.length === 0 ? <p className="text-sm text-gray-500">No active Catalog Diagnostics issues.</p> : <div className="space-y-3">{diagnostics.map((item) => <article key={item.id} className="rounded-xl border p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><strong>{item.title}</strong><Badge tone={tone(item.severity)}>{item.severity}</Badge><Badge tone={tone(item.status)}>{item.status}</Badge></div><p className="mt-1 text-xs text-gray-500">{item.issueType} · catalog {item.catalogId} · affected {item.affectedItemCount} · last seen {date(item.lastSeenAt)}</p>{item.description && <p className="mt-2 text-sm text-gray-700">{item.description}</p>}{item.correlationId && <p className="mt-2 break-all text-xs text-gray-500">Correlation: {item.correlationId}</p>}</div></div>{item.items.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{item.items.map((affected) => <Badge key={affected.id}>{affected.retailerId}</Badge>)}</div>}</article>)}</div>}
  </Panel></section>;
}

function IncidentsPanel({ incidents, canOperate, busy, onAction }: { incidents: Incident[]; canOperate: boolean; busy: boolean; onAction: (incident: Incident, action: 'acknowledge' | 'resolve') => void }) {
  return <section><Panel title="Incident inbox" icon={Siren}>{incidents.length === 0 ? <p className="text-sm text-gray-500">No incidents have been persisted.</p> : <div className="space-y-3">{incidents.map((item) => <article key={item.id} className="rounded-xl border p-4"><div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between"><div><div className="flex flex-wrap items-center gap-2"><strong>{item.summary}</strong><Badge tone={tone(item.severity)}>{item.severity}</Badge><Badge tone={tone(item.status)}>{item.status}</Badge></div><p className="mt-1 text-xs text-gray-500">{item.incidentType} · {item.resourceType} · {item.resourceId ?? 'global'} · occurrences {item.occurrenceCount}</p><p className="mt-2 text-xs text-gray-500">First {date(item.firstSeenAt)} · Last {date(item.lastSeenAt)}</p>{item.correlationId && <p className="mt-2 break-all text-xs text-gray-500">Correlation: {item.correlationId}</p>}</div>{canOperate && item.status !== 'RESOLVED' && <div className="flex flex-wrap gap-2">{item.status === 'OPEN' && <Button variant="secondary" disabled={busy} onClick={() => onAction(item, 'acknowledge')}>Acknowledge</Button>}<Button disabled={busy} onClick={() => onAction(item, 'resolve')}>Resolve</Button></div>}</div></article>)}</div>}</Panel></section>;
}

function TracePanel({ query, trace, busy, onQuery, onLoad }: { query: string; trace: TraceResult | null; busy: boolean; onQuery: (value: string) => void; onLoad: () => void }) {
  return <section><Panel title="Correlation timeline" icon={Activity}>
    <div className="flex flex-col gap-2 md:flex-row"><input aria-label="Correlation ID" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="meta-job:… or meta-event:…" className="min-h-11 flex-1 rounded-xl border px-3 text-sm" /><Button disabled={busy || !query.trim()} onClick={onLoad}><SearchCheck className="h-4 w-4" /> Trace</Button></div>
    {!trace ? <p className="text-sm text-gray-500">Search a correlation ID to follow admin, queue, CAPI, webhook, catalog, diagnostic and incident events.</p> : <div><p className="mb-3 break-all text-xs text-gray-500">{trace.correlationId} · {trace.eventCount} event(s)</p>{trace.events.length === 0 ? <p className="text-sm text-gray-500">No persisted events matched this correlation ID.</p> : <ol className="space-y-3">{trace.events.map((item, index) => <li key={`${item.source}-${item.resourceId}-${index}`} className="rounded-xl border p-4"><div className="flex flex-wrap items-center gap-2"><Badge>{item.source}</Badge><Badge tone={tone(item.status)}>{item.status}</Badge><span className="text-xs text-gray-500">{date(item.occurredAt)}</span></div><p className="mt-2 text-sm font-semibold">{item.summary}</p><p className="mt-1 break-all text-xs text-gray-500">{item.resourceId}</p></li>)}</ol>}</div>}
  </Panel></section>;
}

function FailurePanel({ title, items, canOperate, busy, onRequest }: { title: string; items: FailureItem[]; canOperate: boolean; busy: boolean; onRequest: (item: FailureItem) => void }) {
  return <section><Panel title={title} icon={AlertTriangle}>{items.length === 0 ? <p className="text-sm text-gray-500">No matching failures.</p> : <div className="space-y-3">{items.map((item) => <article key={item.id} className="rounded-xl border p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><strong>{item.eventName ?? item.jobName ?? item.id}</strong><Badge tone={tone(item.status)}>{item.status}</Badge></div><p className="mt-1 text-xs text-gray-500">{item.eventId ?? item.queueName ?? item.id} · attempts {item.attempts} · {date(item.updatedAt)}</p><p className="mt-2 text-sm text-gray-700">{adminFailureText(item.failure)}</p></div>{canOperate && <Button variant="secondary" disabled={busy} onClick={() => onRequest(item)}>Request replay approval</Button>}</div></article>)}</div>}</Panel></section>;
}

function ApprovalsPanel({ approvals, currentUserId, canApprove, canOperate, busy, onDecide, onExecute }: { approvals: Approval[]; currentUserId: string; canApprove: boolean; canOperate: boolean; busy: boolean; onDecide: (item: Approval, decision: 'approve' | 'reject') => void; onExecute: (item: Approval) => void }) {
  return <section><Panel title="Approval queue" icon={ShieldCheck}>{approvals.length === 0 ? <p className="text-sm text-gray-500">No approval requests.</p> : <div className="space-y-3">{approvals.map((item) => <article key={item.id} className="rounded-xl border p-4"><div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between"><div><div className="flex flex-wrap gap-2"><strong>{item.actionKey}</strong><Badge tone={tone(item.status)}>{item.status}</Badge><Badge tone={item.risk === 'CRITICAL' || item.risk === 'HIGH' ? 'danger' : 'warning'}>{item.risk}</Badge></div><p className="mt-1 text-xs text-gray-500">{item.resourceType} · {item.resourceId ?? 'no resource ID'} · requested by {item.requestedBy.name}</p><p className="mt-2 text-sm text-gray-700">{item.reason}</p><p className="mt-1 text-xs text-gray-500">Expires {date(item.expiresAt)}</p></div><div className="flex flex-wrap gap-2">{item.status === 'PENDING' && canApprove && item.requestedBy.id !== currentUserId && <><Button disabled={busy} onClick={() => onDecide(item, 'approve')}>Approve</Button><Button variant="danger" disabled={busy} onClick={() => onDecide(item, 'reject')}>Reject</Button></>}{item.status === 'APPROVED' && canOperate && <Button disabled={busy} onClick={() => onExecute(item)}>Execute approved action</Button>}</div></div></article>)}</div>}</Panel></section>;
}

function AttributionPanel({ report, fallback }: { report: AttributionReport | null; fallback: Summary['domains']['attribution'] | null }) {
  const coverage = report?.coverage.coverage ?? fallback?.coverage ?? null;
  const campaigns = report?.models.firstParty.rows ?? [];
  return <section className="space-y-4">
    <Panel title="First-party attribution & growth analytics" icon={BarChart3}>
      <div className="grid gap-3 md:grid-cols-4">
        <KeyValue label="Order coverage" value={coverage === null ? '—' : `${Math.round(coverage * 100)}%`} />
        <KeyValue label="Attributed orders" value={report?.coverage.attributedOrders ?? fallback?.attributedOrders ?? 0} />
        <KeyValue label="Lead-linked orders" value={report?.coverage.leadLinkedOrders ?? 0} />
        <KeyValue label="Unattributed orders" value={report?.coverage.unattributedOrders ?? 0} />
      </div>
      <Callout>First-party attribution and Meta-reported attribution are separate measurement models. They are never merged or presented as identical.</Callout>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border p-4"><div className="flex items-center gap-2"><strong>{report?.models.firstParty.label ?? 'First-party attribution'}</strong><Badge tone="info">INTERNAL</Badge></div><p className="mt-2 text-sm text-gray-600">Immutable first-touch, eligible last-touch, lead inheritance and checkout snapshots.</p></div>
        <div className="rounded-xl border p-4"><div className="flex items-center gap-2"><strong>{report?.models.metaReported.label ?? 'Meta-reported attribution'}</strong><Badge>PROVIDER</Badge></div><p className="mt-2 text-sm text-gray-600">{report?.models.metaReported.availability ?? 'Open Meta Insights separately; provider attribution is not combined with first-party totals.'}</p></div>
      </div>
    </Panel>
    <Panel title="Campaign → sessions, leads, orders and revenue" icon={BarChart3}>
      {campaigns.length === 0 ? <p className="text-sm text-gray-500">No first-party campaign aggregates are available for this window.</p> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Campaign</th><th className="p-2">Source / medium</th><th className="p-2">Sessions</th><th className="p-2">Leads</th><th className="p-2">Orders</th><th className="p-2">Revenue</th></tr></thead><tbody>{campaigns.map((row) => <tr key={`${row.utmSource}-${row.utmMedium}-${row.utmCampaign}`} className="border-b"><td className="p-2 font-medium">{row.utmCampaign}</td><td className="p-2">{row.utmSource} / {row.utmMedium}</td><td className="p-2">{row.sessions}</td><td className="p-2">{row.leads}</td><td className="p-2">{row.orders}</td><td className="p-2">৳{row.revenue.toLocaleString('en-BD')}</td></tr>)}</tbody></table></div>}
    </Panel>
    <Panel title="Attribution data quality" icon={SearchCheck}>
      <div className="grid gap-3 md:grid-cols-4"><KeyValue label="Missing click ID" value={report?.dataQuality.missingClickId ?? 0} /><KeyValue label="Missing _fbp" value={report?.dataQuality.missingFbp ?? 0} /><KeyValue label="Missing first touch" value={report?.dataQuality.missingFirstTouch ?? 0} /><KeyValue label="Consent denied" value={report?.dataQuality.consentDenied ?? 0} /></div>
      <div className="flex flex-wrap gap-2"><Link href="/admin/analytics"><Button variant="secondary">Open internal analytics</Button></Link><Link href="/admin/meta-business"><Button variant="secondary">Open Meta Insights</Button></Link></div>
    </Panel>
  </section>;
}

function AuditPanel({ audits }: { audits: Audit[] }) { return <section><Panel title="Immutable mutation audit" icon={FileClock}><AuditRows audits={audits} /></Panel></section>; }
function AuditRows({ audits }: { audits: Audit[] }) { return audits.length === 0 ? <p className="text-sm text-gray-500">No audit records.</p> : <div className="divide-y">{audits.map((item) => <div key={item.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between"><div><div className="flex flex-wrap gap-2"><strong className="text-sm">{item.actionKey}</strong><Badge tone={tone(item.outcome)}>{item.outcome}</Badge><Badge>{item.risk}</Badge></div><p className="mt-1 text-xs text-gray-500">{item.resourceType} · {item.resourceId ?? '—'} · {item.actor.name}</p></div><span className="text-xs text-gray-500">{date(item.createdAt)}</span></div>)}</div>; }
function StatusGrid({ counts }: { counts: Counts }) { const entries = Object.entries(counts); return entries.length === 0 ? <p className="text-sm text-gray-500">No persisted records.</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{entries.map(([status, value]) => <div key={status} className="rounded-xl border p-3"><Badge tone={tone(status)}>{status}</Badge><div className="mt-2 text-2xl font-bold">{value}</div></div>)}</div>; }
function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Activity; children: React.ReactNode }) { return <section className="rounded-2xl border bg-white p-5"><h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Icon className="h-5 w-5 text-gray-500" />{title}</h2><div className="space-y-4">{children}</div></section>; }
function Metric({ icon: Icon, label, value, status }: { icon: typeof Activity; label: string; value: string | number; status: string }) { return <div className="rounded-2xl border bg-white p-4"><Icon className="h-5 w-5 text-gray-500" /><div className="mt-3 text-xl font-bold">{value}</div><div className="mt-1 text-sm text-gray-500">{label}</div><Badge className="mt-3" tone={tone(status)}>{status}</Badge></div>; }
function KeyValue({ label, value, badge = false }: { label: string; value: string | number; badge?: boolean }) { return <div className="rounded-xl border p-3"><div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div><div className="mt-2 font-semibold">{badge ? <Badge tone={tone(String(value))}>{String(value)}</Badge> : value}</div></div>; }
function Callout({ children }: { children: React.ReactNode }) { return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{children}</div>; }
