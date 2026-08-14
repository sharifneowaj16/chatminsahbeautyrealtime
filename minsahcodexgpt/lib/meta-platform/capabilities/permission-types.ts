import type { MetaCredentialRole } from '../credentials/roles';
import type { MetaCapabilityId } from '../types';
import type { MetaFeatureId } from '../versioning/types';

export const META_CREDENTIAL_REQUIREMENT_MODES = ['NONE', 'OPTIONAL', 'EXPLICIT'] as const;
export type MetaCredentialRequirementMode = (typeof META_CREDENTIAL_REQUIREMENT_MODES)[number];

export interface MetaCapabilityPermissionRequirement {
  readonly capability: MetaCapabilityId;
  readonly credentialMode: MetaCredentialRequirementMode;
  readonly allowedRoles: readonly MetaCredentialRole[];
  readonly permissionsByRole: Readonly<Partial<Record<MetaCredentialRole, readonly string[]>>>;
  readonly featureId: MetaFeatureId;
}
