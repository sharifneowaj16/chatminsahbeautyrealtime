export const META_NORMALIZED_WEBHOOK_SCHEMA_VERSION = 1 as const;

export const META_WEBHOOK_EVENT_GROUPS = [
  'changes',
  'messaging',
  'standby',
] as const;

export const META_WEBHOOK_ROUTING_TARGETS = [
  'LEAD_ADS',
  'INSTAGRAM',
  'FACEBOOK_PAGE',
  'UNSUPPORTED',
] as const;

export const META_WEBHOOK_EVENT_KINDS = [
  'LEADGEN',
  'MESSAGE',
  'COMMENT',
  'CHANGE',
  'STANDBY',
  'UNKNOWN',
] as const;

export type MetaWebhookEventGroup = (typeof META_WEBHOOK_EVENT_GROUPS)[number];
export type MetaWebhookRoutingTarget = (typeof META_WEBHOOK_ROUTING_TARGETS)[number];
export type MetaWebhookEventKind = (typeof META_WEBHOOK_EVENT_KINDS)[number];

export type MetaNormalizedWebhookPayload = Readonly<Record<string, unknown>>;

export interface MetaNormalizedWebhookEvent<
  TPayload extends MetaNormalizedWebhookPayload = MetaNormalizedWebhookPayload,
> {
  readonly schemaVersion: typeof META_NORMALIZED_WEBHOOK_SCHEMA_VERSION;
  readonly provider: 'META';
  readonly transport: 'WEBHOOK';
  readonly eventKey: string;
  readonly providerEventId: string | null;
  readonly payloadDigest: string;
  readonly objectType: string;
  readonly objectId: string | null;
  readonly field: string | null;
  readonly eventGroup: MetaWebhookEventGroup;
  readonly eventKind: MetaWebhookEventKind;
  readonly routingTarget: MetaWebhookRoutingTarget;
  readonly occurredAt: string | null;
  readonly orderingKey: string;
  readonly entryIndex: number;
  readonly eventIndex: number;
  readonly payload: TPayload;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

export function isMetaNormalizedWebhookEvent(value: unknown): value is MetaNormalizedWebhookEvent {
  if (!isRecord(value)) return false;

  return value.schemaVersion === META_NORMALIZED_WEBHOOK_SCHEMA_VERSION
    && value.provider === 'META'
    && value.transport === 'WEBHOOK'
    && typeof value.eventKey === 'string'
    && value.eventKey.length > 0
    && isNullableString(value.providerEventId)
    && typeof value.payloadDigest === 'string'
    && /^[a-f0-9]{64}$/.test(value.payloadDigest)
    && typeof value.objectType === 'string'
    && value.objectType.length > 0
    && isNullableString(value.objectId)
    && isNullableString(value.field)
    && typeof value.eventGroup === 'string'
    && META_WEBHOOK_EVENT_GROUPS.includes(value.eventGroup as MetaWebhookEventGroup)
    && typeof value.eventKind === 'string'
    && META_WEBHOOK_EVENT_KINDS.includes(value.eventKind as MetaWebhookEventKind)
    && typeof value.routingTarget === 'string'
    && META_WEBHOOK_ROUTING_TARGETS.includes(value.routingTarget as MetaWebhookRoutingTarget)
    && isNullableString(value.occurredAt)
    && typeof value.orderingKey === 'string'
    && value.orderingKey.length > 0
    && Number.isInteger(value.entryIndex)
    && Number(value.entryIndex) >= 0
    && Number.isInteger(value.eventIndex)
    && Number(value.eventIndex) >= 0
    && isRecord(value.payload);
}
