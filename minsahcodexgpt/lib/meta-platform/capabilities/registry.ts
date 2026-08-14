import { META_CAPABILITY_IDS, type MetaCapabilityId } from '../types';

export interface MetaCapabilityDefinition {
  readonly id: MetaCapabilityId;
  readonly targetPhase: number;
  readonly cutoverFlag: string;
}

export const META_CAPABILITY_DEFINITIONS = Object.freeze([
  { id: 'sdk-transport', targetPhase: 23, cutoverFlag: 'META_PLATFORM_SDK_TRANSPORT' },
  { id: 'credentials-versioning', targetPhase: 22, cutoverFlag: 'META_PLATFORM_CREDENTIALS' },
  { id: 'graph-media-boundary', targetPhase: 24, cutoverFlag: 'META_PLATFORM_GRAPH_TRANSPORT' },
  { id: 'meta-webhooks', targetPhase: 24, cutoverFlag: 'META_PLATFORM_WEBHOOK_TRANSPORT' },
  { id: 'meta-operations', targetPhase: 25, cutoverFlag: 'META_PLATFORM_OPERATIONS_LEDGER' },
  { id: 'meta-reliability', targetPhase: 26, cutoverFlag: 'META_PLATFORM_RELIABILITY' },
  { id: 'meta-workflows', targetPhase: 27, cutoverFlag: 'META_PLATFORM_WORKFLOWS' },
  { id: 'connection-health', targetPhase: 28, cutoverFlag: 'META_PLATFORM_CONNECTION_READS' },
  { id: 'capi-delivery', targetPhase: 28, cutoverFlag: 'META_PLATFORM_CAPI_WRITES' },
  { id: 'ads-marketing', targetPhase: 29, cutoverFlag: 'META_PLATFORM_ADS_WRITES' },
  { id: 'catalog-commerce', targetPhase: 30, cutoverFlag: 'META_PLATFORM_CATALOG_WRITES' },
  { id: 'lead-ads-crm', targetPhase: 31, cutoverFlag: 'META_PLATFORM_LEADS' },
  { id: 'instagram-crm', targetPhase: 31, cutoverFlag: 'META_PLATFORM_INSTAGRAM' },
  { id: 'social-realtime', targetPhase: 31, cutoverFlag: 'META_PLATFORM_SOCIAL_REALTIME' },
  { id: 'legacy-facebook', targetPhase: 31, cutoverFlag: 'META_PLATFORM_LEGACY_FACEBOOK' },
  { id: 'browser-measurement', targetPhase: 32, cutoverFlag: 'META_PLATFORM_BROWSER_MEASUREMENT' },
  { id: 'measurement-attribution', targetPhase: 32, cutoverFlag: 'META_PLATFORM_MEASUREMENT' },
  { id: 'privacy-governance', targetPhase: 32, cutoverFlag: 'META_PLATFORM_PRIVACY' },
  { id: 'admin-observability', targetPhase: 32, cutoverFlag: 'META_PLATFORM_ADMIN_CONTROL' },
  { id: 'release-governance', targetPhase: 33, cutoverFlag: 'NONE_REQUIRED' },
  { id: 'facebook-oauth', targetPhase: 32, cutoverFlag: 'NONE_REQUIRED' },
  { id: 'meta-data-model', targetPhase: 21, cutoverFlag: 'META_PLATFORM_DATA_MODEL' },
  { id: 'shared-meta-support', targetPhase: 20, cutoverFlag: 'META_PLATFORM_FACADE' },
] satisfies readonly MetaCapabilityDefinition[]);

const definitionById = new Map<MetaCapabilityId, MetaCapabilityDefinition>(
  META_CAPABILITY_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export function isMetaCapabilityId(value: unknown): value is MetaCapabilityId {
  return typeof value === 'string' && META_CAPABILITY_IDS.includes(value as MetaCapabilityId);
}

export function getMetaCapabilityDefinition(id: MetaCapabilityId): MetaCapabilityDefinition {
  const definition = definitionById.get(id);
  if (!definition) throw new Error('META_CAPABILITY_DEFINITION_MISSING');
  return definition;
}

export function listMetaCapabilityDefinitions(): readonly MetaCapabilityDefinition[] {
  return META_CAPABILITY_DEFINITIONS;
}
