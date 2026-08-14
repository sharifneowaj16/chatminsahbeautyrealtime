import 'server-only';

import { createHash } from 'node:crypto';
import { isMetaCredentialRole, type MetaCredentialRole } from './roles';
import { ServerMetaCredentialMaterial } from './material';
import type {
  MetaCredentialLookup,
  MetaCredentialMaterial,
  MetaCredentialMetadata,
  MetaCredentialProvider,
} from './types';

export class MetaCredentialResolutionError extends Error {
  readonly code: string;
  readonly safeDetails: Readonly<Record<string, unknown>>;

  constructor(code: string, message: string, safeDetails: Record<string, unknown>) {
    super(message);
    this.name = 'MetaCredentialResolutionError';
    this.code = code;
    this.safeDetails = Object.freeze({ ...safeDetails });
  }
}

export function createMetaCredentialVersion(input: {
  readonly connectionKey: string;
  readonly role: MetaCredentialRole;
  readonly secret: string;
}): string {
  return createHash('sha256')
    .update(`${input.connectionKey}\0${input.role}\0${input.secret}`)
    .digest('hex');
}

export interface InMemoryMetaCredentialInput {
  readonly connectionKey: string;
  readonly role: MetaCredentialRole;
  readonly secretRef: string;
  readonly accessToken?: string;
  readonly appSecret?: string;
  readonly permissions?: readonly string[];
  readonly rotatedAt?: string | null;
  readonly expiresAt?: string | null;
  readonly dataAccessExpiresAt?: string | null;
  readonly appId?: string | null;
}

function credentialKey(input: MetaCredentialLookup): string {
  return `${input.connectionKey.trim()}::${input.role}`;
}

function normalizePermissions(values: readonly string[] = []): readonly string[] {
  return Object.freeze([...new Set(values.map((value) => value.trim()).filter(Boolean))].sort());
}

function buildMaterial(input: InMemoryMetaCredentialInput): MetaCredentialMaterial {
  const connectionKey = input.connectionKey.trim();
  const secretRef = input.secretRef.trim();
  const secret = input.role === 'APP' ? input.appSecret?.trim() : input.accessToken?.trim();
  if (!connectionKey) throw new TypeError('META_CONNECTION_KEY_REQUIRED');
  if (!secretRef) throw new TypeError('META_SECRET_REFERENCE_REQUIRED');
  if (!secret) throw new TypeError(input.role === 'APP' ? 'META_APP_SECRET_REQUIRED' : 'META_ACCESS_TOKEN_REQUIRED');

  const metadata: MetaCredentialMetadata = {
    connectionKey,
    role: input.role,
    secretRef,
    credentialVersion: createMetaCredentialVersion({ connectionKey, role: input.role, secret }),
    permissions: normalizePermissions(input.permissions),
    rotatedAt: input.rotatedAt ?? null,
    expiresAt: input.expiresAt ?? null,
    dataAccessExpiresAt: input.dataAccessExpiresAt ?? null,
    appId: input.appId?.trim() || null,
  };

  return new ServerMetaCredentialMaterial({
    metadata,
    ...(input.role === 'APP' ? { appSecret: secret } : { accessToken: secret }),
  });
}

export class InMemoryMetaCredentialProvider implements MetaCredentialProvider {
  readonly #credentials = new Map<string, MetaCredentialMaterial>();

  constructor(credentials: readonly InMemoryMetaCredentialInput[] = []) {
    for (const credential of credentials) this.set(credential);
  }

  set(input: InMemoryMetaCredentialInput): void {
    if (!isMetaCredentialRole(input.role)) throw new TypeError('META_CREDENTIAL_ROLE_INVALID');
    const material = buildMaterial(input);
    this.#credentials.set(credentialKey(material.metadata), material);
  }

  async resolve(input: MetaCredentialLookup): Promise<MetaCredentialMaterial> {
    const key = credentialKey(input);
    const credential = this.#credentials.get(key);
    if (!credential) {
      throw new MetaCredentialResolutionError(
        'META_CREDENTIAL_NOT_CONFIGURED',
        'The required Meta credential is not configured.',
        { connectionKey: input.connectionKey, role: input.role },
      );
    }
    return credential;
  }
}
