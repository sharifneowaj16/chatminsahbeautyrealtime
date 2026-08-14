export const META_CREDENTIAL_ROLES = [
  'APP',
  'BUSINESS_SYSTEM_USER',
  'CAPI',
  'PAGE',
  'INSTAGRAM',
] as const;

export type MetaCredentialRole = (typeof META_CREDENTIAL_ROLES)[number];

export function isMetaCredentialRole(value: unknown): value is MetaCredentialRole {
  return typeof value === 'string' && META_CREDENTIAL_ROLES.includes(value as MetaCredentialRole);
}
