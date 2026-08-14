import 'server-only';

import { createMetaPlatformError } from '../core/errors';
import { metaFailure, metaSuccess, type MetaResult } from '../core/result';
import type { MetaCapabilityId } from '../types';
import type { MetaCredentialMaterial, MetaCredentialProvider } from '../credentials/types';
import type { MetaCredentialRole } from '../credentials/roles';
import { MetaCredentialResolutionError } from '../credentials/provider';
import { getMetaCapabilityPermissionRequirement, getRequiredMetaPermissions } from './permission-matrix';
import {
  DEFAULT_META_GRAPH_API_VERSION,
  META_BUSINESS_SDK_VERSION,
  evaluateMetaFeatureCompatibility,
  type MetaFeatureCompatibilityResult,
} from '../versioning/registry';

export interface MetaCapabilityAuthorization {
  readonly capability: MetaCapabilityId;
  readonly credential: MetaCredentialMaterial | null;
  readonly requiredPermissions: readonly string[];
  readonly featureCompatibility: MetaFeatureCompatibilityResult;
}

export async function authorizeMetaCapability(input: {
  readonly capability: MetaCapabilityId;
  readonly connectionKey: string;
  readonly credentialRole?: MetaCredentialRole;
  readonly credentialProvider: MetaCredentialProvider;
  readonly graphApiVersion?: string;
  readonly sdkVersion?: string;
  readonly correlationId?: string;
}): Promise<MetaResult<MetaCapabilityAuthorization>> {
  const requirement = getMetaCapabilityPermissionRequirement(input.capability);
  const graphApiVersion = input.graphApiVersion ?? DEFAULT_META_GRAPH_API_VERSION;
  const sdkVersion = input.sdkVersion ?? META_BUSINESS_SDK_VERSION;
  const featureCompatibility = evaluateMetaFeatureCompatibility({
    featureId: requirement.featureId,
    graphApiVersion,
    sdkVersion,
  });

  if (!featureCompatibility.compatible) {
    return metaFailure(createMetaPlatformError({
      code: 'META_FEATURE_VERSION_INCOMPATIBLE',
      category: 'CONFIGURATION',
      message: 'The selected Meta API or SDK version is not approved for this capability.',
      retryable: false,
      safeDetails: { capability: input.capability, featureId: requirement.featureId, reasons: featureCompatibility.reasons },
      correlationId: input.correlationId,
    }));
  }

  if (requirement.credentialMode === 'NONE') {
    return metaSuccess(Object.freeze({ capability: input.capability, credential: null, requiredPermissions: Object.freeze([]), featureCompatibility }), input.correlationId);
  }
  if (!input.credentialRole) {
    if (requirement.credentialMode === 'OPTIONAL') {
      return metaSuccess(Object.freeze({ capability: input.capability, credential: null, requiredPermissions: Object.freeze([]), featureCompatibility }), input.correlationId);
    }
    return metaFailure(createMetaPlatformError({
      code: 'META_CREDENTIAL_ROLE_REQUIRED',
      category: 'AUTHENTICATION',
      message: 'An explicit Meta credential role is required for this capability.',
      retryable: false,
      safeDetails: { capability: input.capability, allowedRoles: requirement.allowedRoles },
      correlationId: input.correlationId,
    }));
  }
  if (!requirement.allowedRoles.includes(input.credentialRole)) {
    return metaFailure(createMetaPlatformError({
      code: 'META_CREDENTIAL_ROLE_NOT_ALLOWED',
      category: 'AUTHORIZATION',
      message: 'The selected Meta credential role is not allowed for this capability.',
      retryable: false,
      safeDetails: { capability: input.capability, requestedRole: input.credentialRole, allowedRoles: requirement.allowedRoles },
      correlationId: input.correlationId,
    }));
  }

  let credential: MetaCredentialMaterial;
  try {
    credential = await input.credentialProvider.resolve({ connectionKey: input.connectionKey, role: input.credentialRole });
  } catch (error) {
    const safe = error instanceof MetaCredentialResolutionError
      ? { code: error.code, details: error.safeDetails }
      : { code: 'META_CREDENTIAL_RESOLUTION_FAILED', details: { role: input.credentialRole } };
    return metaFailure(createMetaPlatformError({
      code: safe.code,
      category: 'AUTHENTICATION',
      message: 'The required Meta credential could not be resolved.',
      retryable: false,
      safeDetails: { capability: input.capability, ...safe.details },
      correlationId: input.correlationId,
    }));
  }

  const requiredPermissions = getRequiredMetaPermissions(input.capability, input.credentialRole);
  const granted = new Set(credential.metadata.permissions);
  const missing = requiredPermissions.filter((permission) => !granted.has(permission));
  if (missing.length > 0) {
    return metaFailure(createMetaPlatformError({
      code: 'META_REQUIRED_PERMISSION_MISSING',
      category: 'AUTHORIZATION',
      message: 'The selected Meta credential is missing required permissions.',
      retryable: false,
      safeDetails: { capability: input.capability, role: input.credentialRole, missingPermissions: missing },
      correlationId: input.correlationId,
    }));
  }

  return metaSuccess(Object.freeze({
    capability: input.capability,
    credential,
    requiredPermissions,
    featureCompatibility,
  }), input.correlationId);
}
