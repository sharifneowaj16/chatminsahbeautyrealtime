import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { ReleaseGateResult } from './governance';

export const META_COMMAND_EVIDENCE_SCHEMA_VERSION = 1 as const;
export const DEFAULT_COMMAND_EVIDENCE_MAX_AGE_HOURS = 24;

export type CommandEvidenceStatus = 'PASS' | 'FAIL';

export interface CommandEvidenceRecord {
  id: string;
  status: CommandEvidenceStatus;
  command: string;
  args: string[];
  exitCode: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  summary: string;
  outputSha256: string;
  sourceSha256: string;
  logPath: string;
  logSha256: string;
  evidenceDigest: string;
}

export interface CommandEvidenceLedger {
  schemaVersion: number;
  generatedAt: string;
  maxAgeHours: number;
  records: CommandEvidenceRecord[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const SHA256 = /^[a-f0-9]{64}$/i;
const SAFE_ID = /^[a-z0-9][a-z0-9._-]{1,79}$/i;
const SAFE_LOG_PREFIX = 'docs/release/meta-v6/';

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => `${JSON.stringify(key)}:${canonicalize(nested)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256Text(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function commandEvidenceDigest(record: Omit<CommandEvidenceRecord, 'evidenceDigest'>): string {
  return sha256Text(canonicalize(record));
}

function redactUrlCredentials(value: string): string {
  return value.replace(/\b((?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis(?:s)?):\/\/)([^\s/@:]+):([^\s/@]+)@/gi, '$1[redacted]:[redacted]@');
}

export function redactCommandOutput(input: string): string {
  let output = String(input ?? '');
  output = redactUrlCredentials(output);
  output = output.replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, 'Bearer [redacted]');
  output = output.replace(
    /\b([A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PRIVATE_KEY|ACCESS_KEY|API_KEY)[A-Z0-9_]*)\s*=\s*([^\s"']+)/g,
    '$1=[redacted]',
  );
  output = output.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]');
  output = output.replace(/(?<!\d)(?:\+?880|0)?1[3-9]\d{8}(?!\d)/g, '[redacted-phone]');
  return output;
}

export function createCommandEvidenceRecord(input: {
  id: string;
  command: string;
  args: string[];
  exitCode: number;
  startedAt: string;
  finishedAt: string;
  output: string;
  logPath: string;
  logSha256: string;
  sourceSha256: string;
}): CommandEvidenceRecord {
  const started = Date.parse(input.startedAt);
  const finished = Date.parse(input.finishedAt);
  if (!SAFE_ID.test(input.id)) throw new Error('COMMAND_EVIDENCE_ID_INVALID');
  if (!Number.isInteger(input.exitCode)) throw new Error('COMMAND_EVIDENCE_EXIT_CODE_INVALID');
  if (!Number.isFinite(started) || !Number.isFinite(finished) || finished < started) {
    throw new Error('COMMAND_EVIDENCE_TIME_INVALID');
  }
  const sanitized = redactCommandOutput(input.output).replace(/\r\n/g, '\n');
  const summary = sanitized.trim().split('\n').slice(-12).join(' | ').slice(0, 4000);
  const recordWithoutDigest: Omit<CommandEvidenceRecord, 'evidenceDigest'> = {
    id: input.id,
    status: input.exitCode === 0 ? 'PASS' : 'FAIL',
    command: input.command,
    args: [...input.args],
    exitCode: input.exitCode,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    durationMs: finished - started,
    summary,
    outputSha256: sha256Text(sanitized),
    sourceSha256: input.sourceSha256,
    logPath: input.logPath,
    logSha256: input.logSha256,
  };
  return { ...recordWithoutDigest, evidenceDigest: commandEvidenceDigest(recordWithoutDigest) };
}

export function validateCommandEvidenceLedger(
  ledger: CommandEvidenceLedger,
  options: { now?: Date; allowedIds?: string[]; maxAgeHours?: number } = {},
): string[] {
  const issues: string[] = [];
  const now = options.now ?? new Date();
  const maxAgeHours = options.maxAgeHours ?? ledger.maxAgeHours ?? DEFAULT_COMMAND_EVIDENCE_MAX_AGE_HOURS;
  const allowed = options.allowedIds ? new Set(options.allowedIds) : null;

  if (ledger.schemaVersion !== META_COMMAND_EVIDENCE_SCHEMA_VERSION) issues.push('COMMAND_LEDGER_SCHEMA_VERSION_INVALID');
  if (!ISO_DATE.test(ledger.generatedAt) || Number.isNaN(Date.parse(ledger.generatedAt))) issues.push('COMMAND_LEDGER_GENERATED_AT_INVALID');
  if (!Number.isFinite(ledger.maxAgeHours) || ledger.maxAgeHours <= 0 || ledger.maxAgeHours > 168) issues.push('COMMAND_LEDGER_MAX_AGE_INVALID');

  const ids = new Set<string>();
  for (const record of ledger.records) {
    if (!SAFE_ID.test(record.id)) issues.push(`COMMAND_EVIDENCE_ID_INVALID:${record.id}`);
    if (ids.has(record.id)) issues.push(`COMMAND_EVIDENCE_DUPLICATE_ID:${record.id}`);
    ids.add(record.id);
    if (allowed && !allowed.has(record.id)) issues.push(`COMMAND_EVIDENCE_ID_NOT_ALLOWED:${record.id}`);
    if (!['PASS', 'FAIL'].includes(record.status)) issues.push(`COMMAND_EVIDENCE_STATUS_INVALID:${record.id}`);
    if (record.status !== (record.exitCode === 0 ? 'PASS' : 'FAIL')) issues.push(`COMMAND_EVIDENCE_STATUS_EXIT_MISMATCH:${record.id}`);
    if (!ISO_DATE.test(record.startedAt) || !ISO_DATE.test(record.finishedAt)) issues.push(`COMMAND_EVIDENCE_TIME_FORMAT_INVALID:${record.id}`);
    const started = Date.parse(record.startedAt);
    const finished = Date.parse(record.finishedAt);
    if (!Number.isFinite(started) || !Number.isFinite(finished) || finished < started || record.durationMs !== finished - started) {
      issues.push(`COMMAND_EVIDENCE_TIME_INVALID:${record.id}`);
    }
    if (Number.isFinite(finished) && now.getTime() - finished > maxAgeHours * 60 * 60 * 1000) issues.push(`COMMAND_EVIDENCE_EXPIRED:${record.id}`);
    if (!SHA256.test(record.outputSha256) || !SHA256.test(record.sourceSha256) || !SHA256.test(record.logSha256) || !SHA256.test(record.evidenceDigest)) {
      issues.push(`COMMAND_EVIDENCE_SHA256_INVALID:${record.id}`);
    }
    if (!record.logPath.startsWith(SAFE_LOG_PREFIX) || record.logPath.includes('..') || path.isAbsolute(record.logPath)) {
      issues.push(`COMMAND_EVIDENCE_LOG_PATH_INVALID:${record.id}`);
    }
    const { evidenceDigest: _ignored, ...recordWithoutDigest } = record;
    if (record.evidenceDigest !== commandEvidenceDigest(recordWithoutDigest)) issues.push(`COMMAND_EVIDENCE_DIGEST_MISMATCH:${record.id}`);
    if (/Bearer\s+(?!\[redacted\])/i.test(record.summary) || /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(record.summary)) {
      issues.push(`COMMAND_EVIDENCE_SUMMARY_NOT_REDACTED:${record.id}`);
    }
  }
  return issues;
}


const SOURCE_DIRS = ['app', 'components', 'config', 'contexts', 'docs', 'lib', 'prisma', 'scripts', 'tests', 'workers'];
const SOURCE_ROOT_FILES = ['package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.meta-catalog.json', 'next.config.ts', 'prisma.config.ts'];

function collectSourceFiles(root: string): string[] {
  const files: string[] = [];
  const visit = (absolute: string) => {
    for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
      const child = path.join(absolute, entry.name);
      const relative = path.relative(root, child).replaceAll(path.sep, '/');
      if (entry.isDirectory()) {
        if (['node_modules', '.next', '.git'].includes(entry.name)) continue;
        visit(child);
      } else if (entry.isFile()) {
        if (relative === 'config/meta-v6-command-evidence.json') continue;
        if (relative.startsWith('docs/release/meta-v6/phase-16-command-')) continue;
        if (relative.startsWith('docs/release/meta-v6/phase-16-') && /\.(log|json)$/.test(relative)) continue;
        if (relative.startsWith('docs/release/meta-v6/phase-15-') && /release-report\.json$/.test(relative)) continue;
        files.push(relative);
      }
    }
  };
  for (const directory of SOURCE_DIRS) {
    const absolute = path.join(root, directory);
    if (fs.existsSync(absolute)) visit(absolute);
  }
  for (const relative of SOURCE_ROOT_FILES) {
    if (fs.existsSync(path.join(root, relative))) files.push(relative);
  }
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && /^(?:PHASE|PRODUCTION_QA|tracking).*\.md$/i.test(entry.name)) files.push(entry.name);
  }
  return [...new Set(files)].sort();
}

export function computeReleaseSourceDigest(root: string): string {
  const hash = createHash('sha256');
  for (const relative of collectSourceFiles(root)) {
    const content = fs.readFileSync(path.join(root, relative));
    hash.update(relative).update('\0').update(sha256Text(content.toString('binary'))).update('\n');
  }
  return hash.digest('hex');
}

export function validateCommandEvidenceSource(root: string, ledger: CommandEvidenceLedger): string[] {
  const current = computeReleaseSourceDigest(root);
  return ledger.records
    .filter((record) => record.sourceSha256 !== current)
    .map((record) => `COMMAND_EVIDENCE_SOURCE_MISMATCH:${record.id}`);
}

export function validateCommandEvidenceLogs(root: string, ledger: CommandEvidenceLedger): string[] {
  const issues: string[] = [];
  const resolvedRoot = path.resolve(root);
  for (const record of ledger.records) {
    const absolute = path.resolve(root, record.logPath);
    if (!absolute.startsWith(`${resolvedRoot}${path.sep}`) || !fs.existsSync(absolute)) {
      issues.push(`COMMAND_EVIDENCE_LOG_MISSING:${record.id}`);
      continue;
    }
    const content = fs.readFileSync(absolute, 'utf8');
    if (sha256Text(content) !== record.logSha256) issues.push(`COMMAND_EVIDENCE_LOG_HASH_MISMATCH:${record.id}`);
    if (sha256Text(content) !== record.outputSha256) issues.push(`COMMAND_EVIDENCE_OUTPUT_HASH_MISMATCH:${record.id}`);
  }
  return issues;
}

export function commandEvidenceToGate(record: CommandEvidenceRecord | undefined, id: string): ReleaseGateResult {
  if (!record) return { id, status: 'PENDING', detail: 'No fresh command evidence artifact is attached.' };
  return {
    id,
    status: record.status,
    detail: `${record.command} ${record.args.join(' ')} exited ${record.exitCode}; ${record.summary || 'no output'}`.slice(0, 4000),
    evidence: record.logPath,
  };
}
