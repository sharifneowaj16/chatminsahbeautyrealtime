export type MetaLeadFormOwnershipDecision = Readonly<
  | { ok: true; formId: string | undefined }
  | { ok: false; code: 'META_LEAD_RECEIPT_FORM_MISMATCH' | 'META_LEAD_FORM_OWNERSHIP_MISMATCH'; safeMessage: string }
>;

function cleanId(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function evaluateMetaLeadFormOwnership(input: {
  notificationFormId?: string;
  providerFormId?: string;
  allowedFormIds: ReadonlySet<string>;
}): MetaLeadFormOwnershipDecision {
  const notificationFormId = cleanId(input.notificationFormId);
  const providerFormId = cleanId(input.providerFormId);
  if (notificationFormId && providerFormId && notificationFormId !== providerFormId) {
    return Object.freeze({
      ok: false,
      code: 'META_LEAD_RECEIPT_FORM_MISMATCH',
      safeMessage: 'Retrieved Lead form does not match the canonical receipt.',
    });
  }
  const formId = providerFormId ?? notificationFormId;
  if (input.allowedFormIds.size > 0 && (!formId || !input.allowedFormIds.has(formId))) {
    return Object.freeze({
      ok: false,
      code: 'META_LEAD_FORM_OWNERSHIP_MISMATCH',
      safeMessage: 'Retrieved lead form is not in the configured allowlist.',
    });
  }
  return Object.freeze({ ok: true, formId });
}
