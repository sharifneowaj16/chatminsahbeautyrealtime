import type { MetaLeadDuplicateReason } from './types';

export type MetaLeadDedupeCandidate = {
  id: string;
  leadgenId: string;
  normalizedPhoneHash?: string | null;
  normalizedEmailHash?: string | null;
};

export function selectMetaLeadDuplicate(input: {
  leadgenId: string;
  phoneHash?: string;
  emailHash?: string;
  candidates: MetaLeadDedupeCandidate[];
}): { candidate: MetaLeadDedupeCandidate; reason: MetaLeadDuplicateReason } | null {
  const byLeadgen = input.candidates.find((item) => item.leadgenId === input.leadgenId);
  if (byLeadgen) return { candidate: byLeadgen, reason: 'LEADGEN_ID' };
  if (input.phoneHash) {
    const byPhone = input.candidates.find((item) => item.normalizedPhoneHash === input.phoneHash);
    if (byPhone) return { candidate: byPhone, reason: 'PHONE' };
  }
  if (input.emailHash) {
    const byEmail = input.candidates.find((item) => item.normalizedEmailHash === input.emailHash);
    if (byEmail) return { candidate: byEmail, reason: 'EMAIL' };
  }
  return null;
}
