import type { MetaCanonicalAttributes } from '../models/canonical';
import type { MetaReferenceScope } from '../context/asset-context';

export const META_EXTERNAL_REFERENCE_SOURCES = ['RUNTIME', 'BACKFILL', 'RECONCILIATION', 'MANUAL'] as const;
export type MetaExternalReferenceSource = (typeof META_EXTERNAL_REFERENCE_SOURCES)[number];

export interface MetaExternalReferenceRecord extends MetaReferenceScope {
  readonly id: string;
  readonly objectType: string;
  readonly localId: string;
  readonly providerId: string;
  readonly providerParentId?: string;
  readonly canonicalKey?: string;
  readonly source: MetaExternalReferenceSource;
  readonly metadata?: MetaCanonicalAttributes;
  readonly lastVerifiedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RegisterMetaExternalReferenceInput extends MetaReferenceScope {
  readonly objectType: string;
  readonly localId: string;
  readonly providerId: string;
  readonly providerParentId?: string;
  readonly canonicalKey?: string;
  readonly source?: MetaExternalReferenceSource;
  readonly metadata?: MetaCanonicalAttributes;
  readonly lastVerifiedAt?: Date | string;
}

export interface MetaExternalReferenceLookup extends MetaReferenceScope {
  readonly objectType: string;
}

export interface MetaExternalReferenceLocalLookup extends MetaExternalReferenceLookup {
  readonly localId: string;
}

export interface MetaExternalReferenceProviderLookup extends MetaExternalReferenceLookup {
  readonly providerId: string;
}
