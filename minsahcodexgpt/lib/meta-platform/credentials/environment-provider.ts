import 'server-only';

import { ServerMetaCredentialMaterial } from './material';
import { createMetaCredentialVersion, MetaCredentialResolutionError } from './provider';
import type { MetaCredentialRole } from './roles';
import type { MetaCredentialLookup, MetaCredentialMaterial, MetaCredentialProvider } from './types';

export type MetaEnvironment = Readonly<Record<string, string | undefined>>;

interface RoleBinding {
  readonly secretReferenceKey: string;
  readonly defaultSecretReference: string;
  readonly fallbackEnvKeys?: readonly string[];
  readonly permissionsKey: string;
  readonly defaultPermissions: readonly string[];
  readonly rotatedAtKey: string;
  readonly expiresAtKey: string;
  readonly dataAccessExpiresAtKey?: string;
}

const DEFAULT_SYSTEM_PERMISSIONS = Object.freeze([
  'ads_management',
  'ads_read',
  'business_management',
  'catalog_management',
  'instagram_basic',
  'instagram_manage_messages',
  'leads_retrieval',
  'pages_manage_metadata',
  'pages_read_engagement',
]);

const ROLE_BINDINGS: Readonly<Record<MetaCredentialRole, RoleBinding>> = Object.freeze({
  APP: {
    secretReferenceKey: 'META_APP_SECRET_REF',
    defaultSecretReference: 'env:META_APP_SECRET',
    fallbackEnvKeys: ['FACEBOOK_CLIENT_SECRET'],
    permissionsKey: 'META_APP_GRANTED_PERMISSIONS',
    defaultPermissions: DEFAULT_SYSTEM_PERMISSIONS,
    rotatedAtKey: 'META_APP_CREDENTIAL_ROTATED_AT',
    expiresAtKey: 'META_APP_CREDENTIAL_EXPIRES_AT',
  },
  BUSINESS_SYSTEM_USER: {
    secretReferenceKey: 'META_BUSINESS_ACCESS_TOKEN_SECRET_REF',
    defaultSecretReference: 'env:META_BUSINESS_ACCESS_TOKEN',
    fallbackEnvKeys: [
      'META_SYSTEM_USER_TOKEN',
      'META_CATALOG_ACCESS_TOKEN',
      'META_ACCESS_TOKEN',
      'META_CAPI_ACCESS_TOKEN',
    ],
    permissionsKey: 'META_BUSINESS_GRANTED_PERMISSIONS',
    defaultPermissions: DEFAULT_SYSTEM_PERMISSIONS,
    rotatedAtKey: 'META_BUSINESS_CREDENTIAL_ROTATED_AT',
    expiresAtKey: 'META_BUSINESS_CREDENTIAL_EXPIRES_AT',
    dataAccessExpiresAtKey: 'META_BUSINESS_DATA_ACCESS_EXPIRES_AT',
  },
  CAPI: {
    secretReferenceKey: 'META_CAPI_ACCESS_TOKEN_SECRET_REF',
    defaultSecretReference: 'env:META_CAPI_ACCESS_TOKEN',
    fallbackEnvKeys: ['META_BUSINESS_ACCESS_TOKEN', 'META_ACCESS_TOKEN'],
    permissionsKey: 'META_CAPI_GRANTED_PERMISSIONS',
    defaultPermissions: DEFAULT_SYSTEM_PERMISSIONS,
    rotatedAtKey: 'META_CAPI_CREDENTIAL_ROTATED_AT',
    expiresAtKey: 'META_CAPI_CREDENTIAL_EXPIRES_AT',
    dataAccessExpiresAtKey: 'META_CAPI_DATA_ACCESS_EXPIRES_AT',
  },
  PAGE: {
    secretReferenceKey: 'META_PAGE_ACCESS_TOKEN_SECRET_REF',
    defaultSecretReference: 'env:META_PAGE_ACCESS_TOKEN',
    fallbackEnvKeys: ['FACEBOOK_PAGE_ACCESS_TOKEN', 'META_BUSINESS_ACCESS_TOKEN', 'META_CAPI_ACCESS_TOKEN'],
    permissionsKey: 'META_PAGE_GRANTED_PERMISSIONS',
    defaultPermissions: DEFAULT_SYSTEM_PERMISSIONS,
    rotatedAtKey: 'META_PAGE_CREDENTIAL_ROTATED_AT',
    expiresAtKey: 'META_PAGE_CREDENTIAL_EXPIRES_AT',
    dataAccessExpiresAtKey: 'META_PAGE_DATA_ACCESS_EXPIRES_AT',
  },
  INSTAGRAM: {
    secretReferenceKey: 'META_INSTAGRAM_ACCESS_TOKEN_SECRET_REF',
    defaultSecretReference: 'env:META_INSTAGRAM_ACCESS_TOKEN',
    fallbackEnvKeys: ['META_PAGE_ACCESS_TOKEN', 'META_BUSINESS_ACCESS_TOKEN', 'META_CAPI_ACCESS_TOKEN'],
    permissionsKey: 'META_INSTAGRAM_GRANTED_PERMISSIONS',
    defaultPermissions: DEFAULT_SYSTEM_PERMISSIONS,
    rotatedAtKey: 'META_INSTAGRAM_CREDENTIAL_ROTATED_AT',
    expiresAtKey: 'META_INSTAGRAM_CREDENTIAL_EXPIRES_AT',
    dataAccessExpiresAtKey: 'META_INSTAGRAM_DATA_ACCESS_EXPIRES_AT',
  },
});

function clean(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function parsePermissions(value: string | undefined, fallback: readonly string[]): readonly string[] {
  const parsed = [...new Set((value ?? '').split(',').map((item) => item.trim()).filter(Boolean))].sort();
  return Object.freeze(parsed.length > 0 ? parsed : [...fallback].sort());
}

function resolveEnvironmentSecret(
  reference: string,
  env: MetaEnvironment,
  fallbackEnvKeys: readonly string[] = []
): { secret: string; resolvedRef: string } {
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
  const primarySecret = clean(env[environmentKey]);
  if (primarySecret) {
    return { secret: primarySecret, resolvedRef: `env:${environmentKey}` };
  }

  for (const fallbackKey of ((env === process.env || clean(env.META_ALLOW_CREDENTIAL_ROLE_FALLBACK) === 'true') ? fallbackEnvKeys : [])) {
    const candidate = clean(env[fallbackKey]);
    if (candidate) {
      return { secret: candidate, resolvedRef: `env:${fallbackKey}` };
    }
  }

  throw new MetaCredentialResolutionError(
    'META_CREDENTIAL_NOT_CONFIGURED',
    'The required Meta credential is not configured.',
    { secretRef: `env:${environmentKey}` },
  );
}

export class EnvironmentMetaCredentialProvider implements MetaCredentialProvider {
  readonly #env: MetaEnvironment;

  constructor(env: MetaEnvironment = process.env) {
    this.#env = env;
  }

  async resolve(input: MetaCredentialLookup): Promise<MetaCredentialMaterial> {
    const connectionKey = input.connectionKey.trim();
    if (!connectionKey) throw new TypeError('META_CONNECTION_KEY_REQUIRED');

    // Prevent mismatched META_APP_SECRET / FACEBOOK_CLIENT_SECRET from breaking
    // Graph API & Business SDK calls with "Invalid appsecret_proof provided in the API argument"
    // unless META_ENABLE_APPSECRET_PROOF=true is explicitly enabled.
    if (input.role === 'APP' && clean(this.#env.META_ENABLE_APPSECRET_PROOF) !== 'true') {
      throw new MetaCredentialResolutionError(
        'META_CREDENTIAL_NOT_CONFIGURED',
        'App secret proof is disabled unless META_ENABLE_APPSECRET_PROOF=true.',
        { secretRef: 'env:META_APP_SECRET' },
      );
    }

    const binding = ROLE_BINDINGS[input.role];
    const secretRef = clean(this.#env[binding.secretReferenceKey]) ?? binding.defaultSecretReference;
    const { secret, resolvedRef } = resolveEnvironmentSecret(secretRef, this.#env, binding.fallbackEnvKeys);
    const appId = clean(this.#env.META_APP_ID) ?? clean(this.#env.FACEBOOK_CLIENT_ID) ?? null;

    const metadata = {
      connectionKey,
      role: input.role,
      secretRef: resolvedRef,
      credentialVersion: createMetaCredentialVersion({ connectionKey, role: input.role, secret }),
      permissions: parsePermissions(this.#env[binding.permissionsKey], binding.defaultPermissions),
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
