import { redactMetaLeadSensitiveText } from './normalize-lead.ts';

export type MetaLeadFailureClass = 'ACCESS' | 'NOT_FOUND' | 'POLICY' | 'TRANSIENT' | 'PERMANENT';
export type MetaLeadHandoffState = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'BLOCKED';

export type MetaLeadProcessFailure = Readonly<{
  code: string;
  classification: MetaLeadFailureClass;
  retryable: boolean;
  safeSummary: string;
}>;

export type MetaLeadHandoffClaim = Readonly<{
  id: string;
  leadId: string;
  status: MetaLeadHandoffState;
  attemptCount: number;
}>;

export type MetaLeadHandoffExecutionResult<T> = Readonly<{
  status: 'COMPLETED' | 'ALREADY_COMPLETED' | 'BLOCKED';
  handoffId: string;
  value?: T;
}>;

function safeCode(value: unknown, fallback = 'META_LEAD_PROCESSING_ERROR'): string {
  const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
  const normalized = raw.toUpperCase().replace(/[^A-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80);
  return /^[A-Z][A-Z0-9_]{2,79}$/.test(normalized) ? normalized : fallback;
}

export function classifyMetaLeadProcessingFailure(error: unknown): MetaLeadProcessFailure {
  const candidate = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const code = safeCode(candidate.code ?? candidate.errorCode);
  const status = typeof candidate.httpStatus === 'number' ? candidate.httpStatus : undefined;
  const permanent = candidate.permanent === true || candidate.retryable === false;
  const upper = code.toUpperCase();
  const classification: MetaLeadFailureClass = status === 401 || status === 403 || upper.includes('TOKEN') || upper.includes('AUTH') || upper.includes('PERMISSION')
    ? 'ACCESS'
    : status === 404 || upper.includes('NOT_FOUND') || upper.includes('UNAVAILABLE') || upper.includes('EXPIRED_LEAD')
      ? 'NOT_FOUND'
      : upper.includes('OWNERSHIP') || upper.includes('ALLOWLIST') || upper.includes('MISMATCH') || upper.includes('POLICY')
        ? 'POLICY'
        : permanent
          ? 'PERMANENT'
          : 'TRANSIENT';
  return Object.freeze({
    code,
    classification,
    retryable: classification === 'ACCESS' || classification === 'TRANSIENT',
    safeSummary: redactMetaLeadSensitiveText(candidate.message ?? candidate.summary),
  });
}

export async function executeMetaLeadCrmHandoff<T>(input: {
  handoffId: string;
  leadId: string;
  claim: (handoffId: string) => Promise<MetaLeadHandoffClaim>;
  run: (context: Readonly<{ leadId: string; handoffId: string }>) => Promise<T>;
  complete: (input: Readonly<{ handoffId: string; targetType?: string; targetId?: string }>) => Promise<void>;
  fail: (input: Readonly<{ handoffId: string; failure: MetaLeadProcessFailure; terminal: boolean }>) => Promise<void>;
}): Promise<MetaLeadHandoffExecutionResult<T>> {
  const claim = await input.claim(input.handoffId);
  if (claim.leadId !== input.leadId) throw new Error('META_LEAD_HANDOFF_LEAD_MISMATCH');
  if (claim.status === 'COMPLETED') return Object.freeze({ status: 'ALREADY_COMPLETED', handoffId: claim.id });
  if (claim.status === 'BLOCKED') return Object.freeze({ status: 'BLOCKED', handoffId: claim.id });
  if (claim.status !== 'PROCESSING') throw new Error('META_LEAD_HANDOFF_NOT_CLAIMED');
  try {
    const value = await input.run({ leadId: input.leadId, handoffId: claim.id });
    const target = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const targetId = typeof target.assignedToId === 'string' ? target.assignedToId : undefined;
    await input.complete({ handoffId: claim.id, targetType: 'META_LEAD_ASSIGNMENT', ...(targetId ? { targetId } : {}) });
    return Object.freeze({ status: 'COMPLETED', handoffId: claim.id, value });
  } catch (error) {
    const failure = classifyMetaLeadProcessingFailure(error);
    await input.fail({ handoffId: claim.id, failure, terminal: !failure.retryable });
    const raised = new Error(failure.safeSummary) as Error & { code: string; retryable: boolean; classification: MetaLeadFailureClass };
    raised.code = failure.code;
    raised.retryable = failure.retryable;
    raised.classification = failure.classification;
    throw raised;
  }
}
