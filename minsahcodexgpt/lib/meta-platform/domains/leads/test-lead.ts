export type MetaTestLeadSource = 'PROVIDER_MARKER' | 'ADMIN_TEST_CREATE' | 'NORMAL_RUNTIME';

export type MetaTestLeadPolicy = Readonly<{
  isTestLead: boolean;
  isolateFromCrm: boolean;
  suppressAssignment: boolean;
  suppressNotifications: boolean;
  cleanupAfterDays: number | null;
  reason: 'PROVIDER_TEST_LEAD' | 'ADMIN_TEST_LEAD' | 'NORMAL_LEAD';
}>;

export function resolveMetaTestLeadPolicy(input: {
  providerMarker?: boolean | null;
  source?: MetaTestLeadSource;
}): MetaTestLeadPolicy {
  const explicit = input.providerMarker === true || input.source === 'ADMIN_TEST_CREATE';
  if (!explicit) {
    return Object.freeze({
      isTestLead: false,
      isolateFromCrm: false,
      suppressAssignment: false,
      suppressNotifications: false,
      cleanupAfterDays: null,
      reason: 'NORMAL_LEAD',
    });
  }
  return Object.freeze({
    isTestLead: true,
    isolateFromCrm: true,
    suppressAssignment: true,
    suppressNotifications: true,
    cleanupAfterDays: 7,
    reason: input.source === 'ADMIN_TEST_CREATE' ? 'ADMIN_TEST_LEAD' : 'PROVIDER_TEST_LEAD',
  });
}

export function createMetaTestLeadFixture(nonce: string): Readonly<{
  fullName: string;
  email: string;
  phone: string;
  productInterest: string;
}> {
  const clean = nonce.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24) || 'fixture';
  return Object.freeze({
    fullName: `Phase31 Test ${clean}`,
    email: `phase31-test+${clean}@example.invalid`,
    phone: '+15550000000',
    productInterest: 'PHASE31_TEST_ONLY',
  });
}

export function createMetaTestLeadEvidence(input: {
  providerLeadId: string;
  pageId: string;
  formId: string;
  createdAt?: Date;
}): Readonly<{
  providerLeadId: string;
  pageId: string;
  formId: string;
  isTestLead: true;
  isolation: 'CRM_BLOCKED';
  cleanupEligibleAt: string;
}> {
  const createdAt = input.createdAt ?? new Date();
  return Object.freeze({
    providerLeadId: input.providerLeadId,
    pageId: input.pageId,
    formId: input.formId,
    isTestLead: true,
    isolation: 'CRM_BLOCKED',
    cleanupEligibleAt: new Date(createdAt.getTime() + 7 * 86_400_000).toISOString(),
  });
}
