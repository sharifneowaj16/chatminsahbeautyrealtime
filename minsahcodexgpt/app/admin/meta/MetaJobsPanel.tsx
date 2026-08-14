'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, RotateCcw, Square, Workflow } from 'lucide-react';
import { adminFetchJson } from '@/lib/adminFetch';
import { Button } from '@/components/ui/Button';
import { Badge, type BadgeTone } from '@/components/ui/Badge';

type Failure = {
  code: string;
  classification?: string;
  summary?: string;
  retryAt?: string;
  reconciliationRequired?: boolean;
} | null;
type Eligibility = { allowed: boolean; reasonCode: string; approvalRequired: boolean; dedupeEnforced?: boolean };
type Job = {
  id: string;
  queueName: string | null;
  jobName: string | null;
  externalJobId: string | null;
  idempotencyKey: string | null;
  correlationId: string | null;
  status: string;
  attempts: number;
  maxAttempts: number;
  progress: number | null;
  sourceId: string | null;
  failure: Failure;
  replayOfId: string | null;
  replayCount: number;
  requestedBy: string | null;
  nextRunAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  lastHeartbeatAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  replayEligibility: Eligibility;
  cancelEligibility: Eligibility;
};
type JobsResponse = {
  jobs: Job[];
  counts: Record<string, Record<string, number>>;
  controls: {
    replay: { enabled: boolean; reasonCode: string };
    cancel: { enabled: boolean; reasonCode: string };
  };
  pageInfo: { limit: number; hasMore: boolean; nextCursor: string | null };
};

function date(value?: string | null) {
  return value ? new Date(value).toLocaleString('en-BD') : '—';
}
function tone(value: string): BadgeTone {
  if (['SUCCEEDED', 'COMPLETED'].includes(value)) return 'success';
  if (['FAILED', 'DEAD_LETTER', 'CANCELLED'].includes(value)) return 'danger';
  if (['QUEUED', 'RUNNING', 'RETRYING'].includes(value)) return 'warning';
  return 'neutral';
}
function failureText(value: Failure) {
  return value ? [value.code, value.classification, value.summary].filter(Boolean).join(' · ') : '—';
}

export default function MetaJobsPanel({ canOperate }: { canOperate: boolean }) {
  const [data, setData] = useState<JobsResponse | null>(null);
  const [status, setStatus] = useState('');
  const [queueName, setQueueName] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async (options?: { append?: boolean; cursor?: string | null }) => {
    setBusy(true);
    setNotice('');
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (status) params.set('status', status);
      if (queueName.trim()) params.set('queueName', queueName.trim());
      if (options?.cursor) params.set('cursor', options.cursor);
      const result = await adminFetchJson<JobsResponse>(`/api/admin/meta/jobs?${params.toString()}`);
      setData((previous) => options?.append && previous ? { ...result, jobs: [...previous.jobs, ...result.jobs] } : result);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Job visibility load failed');
    } finally {
      setBusy(false);
    }
  }, [queueName, status]);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => {
    const result: Record<string, number> = {};
    for (const states of Object.values(data?.counts ?? {})) {
      for (const [state, count] of Object.entries(states)) result[state] = (result[state] ?? 0) + count;
    }
    return result;
  }, [data]);

  async function requestApproval(job: Job, action: 'replay' | 'cancel') {
    const actionKey = action === 'replay' ? 'META_JOB_REPLAY' : 'META_JOB_CANCEL';
    const reason = action === 'replay'
      ? `Replay ${job.jobName ?? job.id} after reviewing its safe failure and dedupe state.`
      : `Cancel ${job.jobName ?? job.id} because the queued/running work should not continue.`;
    setBusy(true);
    setNotice('');
    try {
      await adminFetchJson('/api/admin/meta/approvals', {
        method: 'POST',
        json: {
          actionKey,
          resourceType: 'META_JOB_AUDIT',
          resourceId: job.id,
          payload: { auditId: job.id },
          reason,
        },
      });
      setNotice(`${action === 'replay' ? 'Replay' : 'Cancel'} approval requested. A different authorized approver must review it.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Approval request failed');
    } finally {
      setBusy(false);
    }
  }

  return <section className="space-y-4 rounded-2xl border bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-bold"><Workflow className="h-5 w-5 text-gray-500" /> Queue, retry, dead-letter and replay visibility</h2><p className="mt-1 text-sm text-gray-600">Durable jobs with retry schedule, sanitized failures, replay/cancel eligibility and approval-backed controls.</p></div><Button variant="secondary" disabled={busy} onClick={() => void load()}><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> Refresh</Button></div>
    {notice && <p className="rounded-xl border bg-amber-50 p-3 text-sm text-amber-900" role="status">{notice}</p>}
    {data && <>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{['QUEUED', 'RUNNING', 'RETRYING', 'FAILED', 'DEAD_LETTER', 'CANCELLED'].map((state) => <div key={state} className="rounded-xl border p-3"><Badge tone={tone(state)}>{state}</Badge><div className="mt-2 text-2xl font-bold">{totals[state] ?? 0}</div></div>)}</div>
      <div className="flex flex-wrap gap-3 rounded-xl border p-3">
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border px-3 py-2 text-sm"><option value="">All states</option>{['QUEUED', 'RUNNING', 'RETRYING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'DEAD_LETTER'].map((value) => <option key={value}>{value}</option>)}</select>
        <input value={queueName} onChange={(event) => setQueueName(event.target.value)} placeholder="Known queue name" className="rounded-xl border px-3 py-2 text-sm" />
        <div className="ml-auto flex flex-wrap gap-2"><Badge tone={data.controls.replay.enabled ? 'success' : 'danger'}>Replay: {data.controls.replay.reasonCode}</Badge><Badge tone={data.controls.cancel.enabled ? 'success' : 'danger'}>Cancel: {data.controls.cancel.reasonCode}</Badge></div>
      </div>
      <div className="space-y-3">{data.jobs.length === 0 ? <p className="text-sm text-gray-500">No jobs match the filters.</p> : data.jobs.map((job) => <article key={job.id} className="rounded-xl border p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><strong>{job.jobName ?? job.id}</strong><Badge tone={tone(job.status)}>{job.status}</Badge>{job.replayOfId && <Badge tone="info">REPLAY OF {job.replayOfId}</Badge>}</div>
            <p className="mt-1 break-all text-xs text-gray-500">{job.queueName ?? 'unknown queue'} · attempts {job.attempts}/{job.maxAttempts} · replay count {job.replayCount} · updated {date(job.updatedAt)}</p>
            <div className="mt-3 grid gap-2 text-sm md:grid-cols-3"><KeyValue label="Next retry" value={date(job.nextRunAt)} /><KeyValue label="Last heartbeat" value={date(job.lastHeartbeatAt)} /><KeyValue label="Correlation" value={job.correlationId ?? '—'} /></div>
            <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">{failureText(job.failure)}</p>
            <div className="mt-2 flex flex-wrap gap-2"><Badge tone={job.replayEligibility.allowed ? 'success' : 'warning'}>Replay: {job.replayEligibility.reasonCode}</Badge><Badge tone={job.cancelEligibility.allowed ? 'success' : 'warning'}>Cancel: {job.cancelEligibility.reasonCode}</Badge>{job.failure?.reconciliationRequired && <Badge tone="danger">RECONCILIATION REQUIRED</Badge>}</div>
          </div>
          {canOperate && <div className="flex shrink-0 flex-wrap gap-2"><Button variant="secondary" disabled={busy || !job.replayEligibility.allowed} onClick={() => void requestApproval(job, 'replay')}><RotateCcw className="h-4 w-4" /> Request replay</Button><Button variant="danger" disabled={busy || !job.cancelEligibility.allowed} onClick={() => void requestApproval(job, 'cancel')}><Square className="h-4 w-4" /> Request cancel</Button></div>}
        </div>
      </article>)}</div>
      {data.pageInfo.hasMore && <Button variant="secondary" disabled={busy || !data.pageInfo.nextCursor} onClick={() => void load({ append: true, cursor: data.pageInfo.nextCursor })}>Load more jobs</Button>}
    </>}
  </section>;
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border p-2"><div className="text-xs uppercase tracking-wide text-gray-500">{label}</div><div className="mt-1 break-all font-medium">{value}</div></div>;
}
