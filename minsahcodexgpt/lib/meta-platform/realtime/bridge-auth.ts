import 'server-only';
import { verifyRealtimeBridgeSignature } from '../../../packages/meta-realtime-contract/src';

export function verifyInternalRealtimeBridgeRequest(input: {
  timestamp?: string | null;
  signature?: string | null;
  method: string;
  path: string;
  body: Buffer | string;
}): boolean {
  const secret = process.env.REALTIME_BRIDGE_SECRET ?? '';
  return verifyRealtimeBridgeSignature({ ...input, secret });
}
