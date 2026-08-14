import 'server-only';

import manifestJson from '@/config/env.manifest.json';

type NodeEnvironment = 'development' | 'test' | 'production';
type EnvSource = NodeJS.ProcessEnv;

type EnvManifest = {
  required: string[];
  productionRequired: string[];
  recommendedProduction: string[];
  urls: string[];
  booleans: string[];
  integers: string[];
  positiveNumbers: string[];
  secretMinimumLengths: Record<string, number>;
  placeholderFragments: string[];
};

const manifest = manifestJson as EnvManifest;

const optionalDefaults: Readonly<Record<string, string>> = {
  NODE_ENV: 'development',
  PORT: '3000',
  JWT_ACCESS_EXPIRY: '15m',
  JWT_REFRESH_EXPIRY: '7d',
  MINIO_PORT: '9000',
  MINIO_USE_SSL: 'false',
  MINIO_BUCKET_NAME: 'minsah-beauty',
  PATHAO_DEFAULT_ITEM_WEIGHT_KG: '0.1',
};

export class EnvValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid environment configuration: ${issues.join('; ')}`);
    this.name = 'EnvValidationError';
    this.issues = issues;
  }
}

export type ValidateEnvOptions = {
  source?: EnvSource;
  production?: boolean;
  rejectPlaceholders?: boolean;
};

function normalize(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function hasPlaceholder(value: string): boolean {
  const normalized = value.toLowerCase();
  return manifest.placeholderFragments.some((fragment) => normalized.includes(fragment));
}

/**
 * Validates the shared runtime contract without changing application behavior.
 * Integrations remain optional unless they are enabled by their own feature flag.
 */
export function validateEnv(options: ValidateEnvOptions = {}): void {
  const source = options.source ?? process.env;
  const production = options.production ?? source.NODE_ENV === 'production';
  const rejectPlaceholders = options.rejectPlaceholders ?? production;
  const issues: string[] = [];
  const required = production
    ? [...manifest.required, ...manifest.productionRequired]
    : manifest.required;

  for (const key of required) {
    const value = normalize(source[key]);
    if (!value) {
      issues.push(`${key} is required${production ? ' in production' : ''}`);
    } else if (rejectPlaceholders && hasPlaceholder(value)) {
      issues.push(`${key} contains a placeholder value`);
    }
  }

  for (const key of manifest.urls) {
    const value = normalize(source[key]);
    if (!value || (rejectPlaceholders && hasPlaceholder(value))) continue;
    try {
      const parsed = new URL(value);
      if (!parsed.protocol || !parsed.hostname) issues.push(`${key} must be an absolute URL`);
    } catch {
      issues.push(`${key} must be a valid absolute URL`);
    }
  }

  const acceptedBooleans = new Set(['true', 'false', '1', '0', 'yes', 'no']);
  for (const key of manifest.booleans) {
    const value = normalize(source[key])?.toLowerCase();
    if (value && !acceptedBooleans.has(value)) {
      issues.push(`${key} must be true/false, 1/0, or yes/no`);
    }
  }

  for (const key of manifest.integers) {
    const value = normalize(source[key]);
    if (value && !/^-?\d+$/.test(value)) issues.push(`${key} must be an integer`);
  }

  for (const key of manifest.positiveNumbers) {
    const value = normalize(source[key]);
    if (!value) continue;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) issues.push(`${key} must be a positive number`);
  }

  for (const [key, minimumLength] of Object.entries(manifest.secretMinimumLengths)) {
    const value = normalize(source[key]);
    if (!value || (rejectPlaceholders && hasPlaceholder(value))) continue;
    if (value.length < minimumLength) {
      issues.push(`${key} must be at least ${minimumLength} characters`);
    }
  }

  if (issues.length > 0) throw new EnvValidationError([...new Set(issues)]);
}

export function getOptionalEnv(key: string, source: EnvSource = process.env): string | undefined {
  return normalize(source[key]);
}

export function getEnv(
  key: string,
  defaultValue?: string,
  source: EnvSource = process.env,
): string {
  const value = getOptionalEnv(key, source);
  if (value !== undefined) return value;
  if (defaultValue !== undefined) return defaultValue;
  const configuredDefault = optionalDefaults[key];
  if (configuredDefault !== undefined) return configuredDefault;
  throw new EnvValidationError([`${key} is not set and has no default`]);
}

export function getRequiredEnv(key: string, source: EnvSource = process.env): string {
  const value = getOptionalEnv(key, source);
  if (!value) throw new EnvValidationError([`${key} is required`]);
  return value;
}

export function getEnvBoolean(
  key: string,
  defaultValue = false,
  source: EnvSource = process.env,
): boolean {
  const value = getOptionalEnv(key, source)?.toLowerCase();
  if (value === undefined) return defaultValue;
  if (['true', '1', 'yes'].includes(value)) return true;
  if (['false', '0', 'no'].includes(value)) return false;
  throw new EnvValidationError([`${key} must be true/false, 1/0, or yes/no`]);
}

export function getEnvNumber(
  key: string,
  defaultValue: number,
  source: EnvSource = process.env,
): number {
  const value = getOptionalEnv(key, source);
  if (value === undefined) return defaultValue;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new EnvValidationError([`${key} must be a number`]);
  return parsed;
}

export function getEnvUrl(
  key: string,
  defaultValue?: string,
  source: EnvSource = process.env,
): string {
  const value = getEnv(key, defaultValue, source);
  try {
    return new URL(value).toString().replace(/\/$/, '');
  } catch {
    throw new EnvValidationError([`${key} must be a valid absolute URL`]);
  }
}

export function getEnvList(
  key: string,
  defaultValue: string[] = [],
  source: EnvSource = process.env,
): string[] {
  const value = getOptionalEnv(key, source);
  if (!value) return defaultValue;
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];
}

export function isProduction(source: EnvSource = process.env): boolean {
  return source.NODE_ENV === 'production';
}

export function isDevelopment(source: EnvSource = process.env): boolean {
  return (source.NODE_ENV ?? 'development') === 'development';
}

export const env = {
  nodeEnv: (): NodeEnvironment => {
    const value = getEnv('NODE_ENV', 'development');
    if (value === 'development' || value === 'test' || value === 'production') return value;
    throw new EnvValidationError(['NODE_ENV must be development, test, or production']);
  },
  appUrl: () => getEnvUrl('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  port: () => getEnvNumber('PORT', 3000),

  nextAuthSecret: () => getRequiredEnv('NEXTAUTH_SECRET'),
  nextAuthUrl: () => getEnvUrl('NEXTAUTH_URL', 'http://localhost:3000'),
  jwtSecret: () => getRequiredEnv('JWT_SECRET'),
  jwtRefreshSecret: () => getRequiredEnv('JWT_REFRESH_SECRET'),
  jwtAccessExpiry: () => getEnv('JWT_ACCESS_EXPIRY', '15m'),
  jwtRefreshExpiry: () => getEnv('JWT_REFRESH_EXPIRY', '7d'),

  databaseUrl: () => getRequiredEnv('DATABASE_URL'),
  directUrl: () => getOptionalEnv('DIRECT_URL') ?? getRequiredEnv('DATABASE_URL'),
  redisUrl: () => getEnv('REDIS_URL', ''),

  minioEndpoint: () => getEnv('MINIO_ENDPOINT', 'localhost'),
  minioPort: () => getEnvNumber('MINIO_PORT', 9000),
  minioAccessKey: () => getEnv('MINIO_ACCESS_KEY', ''),
  minioSecretKey: () => getEnv('MINIO_SECRET_KEY', ''),
  minioBucketName: () => getEnv('MINIO_BUCKET_NAME', 'minsah-beauty'),
  minioUseSSL: () => getEnvBoolean('MINIO_USE_SSL', false),
  minioPublicUrl: () => getEnv('NEXT_PUBLIC_MINIO_PUBLIC_URL', ''),

  allowedOrigins: () => getEnvList('ALLOWED_ORIGINS', ['http://localhost:3000']),
};
