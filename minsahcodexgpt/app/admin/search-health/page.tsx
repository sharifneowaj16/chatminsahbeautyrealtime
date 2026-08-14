'use client';


import { Button } from '@/components/ui/Button';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  SearchCheck,
  ServerCrash,
  ShieldAlert,
  XCircle,
} from 'lucide-react';

type SearchHealth = {
  ok: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'error';
  responseTime: number;
  search?: {
    source: 'elasticsearch' | 'database_fallback' | 'unavailable';
    degraded: boolean;
    fallbackActive: boolean;
    message: string;
  };
  elasticsearch?: {
    connected: boolean;
    clusterHealth: string;
    version: string;
  };
  index?: {
    name: string;
    exists: boolean;
    documentCount: number;
    sizeInBytes?: number;
    documentsCount?: number;
  };
  databaseFallback?: {
    ok: boolean;
    reachable: boolean;
    activeProductCount: number;
    responseTime: number;
    error?: string;
  };
  timestamp: string;
  error?: string;
};

function statusClasses(status?: SearchHealth['status']) {
  if (status === 'healthy') return 'border-green-200 bg-green-50 text-green-800';
  if (status === 'degraded') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-red-200 bg-red-50 text-red-800';
}

function statusIcon(status?: SearchHealth['status']) {
  if (status === 'healthy') return <CheckCircle2 className="h-5 w-5" />;
  if (status === 'degraded') return <AlertTriangle className="h-5 w-5" />;
  return <XCircle className="h-5 w-5" />;
}

export default function AdminSearchHealthPage() {
  const [snapshot, setSnapshot] = useState<SearchHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search/health?details=true', {
        cache: 'no-store',
        credentials: 'include',
      });
      const body = await response.json();

      if (!response.ok && response.status !== 503) {
        throw new Error(body?.error || body?.message || 'Unable to load detailed search health');
      }

      setSnapshot(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load detailed search health');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  const sourceLabel = useMemo(() => {
    if (!snapshot?.search?.source) return 'Unknown';
    if (snapshot.search.source === 'elasticsearch') return 'Elasticsearch';
    if (snapshot.search.source === 'database_fallback') return 'Database fallback';
    return 'Unavailable';
  }, [snapshot?.search?.source]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Search Operations</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">Search Health</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Phase 27 dashboard for Elasticsearch availability and Prisma database fallback status.
            </p>
          </div>

          <Button
            onClick={loadHealth}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5" />
              <div>
                <h2 className="font-bold">Detailed health unavailable</h2>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </section>
        )}

        {loading && !snapshot ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading search health…
          </section>
        ) : snapshot ? (
          <>
            <section className={`rounded-2xl border p-5 shadow-sm ${statusClasses(snapshot.status)}`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  {statusIcon(snapshot.status)}
                  <div>
                    <h2 className="text-lg font-bold capitalize">Search status: {snapshot.status}</h2>
                    <p className="mt-1 text-sm">{snapshot.search?.message || snapshot.error || 'No status message returned.'}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-white/70 px-4 py-3 text-sm font-semibold shadow-sm">
                  Current source: {sourceLabel}
                </div>
              </div>
            </section>

            {snapshot.search?.fallbackActive && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm">
                <div className="flex items-start gap-3">
                  <ServerCrash className="mt-0.5 h-5 w-5" />
                  <div>
                    <h2 className="font-bold">Elasticsearch down — search using DB fallback</h2>
                    <p className="mt-1 text-sm">
                      Customer search requests are still served from Prisma, but ranking, ES highlighting, spell correction, and ES facets may be degraded until Elasticsearch recovers.
                    </p>
                  </div>
                </div>
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <SearchCheck className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Search Source</span>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-950">{sourceLabel}</p>
                <p className="mt-1 text-sm text-slate-500">Response time: {snapshot.responseTime}ms</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <ServerCrash className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Elasticsearch</span>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-950">
                  {snapshot.elasticsearch?.connected ? 'Connected' : 'Disconnected'}
                </p>
                <p className="mt-1 text-sm text-slate-500">Cluster: {snapshot.elasticsearch?.clusterHealth ?? 'unknown'}</p>
                <p className="mt-1 text-sm text-slate-500">Index: {snapshot.index?.name ?? 'unknown'} / {snapshot.index?.exists ? 'exists' : 'missing'}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <Database className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Database fallback</span>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-950">
                  {snapshot.databaseFallback?.ok ? 'Ready' : 'Unavailable'}
                </p>
                <p className="mt-1 text-sm text-slate-500">Active searchable products: {snapshot.databaseFallback?.activeProductCount ?? 0}</p>
                <p className="mt-1 text-sm text-slate-500">DB response: {snapshot.databaseFallback?.responseTime ?? 0}ms</p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Phase 27 pass criteria</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                  <strong>ES healthy:</strong> API returns <code className="rounded bg-white px-1">source: elasticsearch</code>.
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                  <strong>ES down:</strong> API returns <code className="rounded bg-white px-1">source: database_fallback</code>.
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                  <strong>Safety:</strong> fallback filters products with <code className="rounded bg-white px-1">isActive=true</code> and <code className="rounded bg-white px-1">deletedAt=null</code>.
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                  <strong>Visibility:</strong> this dashboard shows degraded state and DB fallback readiness.
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
