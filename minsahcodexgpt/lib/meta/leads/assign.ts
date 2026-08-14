import type { MetaLeadAgentView, MetaLeadAssignmentRuleView, NormalizedMetaLead } from './types';

function same(expected: string | null | undefined, actual: string | null | undefined) {
  if (!expected?.trim()) return true;
  return expected.trim().toLowerCase() === actual?.trim().toLowerCase();
}

export function ruleMatchesMetaLead(rule: MetaLeadAssignmentRuleView, input: {
  campaignId?: string | null;
  formId?: string | null;
  normalized: NormalizedMetaLead;
}) {
  return same(rule.campaignId, input.campaignId) && same(rule.formId, input.formId) &&
    same(rule.city, input.normalized.city) && same(rule.area, input.normalized.area) &&
    same(rule.productInterest, input.normalized.productInterest);
}

export function selectMetaLeadAssignee(input: {
  campaignId?: string | null;
  formId?: string | null;
  normalized: NormalizedMetaLead;
  rules: MetaLeadAssignmentRuleView[];
  agents: MetaLeadAgentView[];
}) {
  const available = input.agents.filter((agent) => agent.maxOpenLeads > agent.openLeads);
  if (!available.length) return { assignedToId: null, ruleId: null, reason: 'NO_AVAILABLE_AGENT' as const };
  const rules = [...input.rules].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  const matched = rules.find((rule) => ruleMatchesMetaLead(rule, input));
  if (matched?.assignedToId) {
    const direct = available.find((agent) => agent.adminId === matched.assignedToId);
    if (direct) return { assignedToId: direct.adminId, ruleId: matched.id, reason: 'RULE_ASSIGNEE' as const };
  }
  const pool = [...available].sort((a, b) => {
    const left = a.lastAssignedAt?.getTime() ?? 0;
    const right = b.lastAssignedAt?.getTime() ?? 0;
    return left - right || a.openLeads - b.openLeads || a.adminId.localeCompare(b.adminId);
  });
  return { assignedToId: pool[0]?.adminId ?? null, ruleId: matched?.id ?? null, reason: matched ? 'RULE_ROUND_ROBIN' as const : 'ROUND_ROBIN' as const };
}
