import type { AttributionTouch } from './types';

export function resolveFirstTouch(existing: AttributionTouch | null | undefined, incoming: AttributionTouch) {
  return existing ?? incoming;
}

export function firstTouchConflict(existing: AttributionTouch | null | undefined, incoming: AttributionTouch) {
  if (!existing) return false;
  return JSON.stringify(existing) !== JSON.stringify(incoming);
}
