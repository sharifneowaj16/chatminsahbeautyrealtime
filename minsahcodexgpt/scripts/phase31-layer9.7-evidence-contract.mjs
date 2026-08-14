import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const LIVE_META_EVIDENCE_CATEGORIES = Object.freeze([
  'META_WEBHOOK_SUBSCRIPTION',
  'LEADGEN_WEBHOOK_DELIVERY',
  'META_TEST_LEAD_PROCESSED',
  'INSTAGRAM_WEBHOOK_DELIVERY',
  'INSTAGRAM_INBOUND_MESSAGE',
  'INSTAGRAM_VALID_REPLY',
  'INSTAGRAM_EXPIRED_REPLY_BLOCKED',
  'INSTAGRAM_PRIVATE_REPLY',
  'PROVIDER_OUTBOUND_MESSAGE_ID',
  'QUEUE_RETRY',
  'DEAD_LETTER',
  'ROLLBACK_KILL_SWITCH',
  'PERMISSION_ACCOUNT_HEALTH',
]);

const ALLOWED_ROOTS = Object.freeze([
  'evidence/phase31-meta-social-crm/screenshots/',
  'evidence/phase31-meta-social-crm/logs/',
  'evidence/phase31-meta-social-crm/provider-responses/',
]);
const HASH = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,199}$/;
const SECRET_KEY = /(?:access[_-]?token|refresh[_-]?token|app[_-]?secret|client[_-]?secret|webhook[_-]?secret|verify[_-]?token|appsecret[_-]?proof|authorization|cookie|password)/i;
const SECRET_TEXT = /(?:bearer\s+[A-Za-z0-9._~+\/-]{16,}|(?:access|refresh)[_-]?token\s*[:=]\s*[^\s,;"']+|appsecret_proof\s*[:=]\s*[^\s,;"']+|EA[A-Za-z0-9]{18,})/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE = /(?:\+?\d[\d ()-]{8,}\d)/;
const FAKE_MARKER = /\b(?:mock|fixture|synthetic|fabricated|sample-only|not-live)\b/i;

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const normalize = (value) => String(value || '').split(path.sep).join('/').replace(/^\.\//, '');
const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const issue = (code, message, recordId = null) => ({ code, message, recordId });

function inspectJsonSecrets(value, at = '$', issues = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectJsonSecrets(item, `${at}[${index}]`, issues));
    return issues;
  }
  if (!isObject(value)) return issues;
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) issues.push(issue('SENSITIVE_KEY', `Sensitive key is forbidden at ${at}.${key}`));
    inspectJsonSecrets(child, `${at}.${key}`, issues);
  }
  return issues;
}

function inspectText(text, recordId) {
  const issues = [];
  if (SECRET_TEXT.test(text)) issues.push(issue('SECRET_TEXT', 'Artifact contains a token-like secret value', recordId));
  if (EMAIL.test(text)) issues.push(issue('RAW_EMAIL', 'Artifact contains an unredacted email address', recordId));
  if (PHONE.test(text)) issues.push(issue('RAW_PHONE', 'Artifact contains an unredacted phone number', recordId));
  try {
    inspectJsonSecrets(JSON.parse(text)).forEach((item) => issues.push({ ...item, recordId }));
  } catch {
    // Non-JSON text evidence is allowed.
  }
  return issues;
}

function requireId(record, field, issues) {
  if (!ID.test(String(record[field] || ''))) {
    issues.push(issue('REQUIRED_IDENTIFIER', `${field} is required and must be a safe redacted identifier`, record.id));
  }
}

function validateCategory(record, issues) {
  switch (record.category) {
    case 'META_WEBHOOK_SUBSCRIPTION':
      requireId(record, 'providerObjectId', issues);
      break;
    case 'LEADGEN_WEBHOOK_DELIVERY':
      requireId(record, 'providerObjectId', issues);
      requireId(record, 'receiptId', issues);
      requireId(record, 'correlationId', issues);
      break;
    case 'META_TEST_LEAD_PROCESSED':
      requireId(record, 'providerObjectId', issues);
      requireId(record, 'receiptId', issues);
      requireId(record, 'businessRecordId', issues);
      if (record.outcome !== 'PROCESSED') issues.push(issue('OUTCOME', 'Test Lead evidence must have outcome PROCESSED', record.id));
      break;
    case 'INSTAGRAM_WEBHOOK_DELIVERY':
      requireId(record, 'providerObjectId', issues);
      requireId(record, 'receiptId', issues);
      requireId(record, 'correlationId', issues);
      break;
    case 'INSTAGRAM_INBOUND_MESSAGE':
      requireId(record, 'providerObjectId', issues);
      requireId(record, 'receiptId', issues);
      requireId(record, 'businessRecordId', issues);
      break;
    case 'INSTAGRAM_VALID_REPLY':
    case 'INSTAGRAM_PRIVATE_REPLY':
      requireId(record, 'providerMessageId', issues);
      if (record.outcome !== 'SENT') issues.push(issue('OUTCOME', `${record.category} must have outcome SENT`, record.id));
      break;
    case 'PROVIDER_OUTBOUND_MESSAGE_ID':
      requireId(record, 'providerMessageId', issues);
      break;
    case 'INSTAGRAM_EXPIRED_REPLY_BLOCKED':
      requireId(record, 'blockedReasonCode', issues);
      if (record.outcome !== 'BLOCKED' || record.providerCallObserved !== false) {
        issues.push(issue('POLICY_BLOCK', 'Expired reply evidence must be BLOCKED with providerCallObserved=false', record.id));
      }
      break;
    case 'QUEUE_RETRY':
      if (!Number.isInteger(record.attempts) || record.attempts < 2 || record.outcome !== 'RECOVERED') {
        issues.push(issue('RETRY_PROOF', 'Queue retry evidence requires attempts >= 2 and outcome RECOVERED', record.id));
      }
      requireId(record, 'correlationId', issues);
      break;
    case 'DEAD_LETTER':
      if (!Number.isInteger(record.attempts) || record.attempts < 1 || record.outcome !== 'DEAD_LETTERED') {
        issues.push(issue('DEAD_LETTER_PROOF', 'Dead-letter evidence requires attempts >= 1 and outcome DEAD_LETTERED', record.id));
      }
      requireId(record, 'correlationId', issues);
      break;
    case 'ROLLBACK_KILL_SWITCH':
      requireId(record, 'blockedReasonCode', issues);
      if (record.outcome !== 'BLOCKED' || record.providerCallObserved !== false || record.switchState !== 'ACTIVE') {
        issues.push(issue('KILL_SWITCH_PROOF', 'Kill-switch evidence must be BLOCKED, switchState=ACTIVE and providerCallObserved=false', record.id));
      }
      break;
    case 'PERMISSION_ACCOUNT_HEALTH':
      requireId(record, 'providerObjectId', issues);
      if (!['HEALTHY', 'DEGRADED', 'REVOKED'].includes(record.outcome)) {
        issues.push(issue('HEALTH_OUTCOME', 'Permission health outcome must be HEALTHY, DEGRADED or REVOKED', record.id));
      }
      break;
    default:
      issues.push(issue('UNKNOWN_CATEGORY', `Unknown evidence category: ${record.category}`, record.id));
  }
}

export function validateLiveMetaEvidenceManifest(manifest, options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const allowContractFixture = options.allowContractFixture === true;
  const now = new Date(options.now || Date.now());
  const issues = [];
  const verifiedRecords = [];

  if (!isObject(manifest)) return { ok: false, issues: [issue('MANIFEST', 'Evidence manifest must be an object')], missingCategories: [...LIVE_META_EVIDENCE_CATEGORIES], verifiedRecords };
  if (manifest.schemaVersion !== 1) issues.push(issue('SCHEMA_VERSION', 'schemaVersion must equal 1'));
  if (manifest.phase !== 31 || manifest.item !== '9.7') issues.push(issue('SCOPE', 'Manifest must target Phase 31 item 9.7'));
  if (manifest.evidenceMode !== 'LIVE_PROVIDER') issues.push(issue('EVIDENCE_MODE', 'evidenceMode must be LIVE_PROVIDER'));
  if (!['LIVE_TEST', 'PRODUCTION'].includes(manifest.environment)) issues.push(issue('ENVIRONMENT', 'environment must be LIVE_TEST or PRODUCTION'));
  if (!ID.test(String(manifest.operatorReference || ''))) issues.push(issue('OPERATOR_REFERENCE', 'A redacted operator/ticket reference is required'));
  if (!allowContractFixture && (manifest.contractFixture === true || FAKE_MARKER.test(JSON.stringify(manifest)))) {
    issues.push(issue('NON_LIVE_EVIDENCE', 'Mock, fixture, synthetic or fabricated evidence cannot satisfy the live gate'));
  }
  if (!Array.isArray(manifest.records)) issues.push(issue('RECORDS', 'records must be an array'));

  const records = Array.isArray(manifest.records) ? manifest.records : [];
  const covered = new Set();
  const recordIds = new Set();
  for (const record of records) {
    if (!isObject(record)) {
      issues.push(issue('RECORD', 'Every evidence record must be an object'));
      continue;
    }
    if (!ID.test(String(record.id || ''))) issues.push(issue('RECORD_ID', 'Evidence record id is missing or invalid', record.id));
    else if (recordIds.has(record.id)) issues.push(issue('DUPLICATE_RECORD_ID', 'Evidence record id must be unique', record.id));
    else recordIds.add(record.id);
    if (!LIVE_META_EVIDENCE_CATEGORIES.includes(record.category)) {
      issues.push(issue('UNKNOWN_CATEGORY', `Unknown evidence category: ${record.category}`, record.id));
      continue;
    }
    covered.add(record.category);
    if (record.live !== true) issues.push(issue('LIVE_ATTESTATION', 'Every record must explicitly set live=true', record.id));
    if (record.redacted !== true) issues.push(issue('REDACTION_ATTESTATION', 'Every record must explicitly set redacted=true', record.id));
    if (!['PROVIDER_RESPONSE', 'SIGNED_WEBHOOK', 'ADMIN_SCREENSHOT', 'QUEUE_LOG', 'POLICY_LOG'].includes(record.captureMethod)) {
      issues.push(issue('CAPTURE_METHOD', 'Unsupported or missing captureMethod', record.id));
    }
    const capturedAt = new Date(record.capturedAt);
    if (!record.capturedAt || Number.isNaN(capturedAt.getTime())) issues.push(issue('CAPTURE_TIME', 'capturedAt must be a valid ISO timestamp', record.id));
    else if (capturedAt.getTime() > now.getTime() + 5 * 60_000) issues.push(issue('FUTURE_CAPTURE', 'capturedAt cannot be in the future', record.id));

    const artifactPath = normalize(record.artifactPath);
    if (!ALLOWED_ROOTS.some((prefix) => artifactPath.startsWith(prefix)) || artifactPath.includes('../')) {
      issues.push(issue('ARTIFACT_PATH', 'artifactPath must remain under an approved evidence directory', record.id));
    } else {
      const absolute = path.resolve(root, artifactPath);
      if (!absolute.startsWith(`${root}${path.sep}`)) issues.push(issue('ARTIFACT_PATH', 'artifactPath escapes the repository root', record.id));
      else if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) issues.push(issue('ARTIFACT_MISSING', `Artifact file does not exist: ${artifactPath}`, record.id));
      else {
        const data = fs.readFileSync(absolute);
        const actualHash = sha256(data);
        if (!HASH.test(String(record.artifactSha256 || '')) || record.artifactSha256 !== actualHash) {
          issues.push(issue('ARTIFACT_HASH', 'Artifact SHA-256 is missing or does not match', record.id));
        }
        if (/\.(?:json|log|txt|md)$/i.test(artifactPath)) issues.push(...inspectText(data.toString('utf8'), record.id));
        if (/\.(?:png|jpe?g|webp)$/i.test(artifactPath) && !ID.test(String(record.redactionReviewReference || ''))) {
          issues.push(issue('SCREENSHOT_REVIEW', 'Screenshot evidence requires a redactionReviewReference', record.id));
        }
      }
    }
    validateCategory(record, issues);
    verifiedRecords.push({ id: record.id, category: record.category, artifactPath });
  }

  const missingCategories = LIVE_META_EVIDENCE_CATEGORIES.filter((category) => !covered.has(category));
  if (missingCategories.length > 0) issues.push(issue('MISSING_CATEGORIES', `Missing live evidence categories: ${missingCategories.join(', ')}`));
  return { ok: issues.length === 0, issues, missingCategories, verifiedRecords };
}

export function safeEvidenceSummary(manifest, result) {
  return {
    phase: 31,
    item: '9.7',
    environment: manifest?.environment || 'UNKNOWN',
    coveredCategories: LIVE_META_EVIDENCE_CATEGORIES.length - result.missingCategories.length,
    requiredCategories: LIVE_META_EVIDENCE_CATEGORIES.length,
    verifiedArtifacts: result.verifiedRecords.length,
    verdict: result.ok ? 'PASS' : 'BLOCKED',
    issueCodes: [...new Set(result.issues.map((entry) => entry.code))].sort(),
  };
}
