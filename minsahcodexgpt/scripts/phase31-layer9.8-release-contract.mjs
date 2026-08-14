import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const FINAL_RELEASE_CHECKS = Object.freeze([
  'STATIC_SOURCE_QA',
  'MAIN_APP_NPM_CI',
  'PRISMA_GENERATE',
  'MAIN_APP_TYPECHECK',
  'MAIN_APP_LINT',
  'MAIN_APP_BUILD',
  'REALTIME_NPM_CI',
  'REALTIME_TYPECHECK',
  'REALTIME_BUILD',
  'POSTGRESQL_MIGRATION_IDEMPOTENCY',
  'REDIS_BULLMQ_RUNTIME',
  'LIVE_META_PROVIDER',
  'SECURITY_MEDIA_IDEMPOTENCY',
  'FRESH_PACKAGE_REPRODUCIBILITY',
]);

const APPROVED_PREFIX = 'evidence/phase31-meta-social-crm/logs/';
const SHA256 = /^[a-f0-9]{64}$/;
const SECRET_PATTERNS = [
  /(?:access|refresh|verify|app)[_-]?(?:token|secret)\s*[:=]\s*[^\s,}\]]+/gi,
  /postgres(?:ql)?:\/\/[^\s]+/gi,
  /redis(?:s)?:\/\/[^\s]+/gi,
  /\bEA[A-Za-z0-9_-]{20,}\b/g,
];

const digest = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

function safeRelativePath(root, value) {
  if (typeof value !== 'string' || !value.startsWith(APPROVED_PREFIX) || value.includes('..')) return null;
  const absolute = path.resolve(root, value);
  const approved = path.resolve(root, APPROVED_PREFIX);
  if (absolute !== approved && !absolute.startsWith(`${approved}${path.sep}`)) return null;
  return absolute;
}

function scanText(value) {
  return SECRET_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}

export function validateFinalReleaseManifest(manifest, { root = process.cwd() } = {}) {
  const issues = [];
  const records = Array.isArray(manifest?.checks) ? manifest.checks : [];
  if (manifest?.schemaVersion !== 1 || manifest?.phase !== 31 || manifest?.item !== '9.8') {
    issues.push({ code: 'MANIFEST_IDENTITY', message: 'Manifest must declare schemaVersion 1, phase 31 and item 9.8.' });
  }
  if (manifest?.evidenceMode !== 'EXECUTED_FINAL_GATE') {
    issues.push({ code: 'EVIDENCE_MODE', message: 'Final release evidence must come from the executed final gate.' });
  }

  const byCheck = new Map();
  for (const record of records) {
    if (!record || typeof record !== 'object') continue;
    if (byCheck.has(record.check)) issues.push({ code: 'DUPLICATE_CHECK', check: record.check, message: 'Each release check may appear only once.' });
    byCheck.set(record.check, record);
  }

  const missingChecks = FINAL_RELEASE_CHECKS.filter((check) => !byCheck.has(check));
  if (missingChecks.length) issues.push({ code: 'MISSING_CHECKS', message: `Missing mandatory checks: ${missingChecks.join(', ')}` });

  const verified = [];
  for (const check of FINAL_RELEASE_CHECKS) {
    const record = byCheck.get(check);
    if (!record) continue;
    if (!['PASS', 'BLOCKED'].includes(record.status)) {
      issues.push({ code: 'CHECK_STATUS', check, message: 'Check status must be PASS or BLOCKED; skipped/unknown is not release evidence.' });
    }
    if (typeof record.reasonCode !== 'string' || !record.reasonCode.trim()) {
      issues.push({ code: 'REASON_CODE', check, message: 'Every check requires a non-secret reasonCode.' });
    }
    const absolute = safeRelativePath(root, record.artifactPath);
    if (!absolute || !fs.existsSync(absolute)) {
      issues.push({ code: 'ARTIFACT_PATH', check, message: 'Check artifact must exist under the approved evidence log directory.' });
      continue;
    }
    const content = fs.readFileSync(absolute);
    if (!SHA256.test(String(record.artifactSha256 ?? '')) || digest(content) !== record.artifactSha256) {
      issues.push({ code: 'ARTIFACT_HASH', check, message: 'Check artifact SHA-256 does not match.' });
      continue;
    }
    const text = content.toString('utf8');
    if (scanText(text)) issues.push({ code: 'SECRET_TEXT', check, message: 'Runtime evidence contains a credential-like value or connection URL.' });
    verified.push({ check, status: record.status, artifactPath: record.artifactPath });
  }

  const blockedChecks = FINAL_RELEASE_CHECKS.filter((check) => byCheck.get(check)?.status !== 'PASS');
  const declaredVerdict = manifest?.releaseDecision;
  const computedVerdict = issues.length === 0 && blockedChecks.length === 0 ? 'PASS' : 'BLOCKED';
  if (declaredVerdict !== computedVerdict) {
    issues.push({ code: 'VERDICT_MISMATCH', message: `Declared releaseDecision ${declaredVerdict ?? 'missing'} does not match computed ${computedVerdict}.` });
  }
  if (manifest?.phase31Status !== (computedVerdict === 'PASS' ? 'COMPLETE' : 'BLOCKED')) {
    issues.push({ code: 'PHASE_STATUS_MISMATCH', message: 'phase31Status must match the computed release decision.' });
  }
  if (computedVerdict === 'PASS' && (!Array.isArray(manifest.remainingBlockers) || manifest.remainingBlockers.length !== 0)) {
    issues.push({ code: 'PASS_WITH_BLOCKERS', message: 'A PASS release cannot retain blockers.' });
  }
  if (computedVerdict === 'BLOCKED' && (!Array.isArray(manifest.remainingBlockers) || manifest.remainingBlockers.length === 0)) {
    issues.push({ code: 'BLOCKED_WITHOUT_REASON', message: 'A BLOCKED release must list at least one blocker.' });
  }

  return {
    ok: issues.length === 0,
    issues,
    verified,
    missingChecks,
    blockedChecks,
    computedVerdict,
  };
}

export function safeFinalReleaseSummary(manifest, result) {
  return {
    phase: 31,
    item: '9.8',
    phase31Status: result.computedVerdict === 'PASS' ? 'COMPLETE' : 'BLOCKED',
    releaseDecision: result.computedVerdict,
    requiredChecks: FINAL_RELEASE_CHECKS.length,
    verifiedArtifacts: result.verified.length,
    blockedChecks: result.blockedChecks,
    issueCodes: [...new Set(result.issues.map((issue) => issue.code))],
    remainingBlockers: Array.isArray(manifest?.remainingBlockers) ? manifest.remainingBlockers.map((item) => String(item).slice(0, 180)) : [],
  };
}
