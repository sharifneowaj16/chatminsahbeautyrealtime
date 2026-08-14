'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Link2,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldAlert,
  UserRoundCheck,
  Workflow,
} from 'lucide-react';
import { adminFetchJson } from '@/lib/adminFetch';
import { Button } from '@/components/ui/Button';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { PERMISSIONS, useAdminAuth } from '@/contexts/AdminAuthContext';

type Failure = {
  code: string;
  classification?: string;
  summary?: string;
  retryAt?: string;
  reconciliationRequired?: boolean;
};

type Health = {
  configured: boolean;
  accountConfigured: boolean;
  tokenConfigured: boolean;
  appSecretConfigured: boolean;
  verifyTokenConfigured: boolean;
  permissionGranted: boolean;
  connectionStatus: string;
  identityStatus: string;
  permissionHealth: string;
  lastCheckedAt: string | null;
  lastSuccessfulAt: string | null;
  tokenExpiresAt: string | null;
  dataAccessExpiresAt: string | null;
  accountLastVerifiedAt: string | null;
  revokedAt: string | null;
  disabledAt: string | null;
  replyEnabled: boolean;
  cutover: {
    valid: boolean;
    read: { mode: string; authority: string; reasonCode: string; platformInstagramEnabled: boolean; platformWebhookEnabled: boolean };
    outbound: { mode: string; authority: string; reasonCode: string; standardReplyEnabled: boolean; privateReplyEnabled: boolean };
    media: { mode: string; authority: string; reasonCode: string; downloadsEnabled: boolean };
    rollbackAvailable: boolean;
    durableStatePreservedOnRollback: boolean;
  };
  replyControl: {
    standard: { enabled: boolean; reasonCode: string; blockers: string[]; evaluatedAt: string };
    private: { enabled: boolean; reasonCode: string; blockers: string[]; evaluatedAt: string };
  };
  failure: Failure | null;
  states: {
    webhooks: Record<string, number>;
    conversations: Record<string, number>;
    messages: Record<string, number>;
    providerDelivery: Record<string, number>;
    replies: Record<string, number>;
    reconciliation: Record<string, number>;
    privateReplies: Record<string, number>;
    jobs: Record<string, number>;
  };
  deadLetters: Array<{
    id: string;
    queueName: string;
    jobName: string;
    status: string;
    attempts: number;
    maxAttempts: number;
    nextRunAt: string | null;
    updatedAt: string | null;
    failure: Failure | null;
  }>;
  checkedAt: string;
};

type Attachment = {
  id: string;
  type: string;
  status: string;
  storageUrl: string | null;
  thumbnailUrl: string | null;
  mimeType: string | null;
  fileName: string | null;
  fileSize: number | null;
  failureCode: string | null;
  quarantined: boolean;
};

type ReplyAttempt = {
  id: string;
  mode: string;
  eligibility: string;
  status: string;
  providerStatus: string;
  reconciliationStatus: string;
  attemptedAt: string | null;
  completedAt: string | null;
  reconciledAt: string | null;
  failure: Failure | null;
};

type Message = {
  id: string;
  platformId: string;
  direction: string;
  messageType: string;
  status: string;
  providerStatus: string;
  text: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  privateReplyExpiresAt: string | null;
  attachments: Attachment[];
  replyAttempts: ReplyAttempt[];
};

type LinkRow = {
  id: string;
  linkType: string;
  targetId: string;
  verificationMethod: string;
  linkedAt: string | null;
};

type ReplyEligibility = {
  standard: { allowed: boolean; reasonCode: string; expiresAt: string | null };
  private: { allowed: boolean; reasonCode: string; expiresAt: string | null };
  evaluatedAt: string;
};

type Conversation = {
  id: string;
  platformId: string;
  participantId: string;
  participantUsername: string | null;
  participantName: string | null;
  assignedToId: string | null;
  status: string;
  tags: string[];
  subject: string | null;
  lastMessageAt: string | null;
  lastActivityAt: string | null;
  lastInboundAt: string | null;
  replyWindowExpiresAt: string | null;
  privateReplySentAt: string | null;
  replyEligibility: ReplyEligibility;
  messages: Message[];
  links: LinkRow[];
  replyAttempts: ReplyAttempt[];
  updatedAt: string | null;
};

type ConversationPage = {
  conversations: Conversation[];
  pageInfo: { limit: number; hasMore: boolean; nextCursor: string | null };
};

function date(value?: string | null) {
  return value ? new Date(value).toLocaleString('en-BD') : '—';
}

function tone(value: string): BadgeTone {
  if (['HEALTHY', 'GRANTED', 'ACTIVE', 'VERIFIED', 'READY', 'DELIVERED', 'READ', 'SUCCEEDED', 'PROCESSED', 'ELIGIBLE'].includes(value)) return 'success';
  if (['FAILED', 'DEAD_LETTER', 'DEAD_LETTERED', 'REVOKED', 'DISABLED', 'BLOCKED', 'QUARANTINED', 'INVALID_TOKEN'].includes(value)) return 'danger';
  if (['PENDING', 'QUEUED', 'PROCESSING', 'RETRYING', 'RECONCILIATION_REQUIRED', 'UNKNOWN'].includes(value)) return 'warning';
  return 'neutral';
}

function failureText(failure?: Failure | null) {
  if (!failure) return '—';
  return [failure.code, failure.classification, failure.summary].filter(Boolean).join(' · ');
}

export default function InstagramSocialCrmPage() {
  const { hasPermission } = useAdminAuth();
  const canOperate = hasPermission(PERMISSIONS.META_SOCIAL_OPERATE);
  const canLink = hasPermission(PERMISSIONS.META_SOCIAL_LINK);
  const [health, setHealth] = useState<Health | null>(null);
  const [items, setItems] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [pageInfo, setPageInfo] = useState<ConversationPage['pageInfo']>({ limit: 50, hasMore: false, nextCursor: null });
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [query, setQuery] = useState('');
  const [reply, setReply] = useState('');
  const [assignee, setAssignee] = useState('');
  const [tags, setTags] = useState('');
  const [linkType, setLinkType] = useState('LEAD');
  const [targetId, setTargetId] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async (options?: { append?: boolean; cursor?: string | null }) => {
    const params = new URLSearchParams({ limit: '50' });
    if (statusFilter) params.set('status', statusFilter);
    if (query.trim()) params.set('q', query.trim());
    if (options?.cursor) params.set('cursor', options.cursor);
    const [healthData, conversationData] = await Promise.all([
      adminFetchJson<{ health: Health }>('/api/admin/meta/instagram/health'),
      adminFetchJson<ConversationPage>(`/api/admin/meta/instagram/conversations?${params.toString()}`),
    ]);
    setHealth(healthData.health);
    setItems((previous) => options?.append ? [...previous, ...conversationData.conversations] : conversationData.conversations);
    setPageInfo(conversationData.pageInfo);
  }, [query, statusFilter]);

  useEffect(() => {
    void load().catch((error) => setNotice(error instanceof Error ? error.message : 'Load failed'));
  }, [load]);

  const openConversation = useCallback(async (id: string) => {
    setBusy(true);
    setNotice('');
    try {
      const data = await adminFetchJson<{ conversation: Conversation }>(`/api/admin/meta/instagram/conversations/${id}`);
      setSelected(data.conversation);
      setAssignee(data.conversation.assignedToId ?? '');
      setTags(data.conversation.tags.join(', '));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Conversation load failed');
    } finally {
      setBusy(false);
    }
  }, []);

  const mutate = async (
    endpoint: string,
    body: Record<string, unknown>,
    success: string,
    method: 'POST' | 'PATCH' | 'DELETE' = 'POST',
  ) => {
    setBusy(true);
    setNotice('');
    try {
      await adminFetchJson(endpoint, { method, json: body });
      setNotice(success);
      await load();
      if (selected) await openConversation(selected.id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const sourceMessage = useMemo(
    () => selected ? [...selected.messages].reverse().find((message) => message.direction === 'INBOUND') ?? null : null,
    [selected],
  );

  const sendReply = (mode: 'MESSAGE' | 'PRIVATE_REPLY') => {
    if (!selected || !reply.trim()) return;
    void mutate(
      `/api/admin/meta/instagram/conversations/${selected.id}/reply`,
      {
        text: reply.trim(),
        mode,
        sourceMessageId: sourceMessage?.id ?? null,
        reason: mode === 'PRIVATE_REPLY' ? 'Operator requested policy-checked private reply' : 'Operator requested policy-checked standard reply',
      },
      mode === 'PRIVATE_REPLY' ? 'Private reply queued.' : 'Standard reply queued.',
    ).then(() => setReply(''));
  };

  return <main className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Link href="/admin/meta" className="mb-2 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"><ArrowLeft className="h-4 w-4" /> Meta Operations Center</Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><MessageCircle className="h-6 w-6" /> Instagram Social CRM</h1>
        <p className="mt-1 text-sm text-gray-600">Webhook, queue, permission, delivery, reconciliation and reply-policy state from the durable platform.</p>
      </div>
      <Button disabled={busy} onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
    </header>

    {health && <>
      <section className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-4">
        <HealthCard label="Configuration" ok={health.configured} value={health.configured ? 'Configured' : 'Incomplete'} />
        <HealthCard label="Messaging permission" ok={health.permissionGranted} value={health.permissionHealth} />
        <HealthCard label="Account identity" ok={health.identityStatus === 'VERIFIED' || health.identityStatus === 'ACTIVE'} value={health.identityStatus} />
        <HealthCard label="Instagram cutover" ok={health.cutover.valid && health.cutover.read.authority === 'PLATFORM'} value={`${health.cutover.read.mode} / ${health.cutover.read.authority}`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Workflow className="h-4 w-4" /> Operational state</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <StateGroup title="Webhook receipts" values={health.states.webhooks} />
            <StateGroup title="Messages" values={health.states.messages} />
            <StateGroup title="Provider delivery" values={health.states.providerDelivery} />
            <StateGroup title="Queue jobs" values={health.states.jobs} />
            <StateGroup title="Reply attempts" values={health.states.replies} />
            <StateGroup title="Reconciliation" values={health.states.reconciliation} />
            <StateGroup title="Private replies" values={health.states.privateReplies} />
            <StateGroup title="Conversations" values={health.states.conversations} />
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><ShieldAlert className="h-4 w-4" /> Account checks</h2>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <KeyValue label="Connection" value={health.connectionStatus} />
            <KeyValue label="Last checked" value={date(health.lastCheckedAt)} />
            <KeyValue label="Last successful" value={date(health.lastSuccessfulAt)} />
            <KeyValue label="Identity verified" value={date(health.accountLastVerifiedAt)} />
            <KeyValue label="Token expires" value={date(health.tokenExpiresAt)} />
            <KeyValue label="Data access expires" value={date(health.dataAccessExpiresAt)} />
            <KeyValue label="Standard reply control" value={health.replyControl.standard.reasonCode} />
            <KeyValue label="Private reply control" value={health.replyControl.private.reasonCode} />
            <KeyValue label="Read cutover" value={`${health.cutover.read.mode}: ${health.cutover.read.reasonCode}`} />
            <KeyValue label="Outbound cutover" value={`${health.cutover.outbound.mode}: ${health.cutover.outbound.reasonCode}`} />
            <KeyValue label="Media downloads" value={health.cutover.media.downloadsEnabled ? 'ENABLED' : health.cutover.media.reasonCode} />
            <KeyValue label="Rollback durability" value={health.cutover.durableStatePreservedOnRollback ? 'PRESERVED' : 'UNKNOWN'} />
          </div>
          {health.failure && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{failureText(health.failure)}</p>}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-white">
        <div className="border-b px-4 py-3"><h2 className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Dead-letter and failed jobs</h2></div>
        {health.deadLetters.length === 0 ? <p className="p-4 text-sm text-gray-500">No Instagram dead-letter or failed jobs.</p> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-gray-50"><tr>{['Job','State','Attempts','Next run','Safe failure'].map((heading) => <th key={heading} className="px-4 py-3 text-left">{heading}</th>)}</tr></thead><tbody className="divide-y">{health.deadLetters.map((job) => <tr key={job.id}><td className="px-4 py-3"><strong>{job.jobName}</strong><div className="text-xs text-gray-500">{job.queueName}</div></td><td className="px-4 py-3"><Badge tone={tone(job.status)}>{job.status}</Badge></td><td className="px-4 py-3">{job.attempts}/{job.maxAttempts}</td><td className="px-4 py-3">{date(job.nextRunAt)}</td><td className="max-w-lg px-4 py-3">{failureText(job.failure)}</td></tr>)}</tbody></table></div>}
      </section>
    </>}

    {notice && <div className="rounded-xl border bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">{notice}</div>}

    <section className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <aside className="rounded-2xl border bg-white">
        <div className="space-y-3 border-b p-4">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search username, participant or message" className="w-full rounded-xl border px-3 py-2 text-sm" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm">
            {['OPEN', 'PENDING', 'RESOLVED', 'SPAM', 'ARCHIVED', ''].map((status) => <option key={status || 'all'} value={status}>{status || 'ALL'}</option>)}
          </select>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {items.map((item) => <button key={item.id} onClick={() => void openConversation(item.id)} className={`w-full border-b p-4 text-left hover:bg-gray-50 ${selected?.id === item.id ? 'bg-gray-50' : ''}`}>
            <div className="flex items-center justify-between gap-2"><strong className="truncate text-sm">@{item.participantUsername || item.participantName || item.participantId}</strong><Badge tone={tone(item.status)}>{item.status}</Badge></div>
            <p className="mt-1 line-clamp-2 text-xs text-gray-600">{item.messages?.[0]?.text || item.messages?.[0]?.messageType || 'No message preview'}</p>
            <div className="mt-2 flex flex-wrap gap-1"><Badge tone={item.replyEligibility.standard.allowed ? 'success' : 'warning'}>{item.replyEligibility.standard.reasonCode}</Badge>{item.replyEligibility.private.allowed && <Badge tone="info">PRIVATE_REPLY_ELIGIBLE</Badge>}</div>
            <p className="mt-2 text-[11px] text-gray-400">{date(item.lastActivityAt ?? item.lastMessageAt)}</p>
          </button>)}
          {items.length === 0 && <p className="p-6 text-sm text-gray-500">No conversations found.</p>}
          {pageInfo.hasMore && <div className="p-3"><Button fullWidth variant="secondary" disabled={busy || !pageInfo.nextCursor} onClick={() => void load({ append: true, cursor: pageInfo.nextCursor })}>Load more</Button></div>}
        </div>
      </aside>

      <section className="min-h-[60vh] rounded-2xl border bg-white p-4 md:p-5">
        {!selected && <div className="flex min-h-[50vh] items-center justify-center text-sm text-gray-500">Select a conversation.</div>}
        {selected && <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
            <div><h2 className="text-lg font-bold">@{selected.participantUsername || selected.participantName || selected.participantId}</h2><p className="text-xs text-gray-500">{selected.platformId}</p></div>
            <div className="flex flex-wrap gap-2"><Badge tone={tone(selected.status)}>{selected.status}</Badge><Badge tone={selected.replyEligibility.standard.allowed ? 'success' : 'warning'}>Standard: {selected.replyEligibility.standard.reasonCode}</Badge><Badge tone={selected.replyEligibility.private.allowed ? 'success' : 'neutral'}>Private: {selected.replyEligibility.private.reasonCode}</Badge></div>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <KeyValue label="Last inbound" value={date(selected.lastInboundAt)} />
            <KeyValue label="Standard expiry" value={date(selected.replyEligibility.standard.expiresAt)} />
            <KeyValue label="Private expiry" value={date(selected.replyEligibility.private.expiresAt)} />
          </div>

          <div className="max-h-[45vh] space-y-3 overflow-y-auto rounded-xl bg-gray-50 p-3">
            {selected.messages.map((message) => <article key={message.id} className={`max-w-[90%] rounded-2xl p-3 text-sm ${message.direction === 'OUTBOUND' ? 'ml-auto bg-gray-900 text-white' : 'bg-white shadow-sm'}`}>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] opacity-80"><Badge tone={tone(message.status)}>{message.status}</Badge><Badge tone={tone(message.providerStatus)}>{message.providerStatus}</Badge><span>{message.messageType}</span><span>{date(message.sentAt)}</span></div>
              {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
              {message.attachments.map((attachment) => <div key={attachment.id} className="mt-2 rounded-lg border border-current/20 p-2 text-xs">
                <div className="flex flex-wrap gap-2"><strong>{attachment.type}</strong><span>{attachment.status}</span>{attachment.quarantined && <span>QUARANTINED</span>}</div>
                {attachment.storageUrl ? <a href={attachment.storageUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block underline">Open validated attachment</a> : <p className="mt-1">{attachment.failureCode ?? 'Storage-only media is not ready.'}</p>}
              </div>)}
              {message.replyAttempts.length > 0 && <div className="mt-2 space-y-1 border-t border-current/20 pt-2">{message.replyAttempts.map((attempt) => <div key={attempt.id} className="text-xs"><strong>{attempt.mode}</strong> · {attempt.status} · provider {attempt.providerStatus} · reconciliation {attempt.reconciliationStatus}{attempt.failure ? ` · ${failureText(attempt.failure)}` : ''}</div>)}</div>}
            </article>)}
          </div>

          {selected.replyAttempts.length > 0 && <section className="rounded-xl border p-3"><h3 className="mb-2 font-semibold">Recent reply attempts</h3><div className="space-y-2">{selected.replyAttempts.map((attempt) => <div key={attempt.id} className="rounded-lg bg-gray-50 p-2 text-xs"><div className="flex flex-wrap gap-2"><Badge tone={tone(attempt.status)}>{attempt.status}</Badge><Badge>{attempt.mode}</Badge><span>Provider: {attempt.providerStatus}</span><span>Reconciliation: {attempt.reconciliationStatus}</span></div>{attempt.failure && <p className="mt-1 text-red-700">{failureText(attempt.failure)}</p>}</div>)}</div></section>}

          {canOperate && <div className="space-y-3 rounded-xl border p-3">
            <textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength={1000} placeholder="Policy-checked reply" className="min-h-24 w-full rounded-xl border p-3 text-sm" />
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy || !reply.trim() || !selected.replyEligibility.standard.allowed || !health?.replyControl.standard.enabled || !health?.cutover.outbound.standardReplyEnabled} onClick={() => sendReply('MESSAGE')}><Send className="h-4 w-4" /> Standard reply</Button>
              <Button variant="secondary" disabled={busy || !reply.trim() || !selected.replyEligibility.private.allowed || !health?.replyControl.private.enabled || !health?.cutover.outbound.privateReplyEnabled || !sourceMessage} onClick={() => sendReply('PRIVATE_REPLY')}><Send className="h-4 w-4" /> Private reply</Button>
            </div>
            {!health?.replyControl.standard.enabled && <p className="text-xs text-amber-700">Standard write control: {health?.replyControl.standard.reasonCode}</p>}
            {!health?.replyControl.private.enabled && <p className="text-xs text-amber-700">Private write control: {health?.replyControl.private.reasonCode}</p>}
            {!selected.replyEligibility.standard.allowed && <p className="text-xs text-amber-700">Standard reply blocked: {selected.replyEligibility.standard.reasonCode}</p>}
          </div>}

          {canOperate && <div className="grid gap-3 rounded-xl border p-3 md:grid-cols-3">
            <input value={assignee} onChange={(event) => setAssignee(event.target.value)} placeholder="Admin assignee ID" className="rounded-xl border px-3 py-2 text-sm" />
            <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="tags, comma, separated" className="rounded-xl border px-3 py-2 text-sm" />
            <select value={selected.status} onChange={(event) => void mutate(`/api/admin/meta/instagram/conversations/${selected.id}`, { status: event.target.value, reason: 'Operator changed conversation status' }, 'Conversation status updated.', 'PATCH')} className="rounded-xl border px-3 py-2 text-sm">{['OPEN','PENDING','RESOLVED','SPAM','ARCHIVED'].map((status) => <option key={status}>{status}</option>)}</select>
            <Button variant="secondary" onClick={() => void mutate(`/api/admin/meta/instagram/conversations/${selected.id}`, { assignedToId: assignee || null, reason: 'Operator changed assignment' }, 'Assignment updated.', 'PATCH')}><UserRoundCheck className="h-4 w-4" /> Save assignment</Button>
            <Button variant="secondary" onClick={() => void mutate(`/api/admin/meta/instagram/conversations/${selected.id}`, { tags: tags.split(',').map((item) => item.trim()).filter(Boolean), reason: 'Operator updated tags' }, 'Tags updated.', 'PATCH')}>Save tags</Button>
          </div>}

          {canLink && <div className="space-y-3 rounded-xl border p-3">
            <div className="grid gap-3 md:grid-cols-[160px_1fr_auto]"><select value={linkType} onChange={(event) => setLinkType(event.target.value)} className="rounded-xl border px-3 py-2 text-sm">{['CUSTOMER','LEAD','PRODUCT','ORDER'].map((type) => <option key={type}>{type}</option>)}</select><input value={targetId} onChange={(event) => setTargetId(event.target.value)} placeholder="Verified target ID" className="rounded-xl border px-3 py-2 text-sm" /><Button disabled={!targetId.trim()} onClick={() => void mutate(`/api/admin/meta/instagram/conversations/${selected.id}/links`, { linkType, targetId, verificationMethod: 'EXPLICIT_ADMIN', reason: 'Operator verified CRM relationship' }, 'CRM link added.')}><Link2 className="h-4 w-4" /> Link</Button></div>
            <div className="flex flex-wrap gap-2">{selected.links.map((link) => <Badge key={link.id} tone="info">{link.linkType}: {link.targetId}</Badge>)}</div>
          </div>}
        </div>}
      </section>
    </section>
  </main>;
}

function HealthCard({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return <div className="rounded-xl border p-3">{ok ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <ShieldAlert className="h-5 w-5 text-amber-600" />}<p className="mt-2 text-xs text-gray-500">{label}</p><strong className="text-sm">{value}</strong></div>;
}

function StateGroup({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values);
  return <div className="rounded-xl border p-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>{entries.length === 0 ? <p className="text-sm text-gray-500">No records</p> : <div className="flex flex-wrap gap-2">{entries.map(([status, count]) => <Badge key={status} tone={tone(status)}>{status}: {count}</Badge>)}</div>}</div>;
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border p-3"><div className="text-xs uppercase tracking-wide text-gray-500">{label}</div><div className="mt-1 break-words font-medium">{value}</div></div>;
}
