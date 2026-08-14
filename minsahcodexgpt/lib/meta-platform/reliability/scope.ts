import type { MetaReliabilityScope } from './types';

function clean(value: string, max: number, code: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > max || /[\r\n\0]/.test(normalized)) throw new TypeError(code);
  return normalized;
}

export function metaReliabilityScopeKey(scope: MetaReliabilityScope): string {
  const environment = clean(scope.environment, 20, 'META_RELIABILITY_ENVIRONMENT_INVALID');
  const connectionKey = clean(scope.connectionKey, 80, 'META_RELIABILITY_CONNECTION_KEY_INVALID');
  const capability = clean(scope.capability, 120, 'META_RELIABILITY_CAPABILITY_INVALID');
  const operation = clean(scope.operation, 160, 'META_RELIABILITY_OPERATION_INVALID');
  const asset = scope.assetId
    ? `${scope.assetType ?? 'UNKNOWN'}:${clean(scope.assetId, 255, 'META_RELIABILITY_ASSET_ID_INVALID')}`
    : 'NO_ASSET';
  return `${environment}:${connectionKey}:${capability}:${asset}:${operation}`;
}

export function metaRateLimitScopeKeys(scope: MetaReliabilityScope): readonly string[] {
  const root = `${scope.environment}:${scope.connectionKey}`;
  const keys = [
    `${root}:APP`,
    `${root}:CAPABILITY:${scope.capability}`,
  ];
  if (scope.assetId) keys.push(`${root}:ASSET:${scope.assetType ?? 'UNKNOWN'}:${scope.assetId}`);
  return Object.freeze(keys);
}
