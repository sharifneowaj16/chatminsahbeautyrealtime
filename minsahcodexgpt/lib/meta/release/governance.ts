import { createHash } from 'node:crypto';

export const META_RELEASE_SCHEMA_VERSION = 1 as const;

export type ReleaseMode = 'engineering' | 'production';
export type GateStatus = 'PASS' | 'FAIL' | 'PENDING' | 'NOT_REQUIRED';
export type EvidenceStatus = 'ATTACHED' | 'PENDING' | 'NOT_REQUIRED' | 'EXPIRED';

export interface PhaseState {
  status: string;
  evidenceFile?: string | null;
}

export interface PhaseDefinition {
  id: number;
  title: string;
  runtimeEvidenceRequired: boolean;
  state: PhaseState;
}

export interface PhaseManifest {
  schemaVersion: string;
  phases: PhaseDefinition[];
}

export interface RuntimeEvidenceItem {
  key: string;
  status: EvidenceStatus;
  environment?: string;
  artifact?: string;
  capturedAt?: string;
  sha256?: string;
  note?: string;
}

export interface RuntimeEvidencePhase {
  phaseId: number;
  evidence: RuntimeEvidenceItem[];
}

export interface RuntimeEvidenceLedger {
  schemaVersion: number;
  generatedAt: string;
  phases: RuntimeEvidencePhase[];
}

export interface ReleaseGateResult {
  id: string;
  status: GateStatus;
  detail?: string;
  evidence?: string;
}

export interface ReleaseEvaluationInput {
  mode: ReleaseMode;
  manifest: PhaseManifest;
  runtimeLedger: RuntimeEvidenceLedger;
  gates: ReleaseGateResult[];
  generatedAt?: string;
}

export interface ReleaseEvaluation {
  schemaVersion: number;
  mode: ReleaseMode;
  decision: 'PASS' | 'BLOCKED';
  generatedAt: string;
  blockers: string[];
  warnings: string[];
  gates: ReleaseGateResult[];
  phaseSummary: {
    total: number;
    complete: number;
    runtimeRequired: number;
    runtimeReady: number;
  };
  evidenceDigest: string;
}

const SHA256 = /^[a-f0-9]{64}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

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

export function sha256Canonical(value: unknown): string {
  return createHash('sha256').update(canonicalize(value)).digest('hex');
}

export function validateRuntimeEvidenceLedger(
  manifest: PhaseManifest,
  ledger: RuntimeEvidenceLedger,
): string[] {
  const issues: string[] = [];
  if (ledger.schemaVersion !== META_RELEASE_SCHEMA_VERSION) issues.push('RUNTIME_LEDGER_SCHEMA_VERSION_INVALID');
  if (!ISO_DATE.test(ledger.generatedAt) || Number.isNaN(Date.parse(ledger.generatedAt))) issues.push('RUNTIME_LEDGER_GENERATED_AT_INVALID');

  const phaseIds = new Set<number>();
  for (const phase of ledger.phases) {
    if (phaseIds.has(phase.phaseId)) issues.push(`RUNTIME_LEDGER_DUPLICATE_PHASE:${phase.phaseId}`);
    phaseIds.add(phase.phaseId);
    const keys = new Set<string>();
    for (const item of phase.evidence) {
      if (!item.key.trim()) issues.push(`RUNTIME_EVIDENCE_KEY_EMPTY:${phase.phaseId}`);
      if (keys.has(item.key)) issues.push(`RUNTIME_EVIDENCE_DUPLICATE_KEY:${phase.phaseId}:${item.key}`);
      keys.add(item.key);
      if (item.status === 'ATTACHED') {
        if (!item.artifact?.trim()) issues.push(`RUNTIME_EVIDENCE_ARTIFACT_MISSING:${phase.phaseId}:${item.key}`);
        if (!item.environment?.trim()) issues.push(`RUNTIME_EVIDENCE_ENVIRONMENT_MISSING:${phase.phaseId}:${item.key}`);
        if (!item.capturedAt || !ISO_DATE.test(item.capturedAt) || Number.isNaN(Date.parse(item.capturedAt))) {
          issues.push(`RUNTIME_EVIDENCE_CAPTURED_AT_INVALID:${phase.phaseId}:${item.key}`);
        }
        if (!item.sha256 || !SHA256.test(item.sha256)) issues.push(`RUNTIME_EVIDENCE_SHA256_INVALID:${phase.phaseId}:${item.key}`);
      }
    }
  }

  for (const phase of manifest.phases) {
    const row = ledger.phases.find((item) => item.phaseId === phase.id);
    if (!row) issues.push(`RUNTIME_LEDGER_PHASE_MISSING:${phase.id}`);
    else if (phase.runtimeEvidenceRequired && row.evidence.length === 0) issues.push(`RUNTIME_EVIDENCE_REQUIRED_BUT_EMPTY:${phase.id}`);
  }
  for (const phaseId of phaseIds) {
    if (!manifest.phases.some((phase) => phase.id === phaseId)) issues.push(`RUNTIME_LEDGER_UNKNOWN_PHASE:${phaseId}`);
  }
  return issues;
}

export function pendingRuntimeEvidence(manifest: PhaseManifest, ledger: RuntimeEvidenceLedger): string[] {
  const blockers: string[] = [];
  for (const phase of manifest.phases.filter((item) => item.runtimeEvidenceRequired)) {
    const row = ledger.phases.find((item) => item.phaseId === phase.id);
    if (!row) {
      blockers.push(`phase-${String(phase.id).padStart(2, '0')}:runtime-ledger-missing`);
      continue;
    }
    const unresolved = row.evidence.filter((item) => item.status !== 'ATTACHED' && item.status !== 'NOT_REQUIRED');
    if (unresolved.length) blockers.push(...unresolved.map((item) => `phase-${String(phase.id).padStart(2, '0')}:${item.key}:${item.status.toLowerCase()}`));
  }
  return blockers;
}

export function evaluateReleaseReadiness(input: ReleaseEvaluationInput): ReleaseEvaluation {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const ledgerIssues = validateRuntimeEvidenceLedger(input.manifest, input.runtimeLedger);
  blockers.push(...ledgerIssues);

  for (const gate of input.gates) {
    if (gate.status === 'FAIL') blockers.push(`gate:${gate.id}`);
    if (gate.status === 'PENDING') {
      if (input.mode === 'production') blockers.push(`gate:${gate.id}:pending`);
      else warnings.push(`gate:${gate.id}:pending`);
    }
  }

  const runtimePending = pendingRuntimeEvidence(input.manifest, input.runtimeLedger);
  if (input.mode === 'production') blockers.push(...runtimePending);
  else warnings.push(...runtimePending);

  const complete = input.manifest.phases.filter((phase) => phase.state.status === 'COMPLETE').length;
  if (input.mode === 'production') {
    for (const phase of input.manifest.phases) {
      if (phase.state.status !== 'COMPLETE') blockers.push(`phase-${String(phase.id).padStart(2, '0')}:status:${phase.state.status}`);
      if (!phase.state.evidenceFile) blockers.push(`phase-${String(phase.id).padStart(2, '0')}:evidence-file-missing`);
    }
  }

  const runtimeRequired = input.manifest.phases.filter((phase) => phase.runtimeEvidenceRequired).length;
  const runtimeReady = input.manifest.phases.filter((phase) => {
    if (!phase.runtimeEvidenceRequired) return false;
    const row = input.runtimeLedger.phases.find((item) => item.phaseId === phase.id);
    return Boolean(row?.evidence.length && row.evidence.every((item) => item.status === 'ATTACHED' || item.status === 'NOT_REQUIRED'));
  }).length;

  const normalizedBlockers = [...new Set(blockers)].sort();
  const normalizedWarnings = [...new Set(warnings)].sort();
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const digestSource = {
    mode: input.mode,
    manifest: input.manifest,
    runtimeLedger: input.runtimeLedger,
    gates: input.gates,
    blockers: normalizedBlockers,
    warnings: normalizedWarnings,
  };

  return {
    schemaVersion: META_RELEASE_SCHEMA_VERSION,
    mode: input.mode,
    decision: normalizedBlockers.length ? 'BLOCKED' : 'PASS',
    generatedAt,
    blockers: normalizedBlockers,
    warnings: normalizedWarnings,
    gates: input.gates,
    phaseSummary: { total: input.manifest.phases.length, complete, runtimeRequired, runtimeReady },
    evidenceDigest: sha256Canonical(digestSource),
  };
}

export function createReleaseClaim(evaluation: ReleaseEvaluation, releaseId: string) {
  if (evaluation.mode !== 'production') throw new Error('RELEASE_CLAIM_REQUIRES_PRODUCTION_MODE');
  if (evaluation.decision !== 'PASS') throw new Error('RELEASE_CLAIM_BLOCKED');
  const evaluationValid =
    evaluation.blockers.length === 0 &&
    evaluation.gates.every((gate) => gate.status === 'PASS' || gate.status === 'NOT_REQUIRED') &&
    evaluation.phaseSummary.complete === evaluation.phaseSummary.total &&
    evaluation.phaseSummary.runtimeReady === evaluation.phaseSummary.runtimeRequired &&
    SHA256.test(evaluation.evidenceDigest);
  if (!evaluationValid) throw new Error('RELEASE_CLAIM_EVALUATION_INVALID');
  if (!/^[a-z0-9][a-z0-9._-]{2,80}$/i.test(releaseId)) throw new Error('RELEASE_ID_INVALID');
  const claim = {
    schemaVersion: META_RELEASE_SCHEMA_VERSION,
    releaseId,
    createdAt: new Date().toISOString(),
    evidenceDigest: evaluation.evidenceDigest,
    gateCount: evaluation.gates.length,
    phaseCount: evaluation.phaseSummary.total,
    decision: 'APPROVED' as const,
  };
  return { ...claim, claimDigest: sha256Canonical(claim) };
}
