import matrixJson from '../../../config/meta-platform-permission-matrix.json';
import { META_CAPABILITY_IDS, type MetaCapabilityId } from '../types';
import { META_CREDENTIAL_REQUIREMENT_MODES, type MetaCapabilityPermissionRequirement, type MetaCredentialRequirementMode } from './permission-types';
import { isMetaCredentialRole, type MetaCredentialRole } from '../credentials/roles';
import { isMetaFeatureId, type MetaFeatureId } from '../versioning/registry';

export { META_CREDENTIAL_REQUIREMENT_MODES };
export type { MetaCapabilityPermissionRequirement, MetaCredentialRequirementMode };

interface RawRequirement {
  credentialMode?: unknown;
  allowedRoles?: unknown;
  permissionsByRole?: unknown;
  featureId?: unknown;
}

function normalizePermissions(values: unknown): readonly string[] {
  if (!Array.isArray(values) || values.some((value) => typeof value !== 'string')) {
    throw new Error('META_PERMISSION_MATRIX_PERMISSIONS_INVALID');
  }
  return Object.freeze([...new Set(values.map((value) => value.trim()).filter(Boolean))].sort());
}

function normalizeRequirement(capability: MetaCapabilityId, raw: RawRequirement): MetaCapabilityPermissionRequirement {
  if (!META_CREDENTIAL_REQUIREMENT_MODES.includes(raw.credentialMode as MetaCredentialRequirementMode)) {
    throw new Error('META_PERMISSION_MATRIX_MODE_INVALID');
  }
  const credentialMode = raw.credentialMode as MetaCredentialRequirementMode;
  if (!Array.isArray(raw.allowedRoles) || raw.allowedRoles.some((role) => !isMetaCredentialRole(role))) {
    throw new Error('META_PERMISSION_MATRIX_ROLE_INVALID');
  }
  if (!isMetaFeatureId(raw.featureId)) throw new Error('META_PERMISSION_MATRIX_FEATURE_INVALID');
  const featureId = raw.featureId;
  const permissionsRecord = raw.permissionsByRole;
  if (!permissionsRecord || typeof permissionsRecord !== 'object' || Array.isArray(permissionsRecord)) {
    throw new Error('META_PERMISSION_MATRIX_PERMISSIONS_INVALID');
  }
  const permissionsByRole: Partial<Record<MetaCredentialRole, readonly string[]>> = {};
  for (const [role, values] of Object.entries(permissionsRecord)) {
    if (!isMetaCredentialRole(role)) throw new Error('META_PERMISSION_MATRIX_ROLE_INVALID');
    permissionsByRole[role] = normalizePermissions(values);
  }
  const allowedRoles = Object.freeze([...new Set(raw.allowedRoles as MetaCredentialRole[])]);
  if (credentialMode === 'NONE' && allowedRoles.length > 0) throw new Error('META_PERMISSION_MATRIX_NONE_ROLE_CONFLICT');
  if (credentialMode !== 'NONE' && allowedRoles.length === 0) throw new Error('META_PERMISSION_MATRIX_ROLE_REQUIRED');
  if (allowedRoles.some((role) => !permissionsByRole[role])) throw new Error('META_PERMISSION_MATRIX_ROLE_PERMISSIONS_MISSING');
  return Object.freeze({ capability, credentialMode, allowedRoles, permissionsByRole: Object.freeze(permissionsByRole), featureId });
}

const rawCapabilities = (matrixJson as { schemaVersion?: unknown; capabilities?: unknown }).capabilities;
if ((matrixJson as { schemaVersion?: unknown }).schemaVersion !== 1 || !rawCapabilities || typeof rawCapabilities !== 'object' || Array.isArray(rawCapabilities)) {
  throw new Error('META_PERMISSION_MATRIX_INVALID');
}
const rawIds = Object.keys(rawCapabilities).sort();
const expectedIds = [...META_CAPABILITY_IDS].sort();
if (JSON.stringify(rawIds) !== JSON.stringify(expectedIds)) throw new Error('META_PERMISSION_MATRIX_INCOMPLETE');

export const META_CAPABILITY_PERMISSION_MATRIX = Object.freeze(Object.fromEntries(
  META_CAPABILITY_IDS.map((capability) => [capability, normalizeRequirement(capability, (rawCapabilities as Record<string, RawRequirement>)[capability])]),
)) as Readonly<Record<MetaCapabilityId, MetaCapabilityPermissionRequirement>>;

export function getMetaCapabilityPermissionRequirement(capability: MetaCapabilityId): MetaCapabilityPermissionRequirement {
  return META_CAPABILITY_PERMISSION_MATRIX[capability];
}

export function getRequiredMetaPermissions(capability: MetaCapabilityId, role: MetaCredentialRole): readonly string[] {
  const requirement = getMetaCapabilityPermissionRequirement(capability);
  return requirement.permissionsByRole[role] ?? Object.freeze([]);
}
