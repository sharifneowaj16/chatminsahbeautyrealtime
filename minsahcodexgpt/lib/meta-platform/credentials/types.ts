import type { MetaCredentialRole } from './roles';

export interface MetaCredentialMetadata {
  readonly connectionKey: string;
  readonly role: MetaCredentialRole;
  readonly secretRef: string;
  readonly credentialVersion: string;
  readonly permissions: readonly string[];
  readonly rotatedAt: string | null;
  readonly expiresAt: string | null;
  readonly dataAccessExpiresAt: string | null;
  readonly appId: string | null;
}

export interface MetaCredentialLookup {
  readonly connectionKey: string;
  readonly role: MetaCredentialRole;
}

export interface MetaCredentialProvider {
  resolve(input: MetaCredentialLookup): Promise<MetaCredentialMaterial>;
}

export interface MetaCredentialMaterial {
  readonly metadata: MetaCredentialMetadata;
  readAccessToken(): string;
  readAppSecret(): string;
  toJSON(): MetaCredentialMetadata;
}

export interface MetaCredentialMetadataRepository {
  upsert(metadata: MetaCredentialMetadata): Promise<void>;
}
