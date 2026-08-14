import 'server-only';

import { ServerMetaCredentialMaterial } from './material';
import { createMetaCredentialVersion, MetaCredentialResolutionError } from './provider';
import type { MetaCredentialRole } from './roles';
import type { MetaCredentialLookup, MetaCredentialMaterial, MetaCredentialProvider } from './types';

export type MetaEnvironment = Readonly<Record<string, string | undefined>>;

interface RoleBinding {
  readonly secretReferenceKey: string;
  readonly defaultSecretReference: string;
  readonly permissionsKey: string;
  readonly rotatedAtKey: string;
  readonly expiresAtKey: string;
  readonly dataAccessExpiresAtKey?: string;
}

const ROLE_BINDINGS: Readonly<Record<MetaCredentialRole, RoleBinding>> = Object.freeze({
  APP: {
    secretReferenceKey: 'META_APP_SECRET_REF',
    defaultSecretReference: 'env:META_APP_SECRET',
    permissionsKey: 'META_APP_GRANTED_PERMISSIONS',
    rotatedAtKey: 'META_APP_CREDENTIAL_ROTATED_AT',
    expiresAtKey: 'META_APP_CREDENTIAL_EXPIRES_AT',
  },
  BUSINESS_SYSTEM_USER: {
    secretReferenceKey: 'META_BUSINESS_ACCESS_TOKEN_SECRET_REF',
    defaultSecretReference: 'env:META_BUSINESS_ACCESS_TOKEN',
    permissionsKey: 'META_BUSINESS_GRANTED_PERMISSIONS',
    rotatedAtKey: 'META_BUSINESS_CREDENTIAL_ROTATED_AT',
    expiresAtKey: 'META_BUSINESS_CREDENTIAL_EXPIRES_AT',
    dataAccessExpiresAtKey: 'META_BUSINESS_DATA_ACCESS_EXPIRES_AT',
  },
  CAPI: {
    secretReferenceKey: 'META_CAPI_ACCESS_TOKEN_SECRET_REF',
    defaultSecretReference: 'env:META_CAPI_ACCESS_TOKEN',
    permissionsKey: 'META_CAPI_GRANTED_PERMISSIONS',
    rotatedAtKey: 'META_CAPI_CREDENTIAL_ROTATED_AT',
    expiresAtKey: 'META_CAPI_CREDENTIAL_EXPIRES_AT',
    dataAccessExpiresAtKey: 'META_CAPI_DATA_ACCESS_EXPIRES_AT',
  },
  PAGE: {
    secretReferenceKey: 'META_PAGE_ACCESS_TOKEN_SECRET_REF',
    defaultSecretReference: 'env:META_PAGE_ACCESS_TOKEN',
    permissionsKey: 'META_PAGE_GRANTED_PERMISSIONS',
    rotatedAtKey: 'META_PAGE_CREDENTIAL_ROTATED_AT',
    expiresAtKey: 'META_PAGE_CREDENTIAL_EXPIRES_AT',
    dataAccessExpiresAtKey: 'META_PAGE_DATA_ACCESS_EXPIRES_AT',
  },
  INSTAGRAM: {
    secretReferenceKey: 'META_INSTAGRAM_ACCESS_TOKEN_SECRET_REF',
    defaultSecretReference: 'env:META_INSTAGRAM_ACCESS_TOKEN',
    permissionsKey: 'META_INSTAGRAM_GRANTED_PERMISSIONS',
    rotatedAtKey: 'META_INSTAGRAM_CREDENTIAL_ROTATED_AT',
    expiresAtKey: 'META_INSTAGRAM_CREDENTIAL_EXPIRES_AT',
    dataAccessExpiresAtKey: 'META_INSTAGRAM_DATA_ACCESS_EXPIRES_AT',
  },
});

function clean(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function parsePermissions(value: string | undefined): readonly string[] {
  return Object.freeze([...new Set((value ?? '').split(',').map((item) => item.trim()).filter(Boolean))].sort());
}

function resolveEnvironmentSecret(reference: string, env: MetaEnvironment): string {
  if (!reference.startsWith('env:')) {
    throw new MetaCredentialResolutionError(
      'META_SECRET_REFERENCE_SCHEME_UNSUPPORTED',
      'The configured Meta secret reference scheme is not supported by this provider.',
      { scheme: reference.split(':', 1)[0] || 'missing' },
    );
  }
  const environmentKey = reference.slice(4).trim();
  if (!/^[A-Z][A-Z0-9_]{2,127}$/.test(environmentKey)) {
    throw new MetaCredentialResolutionError(
      'META_SECRET_REFERENCE_INVALID',
      'The configured Meta secret reference is invalid.',
      { referenceType: 'env' },
    );
  }
  const secret = clean(env[environmentKey]);
  if (!secret) {
    throw new MetaCredentialResolutionError(
      'META_CREDENTIAL_NOT_CONFIGURED',
      'The required Meta credential is not configured.',
      { secretRef: `env:${environmentKey}` },
    );
  }
  return secret;
}

export class EnvironmentMetaCredentialProvider implements MetaCredentialProvider {
  readonly #env: MetaEnvironment;

  constructor(env: MetaEnvironment = process.env) {
    this.#env = env;
  }

  async resolve(input: MetaCredentialLookup): Promise<MetaCredentialMaterial> {
    const connectionKey = input.connectionKey.trim();
    if (!connectionKey) throw new TypeError('META_CONNECTION_KEY_REQUIRED');
    const binding = ROLE_BINDINGS[input.role];
    const secretRef = clean(this.#env[binding.secretReferenceKey]) ?? binding.defaultSecretReference;
    const secret = resolveEnvironmentSecret(secretRef, this.#env);
    const appId = clean(this.#env.META_APP_ID) ?? clean(this.#env.FACEBOOK_CLIENT_ID) ?? null;
    const metadata = {
      connectionKey,
      role: input.role,
      secretRef,
      credentialVersion: createMetaCredentialVersion({ connectionKey, role: input.role, secret }),
      permissions: parsePermissions(this.#env[binding.permissionsKey]),
      rotatedAt: clean(this.#env[binding.rotatedAtKey]) ?? null,
      expiresAt: clean(this.#env[binding.expiresAtKey]) ?? null,
      dataAccessExpiresAt: binding.dataAccessExpiresAtKey ? clean(this.#env[binding.dataAccessExpiresAtKey]) ?? null : null,
      appId,
    } as const;

    return new ServerMetaCredentialMaterial({
      metadata,
      ...(input.role === 'APP' ? { appSecret: secret } : { accessToken: secret }),
    });
  }
}

export function createEnvironmentMetaCredentialProvider(env: MetaEnvironment = process.env): MetaCredentialProvider {
  return new EnvironmentMetaCredentialProvider(env);
}
