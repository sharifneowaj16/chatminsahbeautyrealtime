'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { adminFetchJson } from '@/lib/adminFetch';
import { Button } from '@/components/ui/Button';
import { Badge, type BadgeTone } from '@/components/ui/Badge';

type ProviderId = { value: string; fingerprint: string } | null;
type Failure = { code: string; classification?: string; summary?: string; retryAt?: string } | null;
type Asset = {
  id: string;
  environment: string;
  connectionKey: string | null;
  assetType: string;
  objectType: string;
  providerId: ProviderId;
  providerParentId: ProviderId;
  identityStatus: string;
  permissionHealth: string;
  lastSeenAt: string | null;
  lastVerifiedAt: string | null;
  disabledAt: string | null;
  revokedAt: string | null;
  statusReason: string | null;
  remediation: { code: string; action: string } | null;
  updatedAt: string | null;
};
type Scope = { scope: string; total: number; verified: number; unhealthy: number; revoked: number; assets: Asset[] };
type Health = {
  connection: null | {
    id: string;
    name: string | null;
    status: string;
    providerIds: Record<string, ProviderId>;
    graphApiVersion: string | null;
    sdkVersion: string | null;
    tokenExpiresAt: string | null;
    dataAccessExpiresAt: string | null;
    lastCheckedAt: string | null;
    lastSuccessfulAt: string | null;
    updatedAt: string | null;
    failure: Failure;
    checks: Array<{ id: string; status: string; tokenValid: boolean; appIdMatches: boolean; checkedAt: string | null; failure: Failure }>;
  };
  scopes: Scope[];
  checkedAt: string;
};

function date(value?: string | null) {
  return value ? new Date(value).toLocaleString('en-BD') : '—';
}
function tone(value: string): BadgeTone {
  if (['HEALTHY', 'GRANTED', 'VERIFIED', 'ACTIVE'].includes(value)) return 'success';
  if (['REVOKED', 'DISABLED', 'BLOCKED', 'MISSING', 'INSUFFICIENT', 'INVALID_TOKEN'].includes(value)) return 'danger';
  if (['UNKNOWN', 'UNVERIFIED', 'STALE', 'DEGRADED'].includes(value)) return 'warning';
  return 'neutral';
}
function provider(value: ProviderId) {
  return value ? `${value.value} · ${value.fingerprint}` : '—';
}
function failureText(value: Failure) {
  return value ? [value.code, value.classification, value.summary].filter(Boolean).join(' · ') : '—';
}

export default function ProviderHealthPanel() {
  const [health, setHealth] = useState<Health | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const result = await adminFetchJson<{ health: Health }>('/api/admin/meta/health');
      setHealth(result.health);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Provider health load failed');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return <section className="space-y-4 rounded-2xl border bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-gray-500" /> Provider asset and permission health</h2><p className="mt-1 text-sm text-gray-600">App, Business, Page, Instagram account, ad account and form identities with safe remediation.</p></div>
      <Button variant="secondary" disabled={busy} onClick={() => void load()}><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> Refresh</Button>
    </div>
    {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {!health && !error && <p className="text-sm text-gray-500">Loading provider health…</p>}
    {health && <>
      <div className="grid gap-3 md:grid-cols-4">
        <KeyValue label="Connection" value={health.connection?.status ?? 'UNCONFIGURED'} badge />
        <KeyValue label="Last checked" value={date(health.connection?.lastCheckedAt)} />
        <KeyValue label="Last successful" value={date(health.connection?.lastSuccessfulAt)} />
        <KeyValue label="Health snapshot" value={date(health.checkedAt)} />
      </div>
      {health.connection?.failure && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{failureText(health.connection.failure)}</p>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {health.scopes.map((scope) => <article key={scope.scope} className="rounded-xl border p-4">
          <div className="flex items-center justify-between gap-2"><strong>{scope.scope}</strong><Badge tone={scope.unhealthy || scope.revoked ? 'warning' : 'success'}>{scope.verified}/{scope.total} healthy</Badge></div>
          <p className="mt-1 text-xs text-gray-500">Unhealthy {scope.unhealthy} · revoked {scope.revoked}</p>
          <div className="mt-3 space-y-3">{scope.assets.length === 0 ? <p className="text-sm text-gray-500">No mapped assets.</p> : scope.assets.map((asset) => <div key={asset.id} className="rounded-lg bg-gray-50 p-3 text-sm">
            <div className="flex flex-wrap gap-2"><Badge tone={tone(asset.identityStatus)}>{asset.identityStatus}</Badge><Badge tone={tone(asset.permissionHealth)}>{asset.permissionHealth}</Badge></div>
            <p className="mt-2 break-all text-xs text-gray-600">{asset.objectType} · {provider(asset.providerId)}</p>
            <p className="mt-1 text-xs text-gray-500">Verified {date(asset.lastVerifiedAt)} · updated {date(asset.updatedAt)}</p>
            {asset.statusReason && <p className="mt-2 text-xs text-amber-800">{asset.statusReason}</p>}
            {asset.remediation && <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900"><strong>{asset.remediation.code}</strong><br />{asset.remediation.action}</p>}
          </div>)}</div>
        </article>)}
      </div>
      {health.connection && <div className="rounded-xl border p-4">
        <h3 className="font-semibold">Latest connection checks</h3>
        <div className="mt-3 space-y-2">{health.connection.checks.length === 0 ? <p className="text-sm text-gray-500">No connection checks recorded.</p> : health.connection.checks.map((check) => <div key={check.id} className="flex flex-col gap-2 rounded-lg bg-gray-50 p-3 text-sm md:flex-row md:items-center md:justify-between"><div className="flex flex-wrap gap-2"><Badge tone={tone(check.status)}>{check.status}</Badge><span>Token {check.tokenValid ? 'valid' : 'invalid'}</span><span>App ID {check.appIdMatches ? 'matches' : 'mismatch'}</span></div><span className="text-xs text-gray-500">{date(check.checkedAt)} · {failureText(check.failure)}</span></div>)}</div>
      </div>}
    </>}
  </section>;
}

function KeyValue({ label, value, badge = false }: { label: string; value: string; badge?: boolean }) {
  return <div className="rounded-xl border p-3"><div className="text-xs uppercase tracking-wide text-gray-500">{label}</div><div className="mt-2 font-semibold">{badge ? <Badge tone={tone(value)}>{value}</Badge> : value}</div></div>;
}
