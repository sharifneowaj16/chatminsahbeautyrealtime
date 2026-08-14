import 'server-only';

import { MetaPlatformConnectionHealthService } from '../domains/connection/service';
import type { MetaPlatformConnectionReadiness } from '../domains/connection/types';
import { resolveMetaConnectionCutover } from './phase28-cutover';
import type { MetaConnectionBootstrap } from '@/lib/meta/connection/config';
import type { MetaConnectionReadiness } from '@/lib/meta/connection/types';
import { buildMetaConnectionBootstrapReadiness as buildLegacyBootstrap } from '@/lib/meta/connection/legacy-readiness';

function mutablePlatformReadiness(value: MetaPlatformConnectionReadiness): MetaConnectionReadiness {
  return {
    connectionName: value.connectionName,
    checkedAt: value.checkedAt,
    status: value.status,
    graphApiVersion: value.graphApiVersion,
    sdkVersion: value.sdkVersion,
    tokenRef: value.tokenRef,
    token: {
      configured: value.token.configured,
      verified: value.token.verified,
      valid: value.token.valid,
      appIdMatches: value.token.appIdMatches,
      appId: value.token.appId,
      type: value.token.type,
      expiresAt: value.token.expiresAt,
      dataAccessExpiresAt: value.token.dataAccessExpiresAt,
      scopes: [...value.token.scopes],
      ...(value.token.error ? { error: { ...value.token.error } } : {}),
    },
    permissions: {
      checked: value.permissions.checked,
      required: [...value.permissions.required],
      granted: [...value.permissions.granted],
      declined: [...value.permissions.declined],
      missing: [...value.permissions.missing],
      ok: value.permissions.ok,
      ...(value.permissions.error ? { error: { ...value.permissions.error } } : {}),
    },
    assets: Object.fromEntries(Object.entries(value.assets).map(([key, asset]) => [key, {
      ...asset,
      ...(asset.error ? { error: { ...asset.error } } : {}),
    }])) as MetaConnectionReadiness['assets'],
    versionPolicy: { ...value.versionPolicy, warnings: [...value.versionPolicy.warnings] },
    warnings: [...value.warnings],
    lastError: value.lastError ? { ...value.lastError } : null,
  };
}

function compareReadiness(legacy: MetaConnectionReadiness, platform: MetaConnectionReadiness) {
  const differences: string[] = [];
  if (legacy.status !== platform.status) differences.push('status');
  if (legacy.token.valid !== platform.token.valid) differences.push('token.valid');
  if (legacy.token.appIdMatches !== platform.token.appIdMatches) differences.push('token.appIdMatches');
  if (legacy.permissions.ok !== platform.permissions.ok) differences.push('permissions.ok');
  if (legacy.permissions.missing.join(',') !== platform.permissions.missing.join(',')) differences.push('permissions.missing');
  for (const key of Object.keys(legacy.assets) as Array<keyof MetaConnectionReadiness['assets']>) {
    if (legacy.assets[key].status !== platform.assets[key].status) differences.push(`assets.${key}`);
  }
  return Object.freeze(differences);
}

export function getMetaConnectionCutoverStatus(env: NodeJS.ProcessEnv = process.env) {
  return resolveMetaConnectionCutover(env);
}

export async function checkMetaConnectionReadinessThroughPlatform(input: {
  readonly config?: MetaConnectionBootstrap;
  readonly fetchImpl?: typeof fetch;
  readonly now?: Date;
  readonly persist?: boolean;
  readonly correlationId?: string;
} = {}): Promise<MetaConnectionReadiness> {
  // Explicit legacy config is retained only as a deterministic test/rollback seam.
  if (input.config) {
    const legacy = await import('@/lib/meta/connection/legacy-readiness');
    return legacy.checkMetaConnectionReadiness({ ...input, config: input.config });
  }

  const cutover = resolveMetaConnectionCutover();
  const platformService = new MetaPlatformConnectionHealthService({ fetchImpl: input.fetchImpl });
  const runPlatform = async () => mutablePlatformReadiness(await platformService.check({ now: input.now, correlationId: input.correlationId }));
  const runLegacy = async () => {
    const legacy = await import('@/lib/meta/connection/legacy-readiness');
    return legacy.checkMetaConnectionReadiness({ fetchImpl: input.fetchImpl, now: input.now, persist: false });
  };

  let selected: MetaConnectionReadiness;
  if (cutover.mode === 'PLATFORM' || cutover.legacyDisabled) {
    selected = await runPlatform();
  } else if (cutover.mode === 'SHADOW') {
    const [legacyResult, platformResult] = await Promise.all([runLegacy(), runPlatform()]);
    const differences = compareReadiness(legacyResult, platformResult);
    selected = {
      ...legacyResult,
      warnings: differences.length > 0
        ? [...new Set([...legacyResult.warnings, 'META_CONNECTION_SHADOW_MISMATCH', ...differences.map((item) => `META_CONNECTION_SHADOW_${item.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`)])]
        : [...legacyResult.warnings, 'META_CONNECTION_SHADOW_MATCH'],
    };
  } else {
    selected = await runLegacy();
  }

  if (input.persist !== false) {
    const repository = await import('@/lib/meta/connection/repository');
    await repository.persistMetaConnectionReadiness(selected);
  }
  return selected;
}

export function buildMetaConnectionBootstrapThroughPlatform(now = new Date()): MetaConnectionReadiness {
  const cutover = resolveMetaConnectionCutover();
  if (cutover.mode === 'PLATFORM' || cutover.legacyDisabled) {
    return mutablePlatformReadiness(new MetaPlatformConnectionHealthService().bootstrap({ now }));
  }
  return buildLegacyBootstrap(now);
}
