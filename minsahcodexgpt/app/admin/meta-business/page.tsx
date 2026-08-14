'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, Database, Users, Megaphone, BarChart3 } from 'lucide-react';
import { adminFetchJson } from '@/lib/adminFetch';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type RecordData = Record<string, unknown>;
type CursorPayload = { data?: RecordData[] };
type Readiness = Record<string, unknown>;

function asRows(value: unknown): RecordData[] {
  if (!value || typeof value !== 'object') return [];
  const data = (value as CursorPayload).data;
  return Array.isArray(data) ? data : [];
}

function text(value: unknown) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

function moneyMinor(value: unknown) {
  const amount = Number(value ?? 0) / 100;
  return Number.isFinite(amount) ? `৳${amount.toLocaleString('en-BD')}` : '—';
}

export default function MetaBusinessPage() {
  const [readiness, setReadiness] = useState<Readiness>({});
  const [connection, setConnection] = useState<RecordData | null>(null);
  const [account, setAccount] = useState<RecordData | null>(null);
  const [campaigns, setCampaigns] = useState<RecordData[]>([]);
  const [adSets, setAdSets] = useState<RecordData[]>([]);
  const [audiences, setAudiences] = useState<RecordData[]>([]);
  const [insights, setInsights] = useState<RecordData[]>([]);
  const [leads, setLeads] = useState<RecordData[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [dailyBudget, setDailyBudget] = useState('3000');
  const [audienceName, setAudienceName] = useState('Minsah Customers');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');

  const load = useCallback(async () => {
    setBusy('load');
    setMessage('');
    const [settings, accountResult, campaignsResult, adSetsResult, audiencesResult, insightsResult, leadsResult] = await Promise.allSettled([
      adminFetchJson<{ readiness: Readiness; connection?: RecordData }>('/api/admin/meta/settings'),
      adminFetchJson<{ account: RecordData }>('/api/admin/meta/ad-account'),
      adminFetchJson<{ campaigns: CursorPayload }>('/api/admin/meta/campaigns'),
      adminFetchJson<{ adSets: CursorPayload }>('/api/admin/meta/adsets'),
      adminFetchJson<{ audiences: CursorPayload }>('/api/admin/meta/audiences'),
      adminFetchJson<{ insights: CursorPayload }>('/api/admin/meta/insights?level=campaign&datePreset=last_30d'),
      adminFetchJson<{ data: RecordData[] }>('/api/admin/meta/leads?limit=20'),
    ]);
    if (settings.status === 'fulfilled') { setReadiness(settings.value.readiness); setConnection(settings.value.connection ?? null); }
    if (accountResult.status === 'fulfilled') setAccount(accountResult.value.account);
    if (campaignsResult.status === 'fulfilled') setCampaigns(asRows(campaignsResult.value.campaigns));
    if (adSetsResult.status === 'fulfilled') setAdSets(asRows(adSetsResult.value.adSets));
    if (audiencesResult.status === 'fulfilled') setAudiences(asRows(audiencesResult.value.audiences));
    if (insightsResult.status === 'fulfilled') setInsights(asRows(insightsResult.value.insights));
    if (leadsResult.status === 'fulfilled') setLeads(leadsResult.value.data ?? []);
    const failures = [settings, accountResult, campaignsResult, adSetsResult, audiencesResult, insightsResult, leadsResult]
      .filter((item) => item.status === 'rejected').length;
    if (failures) setMessage(`${failures}টি Meta resource load হয়নি। Readiness/configuration যাচাই করুন।`);
    setBusy(null);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function runAction(key: string, action: () => Promise<unknown>, success: string) {
    setBusy(key); setMessage('');
    try { await action(); setMessage(success); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Operation failed'); }
    finally { setBusy(null); }
  }

  const createCampaign = () => runAction('campaign', () => adminFetchJson('/api/admin/meta/campaigns', {
    method: 'POST',
    json: { name: campaignName, objective: 'OUTCOME_SALES', status: 'PAUSED', dailyBudgetBdt: Number(dailyBudget) },
  }), 'Campaign Meta-তে PAUSED অবস্থায় তৈরি হয়েছে।');

  const createAudience = () => runAction('audience', () => adminFetchJson('/api/admin/meta/audiences', {
    method: 'POST', json: { name: audienceName, description: 'Minsah Beauty consented customer audience' },
  }), 'Custom Audience তৈরি হয়েছে।');

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meta Business Manager</h1>
          <p className="mt-1 text-sm text-gray-600">Marketing API, audiences, catalog, leads, offline events এবং ROAS reporting।</p>
        </div>
        <Button variant="secondary" onClick={() => void load()} disabled={busy === 'load'}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {message && <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">{message}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary icon={ShieldCheck} label="Connection status" value={text(connection?.status ?? 'UNVERIFIED')} />
        <Summary icon={Megaphone} label="Campaigns" value={`${campaigns.length}`} />
        <Summary icon={Users} label="Audiences" value={`${audiences.length}`} />
        <Summary icon={BarChart3} label="Stored leads" value={`${leads.length}`} />
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">Connection, token & API version health</h2>
            <p className="mt-1 text-sm text-gray-500">Asset IDs are API-verified; tokens and app secrets are never returned to this page.</p>
          </div>
          <Button variant="secondary" onClick={() => runAction('connection-recheck', () => adminFetchJson('/api/admin/meta/connection', { method: 'POST', json: { action: 'recheck' } }), 'Meta connection health recheck queued.')} disabled={busy === 'connection-recheck'}>
            <RefreshCw className="h-4 w-4" /> Recheck
          </Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['status', connection?.status],
            ['graphApiVersion', connection?.graphApiVersion ?? readiness.graphApiVersion],
            ['sdkVersion', connection?.sdkVersion ?? readiness.businessSdkVersion],
            ['lastCheckedAt', connection?.lastCheckedAt ?? connection?.checkedAt],
            ['tokenExpiresAt', connection?.tokenExpiresAt],
            ['dataAccessExpiresAt', connection?.dataAccessExpiresAt],
            ['tokenRef', connection?.tokenRef],
            ['warningCount', Array.isArray(connection?.warnings) ? connection?.warnings.length : 0],
          ].map(([key, value]) => (
            <div key={String(key)} className="rounded-xl bg-gray-50 p-3">
              <div className="text-xs text-gray-500">{String(key)}</div>
              <div className="mt-1 break-all text-sm font-medium text-gray-900">{text(value)}</div>
            </div>
          ))}
        </div>
        {account && <p className="mt-4 text-sm text-gray-600">Ad account: <strong>{text(account.name)}</strong> · Currency: {text(account.currency)} · Status: {text(account.account_status)}</p>}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">Create Sales Campaign</h2>
          <p className="mt-1 text-sm text-gray-500">Safety default: নতুন campaign PAUSED থাকে।</p>
          <div className="mt-4 space-y-3">
            <Input label="Campaign name" value={campaignName} onChange={(event) => setCampaignName(event.target.value)} />
            <Input label="Daily budget (BDT)" type="number" min="0" value={dailyBudget} onChange={(event) => setDailyBudget(event.target.value)} />
            <Button onClick={createCampaign} disabled={!campaignName.trim() || busy === 'campaign'}>Create Campaign</Button>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">Audience & retargeting</h2>
          <div className="mt-4 space-y-3">
            <Input label="Custom audience name" value={audienceName} onChange={(event) => setAudienceName(event.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button onClick={createAudience} disabled={!audienceName.trim() || busy === 'audience'}>Create Customer Audience</Button>
              <Button variant="secondary" onClick={() => runAction('retarget', () => adminFetchJson('/api/admin/meta/audiences/retargeting', { method: 'POST', json: { name: 'Minsah AddToCart 30D', eventName: 'AddToCart', retentionDays: 30 } }), 'AddToCart retargeting audience তৈরি হয়েছে।')} disabled={busy === 'retarget'}>Create AddToCart 30D</Button>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Catalog, inventory, Lead Ads</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => runAction('catalog', () => adminFetchJson('/api/admin/meta/catalogs/sync', { method: 'POST', json: { inventoryOnly: false } }), 'Full product catalog sync submitted.')} disabled={busy === 'catalog'}><Database className="h-4 w-4" /> Full Catalog Sync</Button>
          <Button variant="secondary" onClick={() => runAction('inventory', () => adminFetchJson('/api/admin/meta/catalogs/sync', { method: 'POST', json: { inventoryOnly: true } }), 'Commerce inventory sync submitted.')} disabled={busy === 'inventory'}>Inventory Only Sync</Button>
          <Button variant="secondary" onClick={() => runAction('subscribe', () => adminFetchJson('/api/admin/meta/leads/subscribe', { method: 'POST', json: {} }), 'Page leadgen webhook subscription updated.')} disabled={busy === 'subscribe'}>Subscribe Lead Webhook</Button>
          <a href="/admin/meta-business/leads" className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Open Lead CRM</a>
        </div>
      </section>

      <DataTable title="Campaigns" rows={campaigns} columns={['name', 'objective', 'effective_status', 'daily_budget', 'budget_remaining']} moneyColumns={['daily_budget', 'budget_remaining']} />
      <DataTable title="Ad Sets" rows={adSets} columns={['name', 'campaign_id', 'optimization_goal', 'effective_status', 'daily_budget']} moneyColumns={['daily_budget']} />
      <DataTable title="30-day ROAS Insights" rows={insights} columns={['campaign_name', 'spend', 'calculated_purchase_value', 'calculated_purchases', 'calculated_roas']} />
      <DataTable title="Audiences" rows={audiences} columns={['name', 'subtype', 'approximate_count_lower_bound', 'approximate_count_upper_bound', 'operation_status']} />
    </div>
  );
}

function Summary({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: string }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-4"><Icon className="h-5 w-5 text-gray-500" /><div className="mt-3 text-2xl font-bold text-gray-900">{value}</div><div className="text-sm text-gray-500">{label}</div></div>;
}

function DataTable({ title, rows, columns, moneyColumns = [] }: { title: string; rows: RecordData[]; columns: string[]; moneyColumns?: string[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-5 py-4"><h2 className="font-semibold text-gray-900">{title}</h2></div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50"><tr>{columns.map((column) => <th key={column} className="px-4 py-3 text-left font-medium text-gray-600">{column}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">
            {rows.slice(0, 50).map((row, index) => <tr key={String(row.id ?? index)}>{columns.map((column) => <td key={column} className="whitespace-nowrap px-4 py-3 text-gray-700">{moneyColumns.includes(column) ? moneyMinor(row[column]) : text(row[column])}</td>)}</tr>)}
            {!rows.length && <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">No data</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
