import 'server-only';

import { createHmac } from 'node:crypto';
import type { MetaCredentialMaterial } from './types';

export function buildMetaAppSecretProof(input: {
  readonly accessCredential: MetaCredentialMaterial;
  readonly appCredential: MetaCredentialMaterial;
}): string {
  if (input.appCredential.metadata.role !== 'APP') {
    throw new Error('META_APP_CREDENTIAL_ROLE_REQUIRED');
  }
  if (input.accessCredential.metadata.role === 'APP') {
    throw new Error('META_ACCESS_CREDENTIAL_ROLE_REQUIRED');
  }
  return createHmac('sha256', input.appCredential.readAppSecret())
    .update(input.accessCredential.readAccessToken())
    .digest('hex');
}

export function isMetaAppSecretProof(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
}
