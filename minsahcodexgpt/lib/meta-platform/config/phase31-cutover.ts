import manifestJson from '../../../config/meta-phase31-cutover-flags.json' with { type: 'json' };

type EnvSource = Readonly<Record<string, string | undefined>>;

type CutoverFlagTier = 'required' | 'optional';
type CutoverFlagDefinition = Readonly<{
  name: string;
  tier: CutoverFlagTier;
  defaultValue: boolean;
  productionDefault: boolean;
  failSafeValue: boolean;
  purpose: string;
  nextWiringItem: string;
}>;

type CutoverManifest = Readonly<{
  schemaVersion: number;
  phase: number;
  item: string;
  title: string;
  acceptedBooleanValues: string[];
  invalidValuePolicy: string;
  flags: CutoverFlagDefinition[];
}>;

const manifest = manifestJson as CutoverManifest;
const TRUE_VALUES = new Set(['true', '1', 'yes']);
const FALSE_VALUES = new Set(['false', '0', 'no']);

export const META_PHASE31_CUTOVER_FLAG_DEFINITIONS = Object.freeze(
  manifest.flags.map((flag) => Object.freeze({ ...flag })),
);

export type MetaPhase31CutoverFlagName = (typeof META_PHASE31_CUTOVER_FLAG_DEFINITIONS)[number]['name'];
export type MetaPhase31CutoverFlagSource = 'DEFAULT' | 'ENVIRONMENT' | 'INVALID_FAIL_SAFE';

export type MetaPhase31CutoverFlagStatus = Readonly<{
  name: string;
  tier: CutoverFlagTier;
  configured: boolean;
  enabled: boolean;
  valid: boolean;
  source: MetaPhase31CutoverFlagSource;
  reasonCode: string;
  defaultValue: boolean;
  productionDefault: boolean;
  purpose: string;
  nextWiringItem: string;
}>;

function normalize(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized || undefined;
}

function reasonCode(source: MetaPhase31CutoverFlagSource, enabled: boolean): string {
  if (source === 'INVALID_FAIL_SAFE') return enabled ? 'INVALID_VALUE_FAIL_SAFE_ENABLED' : 'INVALID_VALUE_FAIL_SAFE_DISABLED';
  if (source === 'ENVIRONMENT') return enabled ? 'EXPLICITLY_ENABLED' : 'EXPLICITLY_DISABLED';
  return enabled ? 'DEFAULT_ENABLED' : 'DEFAULT_DISABLED';
}

export function resolveMetaPhase31CutoverFlag(
  definition: CutoverFlagDefinition,
  source: EnvSource = process.env,
): MetaPhase31CutoverFlagStatus {
  const configuredValue = normalize(source[definition.name]);
  if (configuredValue === undefined) {
    return Object.freeze({
      ...definition,
      configured: false,
      enabled: definition.defaultValue,
      valid: true,
      source: 'DEFAULT' as const,
      reasonCode: reasonCode('DEFAULT', definition.defaultValue),
    });
  }

  if (TRUE_VALUES.has(configuredValue) || FALSE_VALUES.has(configuredValue)) {
    const enabled = TRUE_VALUES.has(configuredValue);
    return Object.freeze({
      ...definition,
      configured: true,
      enabled,
      valid: true,
      source: 'ENVIRONMENT' as const,
      reasonCode: reasonCode('ENVIRONMENT', enabled),
    });
  }

  return Object.freeze({
    ...definition,
    configured: true,
    enabled: definition.failSafeValue,
    valid: false,
    source: 'INVALID_FAIL_SAFE' as const,
    reasonCode: reasonCode('INVALID_FAIL_SAFE', definition.failSafeValue),
  });
}

export function getMetaPhase31CutoverValidationIssues(source: EnvSource = process.env): string[] {
  return META_PHASE31_CUTOVER_FLAG_DEFINITIONS
    .map((definition) => resolveMetaPhase31CutoverFlag(definition, source))
    .filter((status) => !status.valid)
    .map((status) => `${status.name} must be true/false, 1/0, or yes/no`);
}

export function getMetaPhase31CutoverStatus(source: EnvSource = process.env) {
  const entries = META_PHASE31_CUTOVER_FLAG_DEFINITIONS.map((definition) =>
    resolveMetaPhase31CutoverFlag(definition, source),
  );
  const invalidFlags = entries.filter((entry) => !entry.valid).map((entry) => entry.name);
  const enabledFlags = entries.filter((entry) => entry.enabled).map((entry) => entry.name);
  return Object.freeze({
    schemaVersion: manifest.schemaVersion,
    phase: manifest.phase,
    item: manifest.item,
    valid: invalidFlags.length === 0,
    configuredCount: entries.filter((entry) => entry.configured).length,
    invalidFlags: Object.freeze(invalidFlags),
    enabledFlags: Object.freeze(enabledFlags),
    flags: Object.freeze(Object.fromEntries(entries.map((entry) => [entry.name, entry]))),
  });
}
