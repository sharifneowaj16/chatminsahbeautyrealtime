type MetricKind = 'counter' | 'gauge' | 'histogram';
type Labels = Record<string, string>;

type Definition = {
  kind: MetricKind;
  help: string;
  labels: readonly string[];
  buckets?: readonly number[];
};

type Sample = { value: number; count?: number; sum?: number };

export const META_METRIC_DEFINITIONS = {
  meta_catalog_items_submitted_total: { kind: 'counter', help: 'Catalog items submitted to Meta.', labels: ['mode', 'outcome'] },
  meta_catalog_items_failed_total: { kind: 'counter', help: 'Catalog items that reached a failed state.', labels: ['reason'] },
  meta_catalog_sync_duration_seconds: { kind: 'histogram', help: 'Catalog synchronization duration.', labels: ['mode'], buckets: [1, 5, 15, 30, 60, 300, 600] },
  meta_catalog_batch_pending_seconds: { kind: 'gauge', help: 'Age of the oldest submitted catalog batch.', labels: ['catalog'] },
  meta_catalog_diagnostics_errors_total: { kind: 'counter', help: 'Catalog diagnostic issues imported.', labels: ['severity', 'issue_type'] },
  meta_capi_events_sent_total: { kind: 'counter', help: 'CAPI events sent.', labels: ['event_name', 'outcome'] },
  meta_capi_events_failed_total: { kind: 'counter', help: 'CAPI events failed.', labels: ['event_name', 'reason'] },
  meta_capi_delay_seconds: { kind: 'histogram', help: 'Delay between event time and CAPI delivery.', labels: ['event_name'], buckets: [1, 5, 15, 30, 60, 300, 900, 3600] },
  meta_webhook_received_total: { kind: 'counter', help: 'Meta webhooks received.', labels: ['object_type', 'outcome'] },
  meta_leads_created_total: { kind: 'counter', help: 'Meta leads persisted.', labels: ['source', 'outcome'] },
  meta_token_check_failed_total: { kind: 'counter', help: 'Meta token health checks failed.', labels: ['reason'] },
  meta_queue_backlog_total: { kind: 'gauge', help: 'Current Meta queue backlog.', labels: ['queue', 'status'] },
  meta_attribution_capture_total: { kind: 'counter', help: 'First-party attribution captures.', labels: ['model', 'outcome'] },
  meta_attribution_order_snapshot_total: { kind: 'counter', help: 'Immutable order attribution snapshots.', labels: ['outcome'] },
  meta_attribution_lead_order_link_total: { kind: 'counter', help: 'Lead-to-order attribution links.', labels: ['outcome'] },
  meta_attribution_first_touch_conflict_total: { kind: 'counter', help: 'Attempted first-touch overwrites that were ignored.', labels: ['outcome'] },
  meta_attribution_order_coverage_ratio: { kind: 'gauge', help: 'First-party attributed order coverage ratio.', labels: ['window'] },
  meta_product_set_rule_mutations_total: { kind: 'counter', help: 'Product set rule mutations.', labels: ['action', 'outcome'] },
  meta_product_set_sync_total: { kind: 'counter', help: 'Meta product set synchronization attempts.', labels: ['operation', 'outcome'] },
  meta_product_set_members_total: { kind: 'gauge', help: 'Current deterministic product set membership count.', labels: ['status'] },
  meta_incidents_open_total: { kind: 'gauge', help: 'Current open Meta incidents.', labels: ['severity', 'type'] },
  meta_instagram_messages_total: { kind: 'counter', help: 'Instagram messages processed by the social CRM.', labels: ['direction', 'outcome'] },
  meta_instagram_replies_total: { kind: 'counter', help: 'Instagram reply attempts by mode and outcome.', labels: ['mode', 'outcome'] },
} as const satisfies Record<string, Definition>;

export type MetaMetricName = keyof typeof META_METRIC_DEFINITIONS;
const BANNED_LABEL_KEYS = /(^|_)(id|token|email|phone|url|message|error_detail|retailer_id|order_id|event_id|job_id|lead_id)$/i;
const SAFE_VALUE = /^[A-Za-z0-9_.:-]{1,64}$/;
const globalStore = globalThis as unknown as { metaMetricSamples?: Map<string, Sample> };
const samples = globalStore.metaMetricSamples ?? new Map<string, Sample>();
if (process.env.NODE_ENV !== 'production') globalStore.metaMetricSamples = samples;

function normalizedLabels(name: MetaMetricName, labels: Labels) {
  const definition = META_METRIC_DEFINITIONS[name];
  const keys = Object.keys(labels).sort();
  const expected = [...definition.labels].sort();
  if (keys.join('|') !== expected.join('|')) throw new Error(`METRIC_LABEL_CONTRACT:${name}`);
  for (const [key, value] of Object.entries(labels)) {
    if (BANNED_LABEL_KEYS.test(key) || !SAFE_VALUE.test(value)) throw new Error(`METRIC_HIGH_CARDINALITY_LABEL:${name}:${key}`);
  }
  return Object.fromEntries(keys.map((key) => [key, labels[key]]));
}

function key(name: MetaMetricName, labels: Labels) {
  const safe = normalizedLabels(name, labels);
  return `${name}|${Object.entries(safe).map(([label, value]) => `${label}=${value}`).join(',')}`;
}

export function incrementMetaCounter(name: MetaMetricName, labels: Labels, amount = 1) {
  if (META_METRIC_DEFINITIONS[name].kind !== 'counter') throw new Error(`METRIC_NOT_COUNTER:${name}`);
  const sampleKey = key(name, labels);
  const current = samples.get(sampleKey)?.value ?? 0;
  samples.set(sampleKey, { value: current + Math.max(0, amount) });
}

export function setMetaGauge(name: MetaMetricName, labels: Labels, value: number) {
  if (META_METRIC_DEFINITIONS[name].kind !== 'gauge') throw new Error(`METRIC_NOT_GAUGE:${name}`);
  samples.set(key(name, labels), { value: Number.isFinite(value) ? value : 0 });
}

export function observeMetaHistogram(name: MetaMetricName, labels: Labels, value: number) {
  if (META_METRIC_DEFINITIONS[name].kind !== 'histogram') throw new Error(`METRIC_NOT_HISTOGRAM:${name}`);
  const sampleKey = key(name, labels);
  const current = samples.get(sampleKey) ?? { value: 0, count: 0, sum: 0 };
  samples.set(sampleKey, { value, count: (current.count ?? 0) + 1, sum: (current.sum ?? 0) + value });
}

function parseSampleKey(sampleKey: string) {
  const [name, labelText = ''] = sampleKey.split('|');
  return { name: name as MetaMetricName, labelText };
}

export function getMetaMetricsSnapshot() {
  return [...samples.entries()].map(([sampleKey, sample]) => ({ ...parseSampleKey(sampleKey), ...sample }));
}

export function renderMetaMetricsPrometheus() {
  const lines: string[] = [];
  for (const [name, definition] of Object.entries(META_METRIC_DEFINITIONS)) {
    lines.push(`# HELP ${name} ${definition.help}`);
    lines.push(`# TYPE ${name} ${definition.kind === 'histogram' ? 'summary' : definition.kind}`);
    for (const [sampleKey, sample] of samples.entries()) {
      const parsed = parseSampleKey(sampleKey);
      if (parsed.name !== name) continue;
      const labels = parsed.labelText ? `{${parsed.labelText.split(',').map((part) => {
        const [label, value] = part.split('='); return `${label}="${value}"`;
      }).join(',')}}` : '';
      if (definition.kind === 'histogram') {
        lines.push(`${name}_count${labels} ${sample.count ?? 0}`);
        lines.push(`${name}_sum${labels} ${sample.sum ?? 0}`);
      } else lines.push(`${name}${labels} ${sample.value}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

export function resetMetaMetricsForTests() { samples.clear(); }
