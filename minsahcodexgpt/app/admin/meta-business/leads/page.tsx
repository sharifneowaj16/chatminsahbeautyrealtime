'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, TestTube2, Users, Workflow } from 'lucide-react';
import { adminFetchJson } from '@/lib/adminFetch';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, type BadgeTone } from '@/components/ui/Badge';

type Failure = {
  code: string;
  classification?: string;
  summary?: string;
  retryAt?: string;
  retryable?: boolean;
  reconciliationRequired?: boolean;
};

type Lead = {
  id: string;
  leadgenId: string;
  formId?: string | null;
  pageId?: string | null;
  campaignId?: string | null;
  campaignName?: string | null;
  adId?: string | null;
  fullName?: string | null;
  phoneMasked?: string | null;
  emailMasked?: string | null;
  city?: string | null;
  area?: string | null;
  productInterest?: string | null;
  isTestLead?: boolean;
  status: string;
  retrievalStatus: string;
  assignedToId?: string | null;
  assignmentReason?: string | null;
  receivedAt: string;
  contactedAt?: string | null;
  convertedOrderId?: string | null;
  duplicateCount: number;
  contactAttemptCount: number;
};

type WebhookFailure = {
  id: string;
  eventKey: string | null;
  leadgenId?: { value: string; fingerprint: string } | null;
  status: string;
  attemptCount: number;
  receivedAt: string | null;
  lastAttemptAt: string | null;
  processedAt: string | null;
  failure: Failure | null;
};

type LeadTrace = {
  receipt: null | {
    id: string;
    state: string;
    receivedAt: string | null;
    firstSeenAt: string | null;
    lastSeenAt: string | null;
    duplicateCount: number;
    attemptCount: number;
    lastAttemptAt: string | null;
    nextRetryAt: string | null;
    processedAt: string | null;
    failedAt: string | null;
    deadLetteredAt: string | null;
    correlationId: string | null;
    replayAttempt: number;
    replayEligibility: string;
    replayRequestedAt: string | null;
    replayCompletedAt: string | null;
    failure: Failure | null;
    identity: null | {
      objectType: string;
      providerId: { value: string; fingerprint: string } | null;
      identityStatus: string;
      permissionHealth: string;
      lastVerifiedAt: string | null;
      revokedAt: string | null;
    };
  };
  fetchAttempts: Array<{
    id: string;
    receiptId: string;
    providerLeadId: { value: string; fingerprint: string } | null;
    retrievalStatus: string;
    retrievalAttempt: number;
    lastRetrievalAt: string | null;
    nextRetrievalAt: string | null;
    duplicateReason: string | null;
    isTestLead: boolean;
    failure: Failure | null;
    createdAt: string | null;
    updatedAt: string | null;
  }>;
  handoffs: Array<{
    id: string;
    destination: string;
    status: string;
    targetType: string | null;
    targetId: string | null;
    attemptCount: number;
    lastAttemptAt: string | null;
    nextRetryAt: string | null;
    completedAt: string | null;
    failure: Failure | null;
    createdAt: string | null;
    updatedAt: string | null;
  }>;
  duplicates: Array<{
    id: string;
    sourceLeadgenId: { value: string; fingerprint: string } | null;
    reason: string;
    receiptId: string | null;
    canonicalReceiptId: string | null;
    createdAt: string | null;
  }>;
};

type LeadDetail = { lead: Lead; trace: LeadTrace };
type Pagination = { page: number; limit: number; total: number; pages: number };

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED', 'LOST'];

function time(value?: string | null) {
  return value ? new Date(value).toLocaleString('en-BD') : '—';
}

function safeText(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object' && value && 'value' in value) return String((value as { value?: unknown }).value ?? '—');
  return String(value);
}

function tone(value: string): BadgeTone {
  if (['PROCESSED', 'SUCCEEDED', 'COMPLETED', 'CONVERTED', 'HEALTHY', 'GRANTED', 'ACTIVE'].includes(value)) return 'success';
  if (['FAILED', 'DEAD_LETTERED', 'BLOCKED', 'REVOKED', 'LOST'].includes(value)) return 'danger';
  if (['RECEIVED', 'QUEUED', 'PROCESSING', 'RETRYING', 'NEW', 'PENDING', 'APPROVAL_REQUIRED'].includes(value)) return 'warning';
  return 'neutral';
}

function failureText(failure?: Failure | null) {
  if (!failure) return '—';
  return [failure.code, failure.classification, failure.summary].filter(Boolean).join(' · ');
}

export default function MetaLeadCrmPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [failures, setFailures] = useState<WebhookFailure[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 100, total: 0, pages: 0 });
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [orderId, setOrderId] = useState('');
  const [contactOutcome, setContactOutcome] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    setMessage('');
    try {
      const query = new URLSearchParams({ page: String(page), limit: '100' });
      if (status) query.set('status', status);
      const [leadResult, failureResult] = await Promise.all([
        adminFetchJson<{ data: Lead[]; pagination: Pagination }>(`/api/admin/meta/leads?${query.toString()}`),
        adminFetchJson<{ data: WebhookFailure[] }>('/api/admin/meta/webhooks/leads?limit=50'),
      ]);
      setLeads(leadResult.data ?? []);
      setPagination(leadResult.pagination);
      setFailures(failureResult.data ?? []);
      setSelectedId((current) => current && leadResult.data.some((lead) => lead.id === current) ? current : leadResult.data[0]?.id ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Lead CRM load failed');
    } finally {
      setBusy(false);
    }
  }, [page, status]);

  const loadDetail = useCallback(async (leadId: string) => {
    try {
      const result = await adminFetchJson<LeadDetail>(`/api/admin/meta/leads/${leadId}`);
      setDetail(result);
    } catch (error) {
      setDetail(null);
      setMessage(error instanceof Error ? error.message : 'Lead trace load failed');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [loadDetail, selectedId]);

  const selected = useMemo(
    () => detail?.lead ?? leads.find((item) => item.id === selectedId) ?? null,
    [detail, leads, selectedId],
  );

  async function patchLead(body: Record<string, unknown>, success: string) {
    if (!selected) return;
    setBusy(true);
    setMessage('');
    try {
      await adminFetchJson(`/api/admin/meta/leads/${selected.id}`, { method: 'PATCH', json: body });
      setMessage(success);
      setOrderId('');
      setContactOutcome('');
      await Promise.all([load(), loadDetail(selected.id)]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Lead update failed');
    } finally {
      setBusy(false);
    }
  }

  const newCount = leads.filter((lead) => lead.status === 'NEW').length;
  const overdue = leads.filter((lead) => lead.status === 'NEW' && !lead.contactedAt && Date.now() - new Date(lead.receivedAt).getTime() > 15 * 60_000).length;
  const testLead = Boolean(selected?.isTestLead || detail?.trace.fetchAttempts.some((attempt) => attempt.isTestLead));

  return <div className="space-y-6 p-4 md:p-6">
    <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div><h1 className="text-2xl font-bold text-gray-900">Meta Lead Ads CRM</h1><p className="mt-1 text-sm text-gray-600">Receipt → processing attempt → normalized lead → CRM handoff and duplicate trace, with masked contact data.</p></div>
      <Button variant="secondary" onClick={() => void load()} disabled={busy}><RefreshCw className="h-4 w-4" /> Refresh</Button>
    </header>

    {message && <div className="rounded-xl border bg-white px-4 py-3 text-sm" role="status">{message}</div>}

    <div className="grid gap-4 sm:grid-cols-4">
      <Summary icon={Users} label="Loaded leads" value={leads.length} />
      <Summary icon={Clock3} label="New leads" value={newCount} />
      <Summary icon={AlertTriangle} label="SLA overdue" value={overdue} />
      <Summary icon={Workflow} label="Webhook failures" value={failures.length} />
    </div>

    <section className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4">
      <label className="text-sm font-medium">Pipeline status</label>
      <select className="rounded-lg border px-3 py-2 text-sm" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
        <option value="">All</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}
      </select>
      <span className="text-sm text-gray-500">{pagination.total} total · page {pagination.page} of {Math.max(1, pagination.pages)}</span>
      <div className="ml-auto flex gap-2"><Button variant="secondary" disabled={busy || page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button><Button variant="secondary" disabled={busy || page >= pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</Button></div>
    </section>

    <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
      <section className="overflow-hidden rounded-2xl border bg-white">
        <div className="overflow-x-auto"><table className="min-w-full text-sm">
          <thead className="bg-gray-50"><tr>{['Lead', 'Source', 'Contact', 'Status', 'Assigned', 'SLA', 'Duplicates'].map((heading) => <th key={heading} className="px-4 py-3 text-left">{heading}</th>)}</tr></thead>
          <tbody className="divide-y">{leads.map((lead) => <tr key={lead.id} className={selectedId === lead.id ? 'bg-gray-50' : ''} onClick={() => setSelectedId(lead.id)}>
            <td className="cursor-pointer px-4 py-3"><div className="flex items-center gap-2 font-medium">{safeText(lead.fullName)}{lead.isTestLead && <Badge tone="info">TEST</Badge>}</div><div className="text-xs text-gray-500">{lead.leadgenId}</div></td>
            <td className="px-4 py-3"><div>{safeText(lead.campaignName ?? lead.campaignId)}</div><div className="text-xs text-gray-500">Form {safeText(lead.formId)} · Ad {safeText(lead.adId)}</div></td>
            <td className="px-4 py-3"><div>{safeText(lead.phoneMasked)}</div><div className="text-xs text-gray-500">{safeText(lead.emailMasked)}</div></td>
            <td className="px-4 py-3"><Badge tone={tone(lead.status)}>{lead.status}</Badge><div className="mt-1 text-xs text-gray-500">{lead.retrievalStatus}</div></td>
            <td className="px-4 py-3">{safeText(lead.assignedToId)}<div className="text-xs text-gray-500">{safeText(lead.assignmentReason)}</div></td>
            <td className="px-4 py-3">{time(lead.receivedAt)}</td><td className="px-4 py-3">{lead.duplicateCount}</td>
          </tr>)}</tbody>
        </table></div>
      </section>

      <section className="space-y-4 rounded-2xl border bg-white p-5">
        <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Lead lifecycle</h2>{testLead && <Badge tone="info" leadingVisual={<TestTube2 className="h-3 w-3" />}>TEST LEAD</Badge>}</div>
        {!selected && <p className="text-sm text-gray-500">Select a lead.</p>}
        {selected && <>
          <div className="grid grid-cols-2 gap-2 text-sm"><span>City/area</span><strong>{safeText(selected.city)} / {safeText(selected.area)}</strong><span>Interest</span><strong>{safeText(selected.productInterest)}</strong><span>Contacts</span><strong>{selected.contactAttemptCount}</strong><span>Order</span><strong>{safeText(selected.convertedOrderId)}</strong></div>
          <div className="flex flex-wrap gap-2">{['CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'LOST'].map((next) => <Button key={next} variant="secondary" disabled={busy || selected.status === next} onClick={() => void patchLead({ status: next }, `Lead marked ${next}.`)}>{next}</Button>)}</div>
          <Input label="Contact outcome" value={contactOutcome} onChange={(event) => setContactOutcome(event.target.value)} />
          <Button variant="secondary" disabled={busy || !contactOutcome.trim()} onClick={() => void patchLead({ contactAttempt: { channel: 'PHONE', outcome: contactOutcome } }, 'Contact attempt recorded.')}>Record contact</Button>
          <Input label="Converted order ID" value={orderId} onChange={(event) => setOrderId(event.target.value)} />
          <Button disabled={busy || !orderId.trim()} onClick={() => void patchLead({ status: 'CONVERTED', convertedOrderId: orderId }, 'Lead linked to order and converted.')}>Mark converted</Button>
        </>}
      </section>
    </div>

    {detail && <section className="grid gap-4 xl:grid-cols-2">
      <TracePanel title="Receipt and processing" icon={Workflow}>
        {!detail.trace.receipt ? <p className="text-sm text-gray-500">No unified receipt linked to this lead.</p> : <div className="space-y-3">
          <div className="flex flex-wrap gap-2"><Badge tone={tone(detail.trace.receipt.state)}>{detail.trace.receipt.state}</Badge><Badge>{detail.trace.receipt.replayEligibility}</Badge>{detail.trace.receipt.deadLetteredAt && <Badge tone="danger">DEAD LETTER</Badge>}</div>
          <div className="grid gap-2 text-sm sm:grid-cols-2"><KeyValue label="Received" value={time(detail.trace.receipt.receivedAt)} /><KeyValue label="Next retry" value={time(detail.trace.receipt.nextRetryAt)} /><KeyValue label="Attempts" value={String(detail.trace.receipt.attemptCount)} /><KeyValue label="Duplicates" value={String(detail.trace.receipt.duplicateCount)} /><KeyValue label="Correlation" value={safeText(detail.trace.receipt.correlationId)} /><KeyValue label="Replay attempts" value={String(detail.trace.receipt.replayAttempt)} /></div>
          {detail.trace.receipt.identity && <div className="rounded-xl border p-3 text-sm"><strong>{detail.trace.receipt.identity.objectType}</strong><div className="mt-1 flex flex-wrap gap-2"><Badge tone={tone(detail.trace.receipt.identity.identityStatus)}>{detail.trace.receipt.identity.identityStatus}</Badge><Badge tone={tone(detail.trace.receipt.identity.permissionHealth)}>{detail.trace.receipt.identity.permissionHealth}</Badge></div><p className="mt-2 text-xs text-gray-500">Provider {safeText(detail.trace.receipt.identity.providerId)} · verified {time(detail.trace.receipt.identity.lastVerifiedAt)}</p></div>}
          {detail.trace.receipt.failure && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{failureText(detail.trace.receipt.failure)}</p>}
        </div>}
        <div className="space-y-2">{detail.trace.fetchAttempts.map((attempt) => <article key={attempt.id} className="rounded-xl border p-3 text-sm"><div className="flex flex-wrap gap-2"><Badge tone={tone(attempt.retrievalStatus)}>{attempt.retrievalStatus}</Badge>{attempt.isTestLead && <Badge tone="info">TEST</Badge>}<span>Attempt {attempt.retrievalAttempt}</span></div><p className="mt-2 text-xs text-gray-500">Last {time(attempt.lastRetrievalAt)} · next {time(attempt.nextRetrievalAt)}</p>{attempt.failure && <p className="mt-2 text-red-700">{failureText(attempt.failure)}</p>}</article>)}</div>
      </TracePanel>

      <TracePanel title="CRM handoff and duplicates" icon={CheckCircle2}>
        <div className="space-y-2">{detail.trace.handoffs.length === 0 ? <p className="text-sm text-gray-500">No CRM handoff records.</p> : detail.trace.handoffs.map((handoff) => <article key={handoff.id} className="rounded-xl border p-3 text-sm"><div className="flex flex-wrap gap-2"><Badge tone={tone(handoff.status)}>{handoff.status}</Badge><strong>{handoff.destination}</strong></div><p className="mt-2 text-xs text-gray-500">{safeText(handoff.targetType)} {safeText(handoff.targetId)} · attempts {handoff.attemptCount} · next {time(handoff.nextRetryAt)}</p>{handoff.failure && <p className="mt-2 text-red-700">{failureText(handoff.failure)}</p>}</article>)}</div>
        <div className="space-y-2">{detail.trace.duplicates.length === 0 ? <p className="text-sm text-gray-500">No duplicate lead records.</p> : detail.trace.duplicates.map((duplicate) => <article key={duplicate.id} className="rounded-xl border p-3 text-sm"><div className="flex flex-wrap gap-2"><Badge>{duplicate.reason}</Badge><span>{safeText(duplicate.sourceLeadgenId)}</span></div><p className="mt-1 text-xs text-gray-500">Receipt {safeText(duplicate.receiptId)} · {time(duplicate.createdAt)}</p></article>)}</div>
      </TracePanel>
    </section>}

    <section className="overflow-hidden rounded-2xl border bg-white">
      <div className="border-b px-5 py-4"><h2 className="font-semibold">Webhook failures & rejected notifications</h2></div>
      <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-gray-50"><tr>{['Received', 'Lead', 'Status', 'Attempts', 'Last attempt', 'Safe failure'].map((heading) => <th key={heading} className="px-4 py-3 text-left">{heading}</th>)}</tr></thead><tbody className="divide-y">{failures.map((item) => <tr key={item.id}><td className="px-4 py-3">{time(item.receivedAt)}</td><td className="px-4 py-3">{safeText(item.leadgenId)}</td><td className="px-4 py-3"><Badge tone={tone(item.status)}>{item.status}</Badge></td><td className="px-4 py-3">{item.attemptCount}</td><td className="px-4 py-3">{time(item.lastAttemptAt)}</td><td className="max-w-lg px-4 py-3">{failureText(item.failure)}</td></tr>)}</tbody></table></div>
    </section>
  </div>;
}

function Summary({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return <div className="rounded-2xl border bg-white p-4"><Icon className="h-5 w-5 text-gray-500" /><div className="mt-3 text-2xl font-bold">{value}</div><div className="text-sm text-gray-500">{label}</div></div>;
}

function TracePanel({ title, icon: Icon, children }: { title: string; icon: typeof Workflow; children: React.ReactNode }) {
  return <section className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="flex items-center gap-2 font-semibold"><Icon className="h-5 w-5 text-gray-500" />{title}</h2>{children}</section>;
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border p-3"><div className="text-xs uppercase tracking-wide text-gray-500">{label}</div><div className="mt-1 break-all font-medium">{value}</div></div>;
}
