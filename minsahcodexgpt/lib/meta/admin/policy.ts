import { createHash } from 'node:crypto';
import { redactMetaAdminDataForHash } from './redaction';

export const META_ADMIN_ACTIONS = {
  META_CONNECTION_RECHECK: { risk: 'LOW', requiresApproval: false },
  META_CATALOG_SYNC: { risk: 'MEDIUM', requiresApproval: false },
  META_CATALOG_CREATE: { risk: 'MEDIUM', requiresApproval: false },
  META_CATALOG_UPDATE: { risk: 'MEDIUM', requiresApproval: false },
  META_CATALOG_FEED_MUTATION: { risk: 'MEDIUM', requiresApproval: false },
  META_CATALOG_BATCH_POLL: { risk: 'LOW', requiresApproval: false },
  META_CATALOG_ITEM_RETRY: { risk: 'MEDIUM', requiresApproval: false },
  META_CATALOG_DELETE_PREVIEW: { risk: 'LOW', requiresApproval: false },
  META_DIAGNOSTICS_SYNC: { risk: 'LOW', requiresApproval: false },
  META_PRODUCT_SET_CREATE: { risk: 'MEDIUM', requiresApproval: false },
  META_PRODUCT_SET_UPDATE: { risk: 'MEDIUM', requiresApproval: false },
  META_PRODUCT_SET_PREVIEW: { risk: 'LOW', requiresApproval: false },
  META_PRODUCT_SET_SYNC: { risk: 'HIGH', requiresApproval: true },
  META_PRODUCT_SET_ROLLBACK: { risk: 'MEDIUM', requiresApproval: false },
  META_ADS_INSIGHTS_SYNC: { risk: 'LOW', requiresApproval: false },
  META_ADS_RECOMMENDATIONS_GENERATE: { risk: 'LOW', requiresApproval: false },
  META_ADS_RECOMMENDATION_DISMISS: { risk: 'LOW', requiresApproval: false },
  META_INCIDENT_ACKNOWLEDGE: { risk: 'LOW', requiresApproval: false },
  META_INCIDENT_RESOLVE: { risk: 'MEDIUM', requiresApproval: false },
  META_EVENT_REPLAY: { risk: 'HIGH', requiresApproval: true },
  META_JOB_REPLAY: { risk: 'HIGH', requiresApproval: true },
  META_JOB_CANCEL: { risk: 'HIGH', requiresApproval: true },
  META_LEAD_UPDATE: { risk: 'LOW', requiresApproval: false },
  META_APPROVAL_REQUEST: { risk: 'MEDIUM', requiresApproval: false },
  META_APPROVAL_APPROVE: { risk: 'HIGH', requiresApproval: false },
  META_APPROVAL_REJECT: { risk: 'HIGH', requiresApproval: false },
  META_CATALOG_DELETE: { risk: 'CRITICAL', requiresApproval: true },
  META_CONNECTION_ROTATE: { risk: 'CRITICAL', requiresApproval: true },
  META_AD_MUTATION: { risk: 'CRITICAL', requiresApproval: true },
  META_AUDIENCE_MUTATION: { risk: 'CRITICAL', requiresApproval: true },
  META_INSTAGRAM_ASSIGN: { risk: 'LOW', requiresApproval: false },
  META_INSTAGRAM_STATUS_UPDATE: { risk: 'LOW', requiresApproval: false },
  META_INSTAGRAM_LINK: { risk: 'MEDIUM', requiresApproval: false },
  META_INSTAGRAM_UNLINK: { risk: 'MEDIUM', requiresApproval: false },
  META_INSTAGRAM_REPLY: { risk: 'MEDIUM', requiresApproval: false },
  META_FACEBOOK_REPLY: { risk: 'MEDIUM', requiresApproval: false },
} as const;

export type MetaAdminActionKey = keyof typeof META_ADMIN_ACTIONS;
export type MetaAdminActionRisk = (typeof META_ADMIN_ACTIONS)[MetaAdminActionKey]['risk'];

export function isMetaAdminActionKey(value: unknown): value is MetaAdminActionKey {
  return typeof value === 'string' && value in META_ADMIN_ACTIONS;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)])
    );
  }
  return value;
}

export function buildMetaAdminPayloadHash(payload: unknown): string {
  const safe = redactMetaAdminDataForHash(payload);
  const canonical = JSON.stringify(canonicalize(safe));
  return createHash('sha256').update(canonical).digest('hex');
}

export function getMetaAdminActionPolicy(actionKey: MetaAdminActionKey) {
  return META_ADMIN_ACTIONS[actionKey];
}
