import type { MetaLeadDomainRecord, MetaLeadProviderField } from './types.ts';

export type LegacyNormalizedMetaLead = Readonly<{
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneHash?: string;
  phoneMasked?: string;
  email?: string;
  emailHash?: string;
  emailMasked?: string;
  city?: string;
  area?: string;
  country?: string;
  productInterest?: string;
  customFields: Record<string, string[]>;
}>;

export function toLegacyMetaLeadFields(record: MetaLeadDomainRecord): MetaLeadProviderField[] {
  return record.sensitiveProviderFields.map((field) => ({ name: field.name, values: [...field.values] }));
}

export function toLegacyNormalizedMetaLead(
  record: MetaLeadDomainRecord,
  hashIdentity: (value?: string) => string | undefined,
): LegacyNormalizedMetaLead {
  const phoneHash = record.contact.phone ? hashIdentity(record.contact.phone) : undefined;
  const emailHash = record.contact.email ? hashIdentity(record.contact.email) : undefined;
  return {
    ...record.contact,
    ...(phoneHash ? { phoneHash } : {}),
    ...(record.safeContact.phoneMasked ? { phoneMasked: record.safeContact.phoneMasked } : {}),
    ...(emailHash ? { emailHash } : {}),
    ...(record.safeContact.emailMasked ? { emailMasked: record.safeContact.emailMasked } : {}),
    ...record.location,
    ...(record.productInterest ? { productInterest: record.productInterest } : {}),
    customFields: {},
  };
}
