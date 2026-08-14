import { redactMetaAdminData } from './redaction';

const FINAL_STATUS = new Set([
  'ACTIVE', 'FAILED', 'DELETED',
  'SENT', 'FAILED_PERMANENT', 'SUPPRESSED',
  'SUCCEEDED', 'CANCELLED', 'DEAD_LETTER',
  'HEALTHY', 'DEGRADED', 'INVALID_TOKEN', 'MISSING_PERMISSION', 'ASSET_NOT_FOUND', 'VERSION_WARNING', 'ERROR',
  'EXECUTED', 'REJECTED', 'FAILED', 'EXPIRED', 'CANCELLED',
]);

export function describeMetaProviderState(status: string) {
  const normalized = status.trim().toUpperCase();
  const final = FINAL_STATUS.has(normalized);
  const pending = ['SUBMITTED', 'DELETE_SUBMITTED', 'PENDING', 'DISPATCHED', 'PROCESSING', 'RETRY_SCHEDULED', 'QUEUED', 'RUNNING', 'RETRYING', 'APPROVED', 'EXECUTING'].includes(normalized);
  return {
    status: normalized,
    final,
    pending,
    label: pending ? `${normalized.replaceAll('_', ' ')} — awaiting final provider state` : normalized.replaceAll('_', ' '),
  };
}

export function describeMetaFailure(error: unknown) {
  const safe = redactMetaAdminData(error);
  const text = JSON.stringify(safe ?? {}).toLowerCase();
  let hint = 'Inspect the safe error details and retry only after the underlying condition is corrected.';
  if (/token|oauth|190/.test(text)) hint = 'Token is invalid or expired. Reconnect or rotate the external secret reference, then recheck permissions.';
  else if (/permission|\"code\":(?:200|10)(?:,|})/.test(text)) hint = 'The connected Meta principal is missing a required permission or asset task.';
  else if (/rate.?limit|too many|613/.test(text)) hint = 'Meta rate limiting is active. Allow backoff to complete before replaying.';
  else if (/duplicate|already/.test(text)) hint = 'The provider detected a duplicate or previously completed operation. Verify final state before replaying.';
  else if (/validation|invalid|parameter|\"code\":100(?:,|})/.test(text)) hint = 'The request payload is invalid. Correct the mapped field or resource identifier before replaying.';
  return { safeError: safe, hint };
}
