import type { MetaLeadStatus } from './types';

const TRANSITIONS: Record<MetaLeadStatus, ReadonlySet<MetaLeadStatus>> = {
  NEW: new Set(['CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'LOST']),
  CONTACTED: new Set(['QUALIFIED', 'UNQUALIFIED', 'LOST']),
  QUALIFIED: new Set(['CONTACTED', 'CONVERTED', 'LOST']),
  UNQUALIFIED: new Set(['CONTACTED', 'LOST']),
  CONVERTED: new Set([]),
  LOST: new Set(['CONTACTED', 'QUALIFIED']),
};

export function canTransitionMetaLead(from: MetaLeadStatus, to: MetaLeadStatus) {
  return from === to || TRANSITIONS[from].has(to);
}

export function validateMetaLeadTransition(input: { from: MetaLeadStatus; to: MetaLeadStatus; convertedOrderId?: string | null }) {
  if (!canTransitionMetaLead(input.from, input.to)) throw new Error(`META_LEAD_STATUS_TRANSITION_INVALID:${input.from}->${input.to}`);
  if (input.to === 'CONVERTED' && !input.convertedOrderId?.trim()) throw new Error('META_LEAD_CONVERTED_ORDER_REQUIRED');
  return true;
}
