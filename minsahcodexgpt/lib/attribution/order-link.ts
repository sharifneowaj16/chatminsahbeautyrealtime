import type { AttributionTouch } from './types';
import { resolveFirstTouch } from './first-touch';
import { resolveLastTouch } from './last-touch';

export function inheritLeadAttribution(input: {
  orderFirstTouch?: AttributionTouch | null;
  orderLastTouch?: AttributionTouch | null;
  leadTouch: AttributionTouch;
}) {
  return {
    firstTouch: resolveFirstTouch(input.orderFirstTouch, input.leadTouch),
    lastTouch: resolveLastTouch(input.orderLastTouch, input.leadTouch),
    inherited: !input.orderFirstTouch || !input.orderLastTouch || Boolean(input.orderLastTouch.direct),
  };
}
