#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '..');

const DEFAULT_ENV_FILES = [
  '.env.production.local',
  '.env.local',
  '.env.production',
  '.env',
];

const PLACEHOLDER_PATTERNS = [
  /\byour[-_\s]?/i,
  /replace[-_\s]?with/i,
  /change[-_\s]?me/i,
  /changethisimmediately/i,
  /generate[-_\s]?(a[-_\s]?)?(secure|random)/i,
  /example\.com/i,
  /localhost/i,
  /127\.0\.0\.1/,
  /0\.0\.0\.0/,
  /x{6,}/i,
  /dummy/i,
  /placeholder/i,
  /demo[-_\s]?/i,
  /test[-_\s]?(secret|token|key|pixel|measurement|api)/i,
  /^g-?x{6,}$/i,
  /^ea[a-z0-9_\-|:.]{0,12}$/i,
];

const PUBLIC_SECRET_PATTERN = /^NEXT_PUBLIC_.*(SECRET|TOKEN|PRIVATE|PASSWORD|ACCESS_KEY|API_SECRET)/i;
const SAFE_PUBLIC_KEYS = new Set([
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_META_PIXEL_ID',
  'NEXT_PUBLIC_FB_PIXEL_ID',
  'NEXT_PUBLIC_GA4_MEASUREMENT_ID',
  'NEXT_PUBLIC_GTM_ID',
  'NEXT_PUBLIC_GTM_ENABLED',
  'NEXT_PUBLIC_CLARITY_ENABLED',
  'NEXT_PUBLIC_CLARITY_PROJECT_ID',
  'NEXT_PUBLIC_REQUIRE_TRACKING_CONSENT',
  'NEXT_PUBLIC_REALTIME_WS_URL',
]);

function normalizeKey(key) {
  return String(key || '').trim();
}

function stripQuotes(value) {
  const trimmed = String(value ?? '').trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseEnvText(text) {
  const parsed = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1];
    let value = match[2] ?? '';
    if (!/^['"]/.test(value)) {
      value = value.replace(/\s+#.*$/, '');
    }
    parsed[key] = stripQuotes(value);
  }
  return parsed;
}

export function loadTrackingDeployEnv({ root = DEFAULT_ROOT, envFiles = DEFAULT_ENV_FILES } = {}) {
  const fileValues = {};
  const loadedFiles = [];

  for (const relative of envFiles) {
    const filePath = path.join(root, relative);
    if (!fs.existsSync(filePath)) continue;
    const parsed = parseEnvText(fs.readFileSync(filePath, 'utf8'));
    Object.assign(fileValues, parsed);
    loadedFiles.push(relative);
  }

  return {
    ...fileValues,
    ...process.env,
    __loadedFiles: loadedFiles,
  };
}

function getValue(env, key) {
  return String(env[normalizeKey(key)] ?? '').trim();
}

function hasValue(env, key) {
  return getValue(env, key).length > 0;
}

function firstPresentValue(env, keys) {
  for (const key of keys) {
    const value = getValue(env, key);
    if (value) return { key, value };
  }
  return { key: keys[0], value: '' };
}

export function isPlaceholderValue(value, { allowLocalUrl = false } = {}) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return true;
  if (allowLocalUrl && /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/.*)?$/i.test(normalized)) {
    return false;
  }
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalized));
}

function looksLikeUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:', 'postgres:', 'postgresql:', 'mysql:', 'redis:', 'rediss:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function isValidAppUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function isValidHttpsUrl(value, { productionMode } = {}) {
  try {
    const url = new URL(value);
    if (!url.hostname) return false;
    return productionMode ? url.protocol === 'https:' : ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function isValidMinioEndpoint(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return false;
  if (/^https?:\/\//i.test(normalized)) return false;
  return /^[A-Za-z0-9.-]+$/.test(normalized);
}

function isValidPort(value) {
  const port = Number(String(value ?? '').trim());
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

function isNonEmptySafeValue(value) {
  return String(value ?? '').trim().length > 0;
}

function isBucketName(value) {
  const normalized = String(value ?? '').trim();
  return /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(normalized) && !normalized.includes('..');
}

function isBooleanLiteral(value) {
  return ['true', 'false'].includes(String(value ?? '').trim().toLowerCase());
}

function isValidRedisUrl(value) {
  try {
    const url = new URL(value);
    return ['redis:', 'rediss:'].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function isLikelyMetaPixelId(value) {
  return /^\d{10,30}$/.test(value);
}

function isLikelyGa4MeasurementId(value) {
  return /^G-[A-Z0-9]{6,20}$/i.test(value);
}

function isLikelySecret(value, minLength = 24) {
  const normalized = String(value ?? '').trim();
  return normalized.length >= minLength && !/^['"]?$/.test(normalized);
}

function isLikelyMetaCapiToken(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length >= 40 && /^[A-Za-z0-9._|:\-]+$/.test(normalized);
}

function isLikelyGraphVersion(value) {
  return /^v?\d{2,}\.\d+$/.test(String(value ?? '').trim());
}

function maskValue(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return '[missing]';
  if (looksLikeUrl(normalized)) {
    try {
      const url = new URL(normalized);
      return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}${url.pathname && url.pathname !== '/' ? '/…' : ''}`;
    } catch {
      return '[url]';
    }
  }
  if (normalized.length <= 8) return `${'*'.repeat(Math.max(normalized.length, 3))}`;
  return `${normalized.slice(0, 4)}…${normalized.slice(-4)} (${normalized.length} chars)`;
}

function createCheck({ code, status, category, label, message, hint, key, keys, value }) {
  return {
    code,
    status,
    severity: status,
    category,
    label,
    message,
    ...(hint ? { hint } : {}),
    ...(key ? { key } : {}),
    ...(keys ? { keys } : {}),
    ...(value !== undefined ? { value: maskValue(value) } : {}),
  };
}

function pass(args) {
  return createCheck({ ...args, status: 'PASS' });
}

function warn(args) {
  return createCheck({ ...args, status: 'WARN' });
}

function blocker(args) {
  return createCheck({ ...args, status: 'BLOCKER' });
}

function checkRequiredValue(checks, env, spec, productionMode) {
  const keys = Array.isArray(spec.keys) ? spec.keys : [spec.key];
  const found = firstPresentValue(env, keys);
  const label = spec.label;
  const placeholder = isPlaceholderValue(found.value, { allowLocalUrl: !productionMode && spec.allowLocalInDev });

  if (!found.value) {
    checks.push(blocker({
      code: spec.code,
      category: spec.category ?? 'environment',
      label,
      keys,
      message: `${label} is missing.`,
      hint: spec.hint ?? `Set ${keys.join(' or ')} in production env.`,
    }));
    return;
  }

  if (placeholder) {
    checks.push(blocker({
      code: `${spec.code}_PLACEHOLDER`,
      category: spec.category ?? 'environment',
      label,
      key: found.key,
      keys,
      value: found.value,
      message: `${label} is present but looks like a placeholder/demo/local value.`,
      hint: spec.hint ?? `Replace ${found.key} with the real production value.`,
    }));
    return;
  }

  if (spec.validate && !spec.validate(found.value, { productionMode })) {
    checks.push(blocker({
      code: `${spec.code}_INVALID_SHAPE`,
      category: spec.category ?? 'environment',
      label,
      key: found.key,
      keys,
      value: found.value,
      message: `${label} is present but has an invalid shape.`,
      hint: spec.shapeHint ?? spec.hint ?? `Verify ${found.key}.`,
    }));
    return;
  }

  checks.push(pass({
    code: spec.code,
    category: spec.category ?? 'environment',
    label,
    key: found.key,
    keys,
    value: found.value,
    message: `${label} is configured.`,
  }));
}

function collectKnownEnvValues(env, keyPatterns) {
  return Object.keys(env)
    .filter((key) => keyPatterns.some((pattern) => pattern.test(key)))
    .filter((key) => typeof env[key] === 'string')
    .map((key) => ({ key, value: getValue(env, key) }))
    .filter(({ value }) => value.length > 0);
}

export function runTrackingEnvAudit(options = {}) {
  const root = options.root ?? DEFAULT_ROOT;
  const env = options.env ?? loadTrackingDeployEnv({ root, envFiles: options.envFiles ?? DEFAULT_ENV_FILES });
  const productionMode = options.productionMode ?? options.production ?? env.NODE_ENV === 'production';
  const checks = [];

  checks.push(pass({
    code: 'ENV_AUDIT_LOADED',
    category: 'environment',
    label: 'Environment audit loader',
    message: env.__loadedFiles?.length
      ? `Loaded env files: ${env.__loadedFiles.join(', ')}.`
      : 'Using process environment; no local env file was loaded.',
  }));

  if (productionMode) {
    if (getValue(env, 'NODE_ENV') === 'production') {
      checks.push(pass({ code: 'NODE_ENV_PRODUCTION', category: 'environment', label: 'Node environment', key: 'NODE_ENV', value: 'production', message: 'NODE_ENV is production.' }));
    } else {
      checks.push(blocker({ code: 'NODE_ENV_NOT_PRODUCTION', category: 'environment', label: 'Node environment', key: 'NODE_ENV', value: getValue(env, 'NODE_ENV'), message: 'Production deploy gate requires NODE_ENV=production.', hint: 'Set NODE_ENV=production for the live deploy command.' }));
    }
  } else {
    checks.push(warn({ code: 'NODE_ENV_NOT_STRICT', category: 'environment', label: 'Node environment', key: 'NODE_ENV', value: getValue(env, 'NODE_ENV'), message: 'Running tracking env audit outside strict production mode.', hint: 'Use --production for the final deploy gate.' }));
  }

  const requiredSpecs = [
    { code: 'APP_URL_READY', label: 'Public app URL', keys: ['NEXT_PUBLIC_APP_URL', 'NEXTAUTH_URL'], validate: isValidAppUrl, shapeHint: 'Use a full HTTPS production URL such as https://your-domain.com.', allowLocalInDev: true },
    { code: 'DATABASE_READY', label: 'Database URL', key: 'DATABASE_URL', validate: looksLikeUrl, shapeHint: 'Use a PostgreSQL/MySQL connection URL from the production database provider.' },
    { code: 'REDIS_ENV_READY', label: 'Redis URL', key: 'REDIS_URL', validate: isValidRedisUrl, shapeHint: 'Use redis:// or rediss:// with a reachable production Redis host.' },
    { code: 'NEXTAUTH_SECRET_READY', label: 'NextAuth secret', key: 'NEXTAUTH_SECRET', validate: (value) => isLikelySecret(value, 32), shapeHint: 'Use a random 32+ character secret.' },
    { code: 'JWT_SECRET_READY', label: 'JWT secret', key: 'JWT_SECRET', validate: (value) => isLikelySecret(value, 32), shapeHint: 'Use a random 32+ character secret.' },
    { code: 'JWT_REFRESH_SECRET_READY', label: 'JWT refresh secret', key: 'JWT_REFRESH_SECRET', validate: (value) => isLikelySecret(value, 32), shapeHint: 'Use a random 32+ character secret different from JWT_SECRET.' },
    { code: 'PASSWORD_RESET_TOKEN_SECRET_READY', label: 'Password reset token HMAC secret', key: 'PASSWORD_RESET_TOKEN_SECRET', validate: (value) => isLikelySecret(value, 32), shapeHint: 'Use a separate random 32+ character secret for password reset OTP/token hashing.' },
    { code: 'PASSWORD_RESET_OTP_WEBHOOK_READY', label: 'Password reset OTP mailer webhook URL', key: 'PASSWORD_RESET_OTP_WEBHOOK_URL', validate: isValidHttpsUrl, shapeHint: 'Use a trusted HTTPS server-side mailer webhook URL; do not rely on console/debug OTP delivery.' },
    { code: 'PAYMENT_WEBHOOK_SECRET_READY', label: 'Payment webhook HMAC secret', key: 'PAYMENT_WEBHOOK_SECRET', validate: (value) => isLikelySecret(value, 32), shapeHint: 'Use a random 32+ character secret shared only with the verified payment callback sender.' },
    { code: 'BROWSER_PURCHASE_TOKEN_SECRET_READY', label: 'Browser purchase token secret', key: 'META_BROWSER_PURCHASE_TOKEN_SECRET', validate: (value) => isLikelySecret(value, 32), shapeHint: 'Use a separate random 32+ character secret for online browser Purchase dedup token signing.' },
    { code: 'MINIO_ENDPOINT_READY', label: 'MinIO endpoint host', key: 'MINIO_ENDPOINT', validate: isValidMinioEndpoint, shapeHint: 'Use the production object storage host only, without http:// or https://.' },
    { code: 'MINIO_PORT_READY', label: 'MinIO port', key: 'MINIO_PORT', validate: isValidPort, shapeHint: 'Use a numeric port from 1 to 65535, commonly 443 for TLS or 9000 for MinIO.' },
    { code: 'MINIO_SSL_FLAG_READY', label: 'MinIO SSL flag', key: 'MINIO_USE_SSL', validate: isBooleanLiteral, shapeHint: 'Use true or false. Production public object storage should normally use true.' },
    { code: 'MINIO_ACCESS_KEY_READY', label: 'MinIO access key', key: 'MINIO_ACCESS_KEY', validate: isNonEmptySafeValue, shapeHint: 'Use the production object storage access key.' },
    { code: 'MINIO_SECRET_KEY_READY', label: 'MinIO secret key', key: 'MINIO_SECRET_KEY', validate: (value) => isLikelySecret(value, 16), shapeHint: 'Use the production object storage secret key.' },
    { code: 'MINIO_BUCKET_READY', label: 'MinIO bucket name', key: 'MINIO_BUCKET_NAME', validate: isBucketName, shapeHint: 'Use the production object storage bucket name.' },
    { code: 'MINIO_PUBLIC_URL_READY', label: 'MinIO public CDN/object URL', key: 'NEXT_PUBLIC_MINIO_PUBLIC_URL', validate: isValidHttpsUrl, shapeHint: 'Use the HTTPS public base URL that serves product/media assets.' },
    { code: 'UNPAID_ORDER_CRON_SECRET_READY', label: 'Unpaid-order release cron secret', keys: ['CRON_SECRET', 'INTERNAL_CRON_SECRET'], validate: (value) => isLikelySecret(value, 32), shapeHint: 'Use a random 32+ character secret for /api/cron/release-unpaid-orders.' },
    { code: 'META_PIXEL_READY', label: 'Meta Pixel ID', keys: ['NEXT_PUBLIC_META_PIXEL_ID', 'NEXT_PUBLIC_FB_PIXEL_ID', 'META_PIXEL_ID'], validate: isLikelyMetaPixelId, shapeHint: 'Use a numeric Meta Pixel/Dataset ID.' },
    { code: 'META_DATASET_READY', label: 'Meta Dataset/Pixel ID', keys: ['META_DATASET_ID', 'META_PIXEL_ID', 'NEXT_PUBLIC_META_PIXEL_ID'], validate: isLikelyMetaPixelId, shapeHint: 'Use a numeric Meta Dataset/Pixel ID for CAPI.' },
    { code: 'META_CAPI_TOKEN_READY', label: 'Meta CAPI token', keys: ['META_CAPI_ACCESS_TOKEN', 'FACEBOOK_CONVERSION_API_TOKEN'], validate: isLikelyMetaCapiToken, shapeHint: 'Use the real server-only Meta System User access token; do not use a public or short token.' },
    { code: 'META_GRAPH_VERSION_READY', label: 'Meta Graph API version', key: 'META_GRAPH_API_VERSION', validate: isLikelyGraphVersion, shapeHint: 'Pin the Business SDK-aligned version, currently v24.0.' },
    { code: 'GA4_MEASUREMENT_READY', label: 'GA4 Measurement ID', keys: ['NEXT_PUBLIC_GA4_MEASUREMENT_ID', 'GA4_MEASUREMENT_ID'], validate: isLikelyGa4MeasurementId, shapeHint: 'Use a GA4 web stream ID like G-XXXXXXXXXX.' },
    { code: 'GA4_API_SECRET_READY', label: 'GA4 Measurement Protocol API secret', keys: ['GA4_API_SECRET', 'GOOGLE_ANALYTICS_API_SECRET'], validate: (value) => isLikelySecret(value, 16), shapeHint: 'Use the server-only Measurement Protocol API secret from GA4.' },
    { code: 'TRACKING_CRON_SECRET_READY', label: 'Tracking cron secret', keys: ['TRACKING_HEALTH_CRON_SECRET', 'CRON_SECRET'], validate: (value) => isLikelySecret(value, 32), shapeHint: 'Use a random 32+ character secret and send it in Authorization Bearer or x-cron-secret.' },
  ];

  for (const spec of requiredSpecs) checkRequiredValue(checks, env, spec, productionMode);

  const placeholderCandidates = collectKnownEnvValues(env, [
    /SECRET$/i,
    /TOKEN$/i,
    /API_SECRET$/i,
    /ACCESS_TOKEN$/i,
    /PIXEL_ID$/i,
    /MEASUREMENT_ID$/i,
    /^DATABASE_URL$/i,
    /^REDIS_URL$/i,
  ]);
  const placeholders = placeholderCandidates.filter(({ value }) => isPlaceholderValue(value));
  if (placeholders.length > 0) {
    checks.push(blocker({
      code: 'PLACEHOLDER_CREDENTIALS_FOUND',
      category: 'environment',
      label: 'Placeholder credential sweep',
      keys: placeholders.map((item) => item.key),
      message: `${placeholders.length} environment value(s) look like placeholders/demo/local credentials.`,
      hint: 'Replace every placeholder before production deploy.',
    }));
  } else {
    checks.push(pass({
      code: 'NO_PLACEHOLDER_CREDENTIALS',
      category: 'environment',
      label: 'Placeholder credential sweep',
      message: 'No placeholder credentials were detected among production tracking/core env variables.',
    }));
  }

  const metaTestEventCode = getValue(env, 'META_TEST_EVENT_CODE');
  if (productionMode && metaTestEventCode) {
    checks.push(blocker({
      code: 'META_TEST_EVENT_ENABLED_IN_PRODUCTION',
      category: 'environment',
      label: 'Meta test event code',
      key: 'META_TEST_EVENT_CODE',
      value: metaTestEventCode,
      message: 'META_TEST_EVENT_CODE is set in production mode.',
      hint: 'Remove META_TEST_EVENT_CODE before live deploy; use it only in staging/test events.',
    }));
  } else {
    checks.push(pass({
      code: 'META_TEST_EVENT_DISABLED_IN_PRODUCTION',
      category: 'environment',
      label: 'Meta test event code',
      message: 'No production Meta test event code leakage detected.',
    }));
  }


  const cleanupSecret = firstPresentValue(env, ['TRACKING_CLEANUP_CRON_SECRET', 'TRACKING_HEALTH_CRON_SECRET', 'CRON_SECRET']);
  if (!cleanupSecret.value) {
    checks.push(warn({
      code: 'TRACKING_CLEANUP_CRON_SECRET_MISSING',
      category: 'environment',
      label: 'Tracking cleanup cron secret',
      keys: ['TRACKING_CLEANUP_CRON_SECRET', 'TRACKING_HEALTH_CRON_SECRET', 'CRON_SECRET'],
      message: 'No tracking cleanup cron secret is configured.',
      hint: 'Set TRACKING_CLEANUP_CRON_SECRET or reuse TRACKING_HEALTH_CRON_SECRET for /api/cron/tracking-cleanup.',
    }));
  } else if (!isLikelySecret(cleanupSecret.value, 32) || isPlaceholderValue(cleanupSecret.value)) {
    checks.push(blocker({
      code: 'TRACKING_CLEANUP_CRON_SECRET_WEAK',
      category: 'environment',
      label: 'Tracking cleanup cron secret',
      key: cleanupSecret.key,
      value: cleanupSecret.value,
      message: 'Tracking cleanup cron secret is weak or placeholder-like.',
      hint: 'Use a random 32+ character secret.',
    }));
  } else {
    checks.push(pass({
      code: 'TRACKING_CLEANUP_CRON_SECRET_READY',
      category: 'environment',
      label: 'Tracking cleanup cron secret',
      key: cleanupSecret.key,
      value: cleanupSecret.value,
      message: 'Tracking cleanup cron secret is configured.',
    }));
  }

  const alertWebhook = firstPresentValue(env, ['TRACKING_HEALTH_ALERT_WEBHOOK_URL', 'TRACKING_ALERT_WEBHOOK_URL', 'SLACK_WEBHOOK_URL']);
  if (!alertWebhook.value) {
    checks.push(warn({
      code: 'TRACKING_ALERT_WEBHOOK_MISSING',
      category: 'environment',
      label: 'Tracking alert webhook',
      keys: ['TRACKING_HEALTH_ALERT_WEBHOOK_URL', 'TRACKING_ALERT_WEBHOOK_URL', 'SLACK_WEBHOOK_URL'],
      message: 'No tracking alert webhook is configured.',
      hint: 'Recommended: configure a Slack/Discord/generic webhook for WARN/CRITICAL tracking health alerts.',
    }));
  } else if (isPlaceholderValue(alertWebhook.value)) {
    checks.push(blocker({
      code: 'TRACKING_ALERT_WEBHOOK_PLACEHOLDER',
      category: 'environment',
      label: 'Tracking alert webhook',
      key: alertWebhook.key,
      value: alertWebhook.value,
      message: 'Tracking alert webhook looks like a placeholder.',
      hint: 'Replace or remove the placeholder webhook value.',
    }));
  } else {
    checks.push(pass({
      code: 'TRACKING_ALERT_WEBHOOK_READY',
      category: 'environment',
      label: 'Tracking alert webhook',
      key: alertWebhook.key,
      value: alertWebhook.value,
      message: 'Tracking alert webhook is configured.',
    }));
  }


  const testEmails = firstPresentValue(env, ['TRACKING_TEST_EMAILS']);
  const testPhones = firstPresentValue(env, ['TRACKING_TEST_PHONES']);
  const internalIps = firstPresentValue(env, ['TRACKING_INTERNAL_IPS', 'ANALYTICS_INTERNAL_IPS', 'INTERNAL_TRAFFIC_IPS', 'STAFF_IPS']);
  const internalDomains = firstPresentValue(env, ['TRACKING_INTERNAL_DOMAINS', 'INTERNAL_TRAFFIC_DOMAINS', 'STAFF_DOMAINS']);
  if (!testEmails.value && !testPhones.value) {
    checks.push(warn({
      code: 'TRACKING_TEST_CONTACTS_MISSING',
      category: 'environment',
      label: 'Tracking test contact exclusion',
      keys: ['TRACKING_TEST_EMAILS', 'TRACKING_TEST_PHONES'],
      message: 'No test/staff email or phone exclusion list is configured.',
      hint: 'Set TRACKING_TEST_EMAILS and/or TRACKING_TEST_PHONES so staff/test orders are saved as isTest=true and skipped by Meta/GA4 Purchase.',
    }));
  } else {
    checks.push(pass({
      code: 'TRACKING_TEST_CONTACTS_READY',
      category: 'environment',
      label: 'Tracking test contact exclusion',
      keys: ['TRACKING_TEST_EMAILS', 'TRACKING_TEST_PHONES'],
      message: 'Test/staff email or phone exclusion list is configured.',
    }));
  }

  if (!internalIps.value && !internalDomains.value) {
    checks.push(warn({
      code: 'TRACKING_INTERNAL_TRAFFIC_LISTS_MISSING',
      category: 'environment',
      label: 'Tracking internal traffic exclusion',
      keys: ['TRACKING_INTERNAL_IPS', 'TRACKING_INTERNAL_DOMAINS'],
      message: 'No dedicated tracking internal IP/domain exclusion list is configured.',
      hint: 'Recommended: set TRACKING_INTERNAL_IPS and/or TRACKING_INTERNAL_DOMAINS for staff/developer traffic exclusion.',
    }));
  } else {
    checks.push(pass({
      code: 'TRACKING_INTERNAL_TRAFFIC_LISTS_READY',
      category: 'environment',
      label: 'Tracking internal traffic exclusion',
      keys: ['TRACKING_INTERNAL_IPS', 'TRACKING_INTERNAL_DOMAINS'],
      message: 'Internal IP or domain exclusion list is configured.',
    }));
  }

  const gtmEnabled = getValue(env, 'NEXT_PUBLIC_GTM_ENABLED').toLowerCase() === 'true';
  const gtmAudited = getValue(env, 'GTM_ECOMMERCE_TAGS_AUDITED').toLowerCase() === 'true';
  if (gtmEnabled && !gtmAudited) {
    checks.push(warn({
      code: 'GTM_ENABLED_NOT_AUDITED',
      category: 'environment',
      label: 'GTM duplicate guard',
      key: 'GTM_ECOMMERCE_TAGS_AUDITED',
      message: 'GTM is enabled but ecommerce duplicate-tag audit is not marked complete.',
      hint: 'Set GTM_ECOMMERCE_TAGS_AUDITED=true only after confirming GTM does not duplicate Meta/GA4 ecommerce tags.',
    }));
  } else {
    checks.push(pass({
      code: 'GTM_DUPLICATE_GUARD_READY',
      category: 'environment',
      label: 'GTM duplicate guard',
      message: gtmEnabled ? 'GTM is enabled and marked audited.' : 'GTM is disabled or not configured, reducing duplicate ecommerce tag risk.',
    }));
  }

  const publicSecretKeys = Object.keys(env)
    .filter((key) => PUBLIC_SECRET_PATTERN.test(key) && !SAFE_PUBLIC_KEYS.has(key))
    .filter((key) => hasValue(env, key));
  if (publicSecretKeys.length > 0) {
    checks.push(blocker({
      code: 'PUBLIC_SECRET_ENV_FOUND',
      category: 'environment',
      label: 'Public secret guard',
      keys: publicSecretKeys,
      message: 'A NEXT_PUBLIC_* variable appears to contain a token/secret/password.',
      hint: 'Move server secrets to non-public env variables before deploy.',
    }));
  } else {
    checks.push(pass({
      code: 'NO_PUBLIC_SECRET_ENV',
      category: 'environment',
      label: 'Public secret guard',
      message: 'No suspicious NEXT_PUBLIC_* secret/token env variables were detected.',
    }));
  }

  const jwtSecret = getValue(env, 'JWT_SECRET');
  const jwtRefreshSecret = getValue(env, 'JWT_REFRESH_SECRET');
  const nextAuthSecret = getValue(env, 'NEXTAUTH_SECRET');
  if (jwtSecret && jwtRefreshSecret && jwtSecret === jwtRefreshSecret) {
    checks.push(blocker({ code: 'JWT_SECRETS_REUSED', category: 'environment', label: 'JWT secret separation', message: 'JWT_SECRET and JWT_REFRESH_SECRET are identical.', hint: 'Use separate random secrets.' }));
  } else if (jwtSecret && nextAuthSecret && jwtSecret === nextAuthSecret) {
    checks.push(warn({ code: 'JWT_NEXTAUTH_SECRET_REUSED', category: 'environment', label: 'JWT secret separation', message: 'JWT_SECRET and NEXTAUTH_SECRET are identical.', hint: 'Recommended: use separate random secrets.' }));
  } else {
    checks.push(pass({ code: 'AUTH_SECRETS_SEPARATED', category: 'environment', label: 'Auth secret separation', message: 'Auth/JWT secrets are not trivially reused.' }));
  }

  const blockerCount = checks.filter((check) => check.status === 'BLOCKER').length;
  const warningCount = checks.filter((check) => check.status === 'WARN').length;
  const passCount = checks.filter((check) => check.status === 'PASS').length;

  return {
    ok: blockerCount === 0,
    status: blockerCount > 0 ? 'BLOCKED' : warningCount > 0 ? 'WARN' : 'PASS',
    productionMode,
    loadedFiles: env.__loadedFiles ?? [],
    passCount,
    warningCount,
    blockerCount,
    checks,
  };
}

function parseCliArgs(argv) {
  return {
    productionMode: argv.includes('--production') || argv.includes('--prod'),
    json: argv.includes('--json'),
    failOnWarn: argv.includes('--fail-on-warn'),
  };
}

function printHuman(result) {
  console.log(`Tracking environment audit: ${result.status}`);
  console.log(`Pass: ${result.passCount}, Warn: ${result.warningCount}, Blocker: ${result.blockerCount}`);
  for (const check of result.checks) {
    const prefix = check.status === 'PASS' ? '✓' : check.status === 'WARN' ? '!' : '✗';
    console.log(`${prefix} [${check.status}] ${check.code}: ${check.message}`);
    if (check.hint && check.status !== 'PASS') console.log(`  Hint: ${check.hint}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const args = parseCliArgs(process.argv.slice(2));
  const result = runTrackingEnvAudit({ productionMode: args.productionMode });
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHuman(result);
  }
  if (!result.ok || (args.failOnWarn && result.warningCount > 0)) {
    process.exitCode = 1;
  }
}
