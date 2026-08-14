import controlManifestJson from '../../../config/meta-phase31-outbound-write-controls.json' with { type: 'json' };

type EnvSource = Readonly<Record<string, string | undefined>>;

export type MetaSocialOutboundOperation =
  | 'INSTAGRAM_STANDARD_REPLY'
  | 'INSTAGRAM_PRIVATE_REPLY'
  | 'FACEBOOK_PAGE_MESSAGE'
  | 'FACEBOOK_PAGE_COMMENT_REPLY'
  | 'FACEBOOK_PAGE_MEDIA';

export type MetaSocialOutboundControlStatus = Readonly<{
  operation: MetaSocialOutboundOperation;
  enabled: boolean;
  reasonCode: string;
  blockers: readonly string[];
  evaluatedAt: string;
}>;

type BooleanResolution = Readonly<{
  configured: boolean;
  valid: boolean;
  enabled: boolean;
  source: 'DEFAULT' | 'ENVIRONMENT' | 'INVALID_FAIL_SAFE';
}>;

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);
const manifest = controlManifestJson as Readonly<{
  schemaVersion: number;
  phase: number;
  item: string;
  operations: readonly MetaSocialOutboundOperation[];
}>;

function runtimeEnv(): EnvSource {
  const runtime = globalThis as typeof globalThis & { process?: { env?: EnvSource } };
  return runtime.process?.env ?? {};
}

function normalized(value: string | undefined): string | undefined {
  const result = value?.trim().toLowerCase();
  return result || undefined;
}

function resolveBoolean(
  value: string | undefined,
  defaultValue: boolean,
  invalidValueFailSafe: boolean,
): BooleanResolution {
  const current = normalized(value);
  if (current === undefined) {
    return Object.freeze({ configured: false, valid: true, enabled: defaultValue, source: 'DEFAULT' as const });
  }
  if (TRUE_VALUES.has(current) || FALSE_VALUES.has(current)) {
    return Object.freeze({ configured: true, valid: true, enabled: TRUE_VALUES.has(current), source: 'ENVIRONMENT' as const });
  }
  return Object.freeze({ configured: true, valid: false, enabled: invalidValueFailSafe, source: 'INVALID_FAIL_SAFE' as const });
}

function killSwitchBlocker(name: string, value: string | undefined): string | null {
  const status = resolveBoolean(value, false, true);
  if (!status.enabled) return null;
  return status.valid ? `${name}_ACTIVE` : `${name}_INVALID_FAIL_SAFE_ACTIVE`;
}

function enableFlagBlocker(name: string, value: string | undefined): string | null {
  const status = resolveBoolean(value, false, false);
  if (status.enabled) return null;
  return status.valid ? `${name}_DISABLED` : `${name}_INVALID_FAIL_SAFE_DISABLED`;
}

export function getMetaSocialOutboundWriteControl(
  operation: MetaSocialOutboundOperation,
  env: EnvSource = runtimeEnv(),
  now: Date = new Date(),
): MetaSocialOutboundControlStatus {
  if (!manifest.operations.includes(operation)) throw new TypeError('META_SOCIAL_OUTBOUND_OPERATION_INVALID');
  if (!Number.isFinite(now.getTime())) throw new TypeError('META_SOCIAL_OUTBOUND_CONTROL_TIME_INVALID');

  const blockers: string[] = [];
  const common = [
    killSwitchBlocker('META_PLATFORM_GLOBAL_KILL_SWITCH', env.META_PLATFORM_GLOBAL_KILL_SWITCH),
    killSwitchBlocker('META_PLATFORM_SOCIAL_OUTBOUND_KILL_SWITCH', env.META_PLATFORM_SOCIAL_OUTBOUND_KILL_SWITCH),
  ];
  blockers.push(...common.filter((value): value is string => Boolean(value)));

  if (operation.startsWith('INSTAGRAM_')) {
    const instagramKill = killSwitchBlocker('META_PLATFORM_INSTAGRAM_KILL_SWITCH', env.META_PLATFORM_INSTAGRAM_KILL_SWITCH);
    if (instagramKill) blockers.push(instagramKill);
    const writes = enableFlagBlocker('META_PLATFORM_INSTAGRAM_WRITES', env.META_PLATFORM_INSTAGRAM_WRITES);
    if (writes) blockers.push(writes);
    if (operation === 'INSTAGRAM_PRIVATE_REPLY') {
      const privateReplies = enableFlagBlocker(
        'META_PLATFORM_INSTAGRAM_PRIVATE_REPLY',
        env.META_PLATFORM_INSTAGRAM_PRIVATE_REPLY,
      );
      if (privateReplies) blockers.push(privateReplies);
    }
  } else {
    const facebookKill = killSwitchBlocker('META_PLATFORM_FACEBOOK_KILL_SWITCH', env.META_PLATFORM_FACEBOOK_KILL_SWITCH);
    if (facebookKill) blockers.push(facebookKill);
  }

  return Object.freeze({
    operation,
    enabled: blockers.length === 0,
    reasonCode: blockers[0] ?? 'ENABLED',
    blockers: Object.freeze(blockers),
    evaluatedAt: now.toISOString(),
  });
}

export function assertMetaSocialOutboundWriteEnabled(
  operation: MetaSocialOutboundOperation,
  env: EnvSource = runtimeEnv(),
): void {
  const control = getMetaSocialOutboundWriteControl(operation, env);
  if (control.enabled) return;
  throw Object.assign(new Error(control.reasonCode), {
    code: control.reasonCode,
    status: 409,
    retryable: false as const,
    policyBlocked: true as const,
    operation,
  });
}

export function getMetaSocialOutboundWriteControlSummary(env: EnvSource = runtimeEnv()) {
  return Object.freeze({
    schemaVersion: manifest.schemaVersion,
    phase: manifest.phase,
    item: manifest.item,
    standardReply: getMetaSocialOutboundWriteControl('INSTAGRAM_STANDARD_REPLY', env),
    privateReply: getMetaSocialOutboundWriteControl('INSTAGRAM_PRIVATE_REPLY', env),
    facebookMessage: getMetaSocialOutboundWriteControl('FACEBOOK_PAGE_MESSAGE', env),
    facebookCommentReply: getMetaSocialOutboundWriteControl('FACEBOOK_PAGE_COMMENT_REPLY', env),
    facebookMedia: getMetaSocialOutboundWriteControl('FACEBOOK_PAGE_MEDIA', env),
  });
}
