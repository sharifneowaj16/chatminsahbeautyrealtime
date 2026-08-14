import { getMetaFacebookRealtimeCutoverStatus } from './cutover.ts';

export type FacebookInboxRuntimeMode = 'LEGACY' | 'SHADOW' | 'PLATFORM' | 'LEGACY_ROLLBACK' | 'BLOCKED';

export function getFacebookInboxRuntimeMode(
  env: Readonly<Record<string, string | undefined>> = {},
): FacebookInboxRuntimeMode {
  return getMetaFacebookRealtimeCutoverStatus(env).mode;
}
