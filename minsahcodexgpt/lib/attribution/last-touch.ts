import type { AttributionTouch } from './types';

export const DIRECT_TRAFFIC_POLICY = 'Direct traffic does not overwrite a prior eligible marketing touch.';

export function resolveLastTouch(existing: AttributionTouch | null | undefined, incoming: AttributionTouch) {
  if (!existing) return incoming;
  if (incoming.direct && !existing.direct) return existing;
  return incoming;
}
