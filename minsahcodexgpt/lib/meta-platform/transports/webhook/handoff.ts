import { metaWebhookRequestFailureMessage, type MetaWebhookRejectedRequest } from './route-handler';

export const META_WEBHOOK_HANDOFF_MAX_ITEMS = 1_000;

export const META_WEBHOOK_HANDOFF_DISPOSITIONS = Object.freeze([
  'ACCEPTED',
  'DUPLICATE',
  'DEFERRED',
  'REJECTED',
  'IGNORED',
] as const);

export type MetaWebhookHandoffDisposition = typeof META_WEBHOOK_HANDOFF_DISPOSITIONS[number];
export type MetaWebhookHandoffOutcome = MetaWebhookHandoffDisposition | 'MIXED';

export type MetaWebhookHandoffRecord = Readonly<{
  eventKey: string;
  disposition: MetaWebhookHandoffDisposition;
  receiptId?: string;
  code?: string;
}>;

export type MetaWebhookHandoffSummary = Readonly<{
  outcome: MetaWebhookHandoffOutcome;
  receiptFirst: true;
  total: number;
  accepted: number;
  deduplicated: number;
  deferred: number;
  rejected: number;
  ignored: number;
  records: readonly MetaWebhookHandoffRecord[];
}>;

export type MetaWebhookPublicResponse = Readonly<{
  ok: boolean;
  received: boolean;
  outcome: MetaWebhookHandoffOutcome;
  receiptFirst?: true;
  total?: number;
  accepted?: number;
  deduplicated?: number;
  deferred?: number;
  rejected?: number;
  ignored?: number;
  code?: string;
  error?: string;
}>;

const EVENT_KEY_MAX_LENGTH = 512;
const RECEIPT_ID_MAX_LENGTH = 512;
const CODE_MAX_LENGTH = 160;

function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean.length > 0 && clean.length <= maxLength ? clean : null;
}

function invalid(code: string): never {
  const error = new Error(code);
  error.name = 'MetaWebhookHandoffError';
  throw error;
}

function normalizeHandoffRecord(input: {
  readonly eventKey: string;
  readonly result: Omit<MetaWebhookHandoffRecord, 'eventKey'>;
}): MetaWebhookHandoffRecord {
  const resultKeys = Object.keys(input.result as Record<string, unknown>);
  if (resultKeys.some((key) => !['disposition', 'receiptId', 'code'].includes(key))) {
    invalid('META_WEBHOOK_HANDOFF_RECORD_FIELD_INVALID');
  }
  const eventKey = boundedString(input.eventKey, EVENT_KEY_MAX_LENGTH);
  if (!eventKey) invalid('META_WEBHOOK_HANDOFF_EVENT_KEY_INVALID');
  if (!META_WEBHOOK_HANDOFF_DISPOSITIONS.includes(input.result.disposition)) {
    invalid('META_WEBHOOK_HANDOFF_DISPOSITION_INVALID');
  }

  const receiptId = input.result.receiptId === undefined
    ? undefined
    : boundedString(input.result.receiptId, RECEIPT_ID_MAX_LENGTH);
  const code = input.result.code === undefined
    ? undefined
    : boundedString(input.result.code, CODE_MAX_LENGTH);
  if (input.result.receiptId !== undefined && !receiptId) invalid('META_WEBHOOK_HANDOFF_RECEIPT_ID_INVALID');
  if (input.result.code !== undefined && !code) invalid('META_WEBHOOK_HANDOFF_CODE_INVALID');

  if (['ACCEPTED', 'DUPLICATE', 'DEFERRED', 'REJECTED'].includes(input.result.disposition) && !receiptId) {
    invalid('META_WEBHOOK_HANDOFF_RECEIPT_REQUIRED');
  }
  if (input.result.disposition === 'IGNORED' && receiptId) {
    invalid('META_WEBHOOK_HANDOFF_IGNORED_RECEIPT_FORBIDDEN');
  }

  return Object.freeze({
    eventKey,
    disposition: input.result.disposition,
    ...(receiptId ? { receiptId } : {}),
    ...(code ? { code } : {}),
  });
}

export async function handoffMetaWebhookItems<T extends { readonly eventKey: string }>(input: {
  readonly items: readonly T[];
  readonly receive: (item: T) => Promise<Omit<MetaWebhookHandoffRecord, 'eventKey'>>;
}): Promise<readonly MetaWebhookHandoffRecord[]> {
  if (input.items.length > META_WEBHOOK_HANDOFF_MAX_ITEMS) {
    invalid('META_WEBHOOK_HANDOFF_ITEM_LIMIT_EXCEEDED');
  }
  const records: MetaWebhookHandoffRecord[] = [];
  const seen = new Map<string, MetaWebhookHandoffRecord>();

  for (const item of input.items) {
    const eventKey = boundedString(item.eventKey, EVENT_KEY_MAX_LENGTH);
    if (!eventKey) invalid('META_WEBHOOK_HANDOFF_EVENT_KEY_INVALID');
    const duplicate = seen.get(eventKey);
    if (duplicate) {
      records.push(Object.freeze({
        eventKey,
        disposition: duplicate.receiptId ? 'DUPLICATE' : 'IGNORED',
        ...(duplicate.receiptId ? { receiptId: duplicate.receiptId } : {}),
        code: 'DUPLICATE_IN_DELIVERY',
      }));
      continue;
    }

    const record = normalizeHandoffRecord({ eventKey, result: await input.receive(item) });
    seen.set(eventKey, record);
    records.push(record);
  }

  return Object.freeze(records);
}

function outcomeForCounts(input: {
  readonly accepted: number;
  readonly deduplicated: number;
  readonly deferred: number;
  readonly rejected: number;
  readonly ignored: number;
}): MetaWebhookHandoffOutcome {
  const active = [
    ['ACCEPTED', input.accepted],
    ['DUPLICATE', input.deduplicated],
    ['DEFERRED', input.deferred],
    ['REJECTED', input.rejected],
    ['IGNORED', input.ignored],
  ] as const;
  const nonZero = active.filter(([, count]) => count > 0);
  if (nonZero.length === 0) return 'IGNORED';
  if (nonZero.length === 1) return nonZero[0]![0];
  return 'MIXED';
}

export function summarizeMetaWebhookHandoff(input: {
  readonly records?: readonly MetaWebhookHandoffRecord[];
  readonly ignored?: number;
}): MetaWebhookHandoffSummary {
  const sourceRecords = input.records ?? [];
  if (sourceRecords.length > META_WEBHOOK_HANDOFF_MAX_ITEMS) {
    invalid('META_WEBHOOK_HANDOFF_ITEM_LIMIT_EXCEEDED');
  }
  const records = Object.freeze([...sourceRecords].map((record) => normalizeHandoffRecord({
    eventKey: record.eventKey,
    result: {
      disposition: record.disposition,
      ...(record.receiptId === undefined ? {} : { receiptId: record.receiptId }),
      ...(record.code === undefined ? {} : { code: record.code }),
    },
  })));
  if (input.ignored !== undefined && (!Number.isSafeInteger(input.ignored) || input.ignored < 0)) {
    invalid('META_WEBHOOK_HANDOFF_IGNORED_COUNT_INVALID');
  }
  const ignored = input.ignored ?? 0;
  if (records.length + ignored > META_WEBHOOK_HANDOFF_MAX_ITEMS) {
    invalid('META_WEBHOOK_HANDOFF_ITEM_LIMIT_EXCEEDED');
  }
  const accepted = records.filter((record) => record.disposition === 'ACCEPTED').length;
  const deduplicated = records.filter((record) => record.disposition === 'DUPLICATE').length;
  const deferred = records.filter((record) => record.disposition === 'DEFERRED').length;
  const rejected = records.filter((record) => record.disposition === 'REJECTED').length;
  const ignoredRecords = records.filter((record) => record.disposition === 'IGNORED').length;
  const totalIgnored = ignored + ignoredRecords;

  return Object.freeze({
    outcome: outcomeForCounts({ accepted, deduplicated, deferred, rejected, ignored: totalIgnored }),
    receiptFirst: true,
    total: records.length + ignored,
    accepted,
    deduplicated,
    deferred,
    rejected,
    ignored: totalIgnored,
    records,
  });
}

export function metaWebhookHandoffResponse(summary: MetaWebhookHandoffSummary): MetaWebhookPublicResponse {
  const ignoredRecords = summary.records.filter((record) => record.disposition === 'IGNORED').length;
  const externalIgnored = summary.ignored - ignoredRecords;
  if (!Number.isSafeInteger(externalIgnored) || externalIgnored < 0) {
    invalid('META_WEBHOOK_HANDOFF_SUMMARY_INVALID');
  }
  const canonical = summarizeMetaWebhookHandoff({ records: summary.records, ignored: externalIgnored });
  for (const key of ['outcome', 'receiptFirst', 'total', 'accepted', 'deduplicated', 'deferred', 'rejected', 'ignored'] as const) {
    if (summary[key] !== canonical[key]) invalid('META_WEBHOOK_HANDOFF_SUMMARY_INVALID');
  }
  return Object.freeze({
    ok: true,
    received: true,
    outcome: canonical.outcome,
    receiptFirst: true,
    total: canonical.total,
    accepted: canonical.accepted,
    deduplicated: canonical.deduplicated,
    deferred: canonical.deferred,
    rejected: canonical.rejected,
    ignored: canonical.ignored,
  });
}

export function metaWebhookRequestFailureResponse(input: MetaWebhookRejectedRequest): Readonly<{
  status: MetaWebhookRejectedRequest['httpStatus'];
  body: MetaWebhookPublicResponse;
}> {
  return Object.freeze({
    status: input.httpStatus,
    body: Object.freeze({
      ok: false,
      received: false,
      outcome: 'REJECTED',
      code: input.code,
      error: metaWebhookRequestFailureMessage(input.code),
    }),
  });
}


export function metaWebhookEnvelopeFailureResponse(error: unknown): Readonly<{
  status: 400;
  body: MetaWebhookPublicResponse;
}> {
  const message = error instanceof Error ? error.message : '';
  const code = /^META_WEBHOOK_[A-Z0-9_]+$/.test(message) ? message : 'META_WEBHOOK_ENVELOPE_INVALID';
  return Object.freeze({
    status: 400,
    body: Object.freeze({
      ok: false,
      received: false,
      outcome: 'REJECTED',
      code,
      error: 'Invalid webhook envelope',
    }),
  });
}

export function metaWebhookHandoffUnavailableResponse(): Readonly<{
  status: 503;
  body: MetaWebhookPublicResponse;
}> {
  return Object.freeze({
    status: 503,
    body: Object.freeze({
      ok: false,
      received: false,
      outcome: 'DEFERRED',
      code: 'META_WEBHOOK_HANDOFF_UNAVAILABLE',
      error: 'Webhook receipt handoff unavailable',
    }),
  });
}
