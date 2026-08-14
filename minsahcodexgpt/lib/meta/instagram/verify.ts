import {
  verifyMetaWebhookChallenge,
  verifyMetaWebhookSignature,
} from '@/lib/meta-platform/transports/webhook';

export function verifyInstagramWebhookChallenge(input: {
  mode?: string | null;
  token?: string | null;
  challenge?: string | null;
  expectedToken?: string | null;
}) {
  const result = verifyMetaWebhookChallenge(input);
  return result.ok
    ? { valid: true as const, challenge: result.challenge }
    : { valid: false as const, challenge: null };
}

export function verifyInstagramWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null,
  appSecret: string | null | undefined,
) {
  return verifyMetaWebhookSignature({ rawBody, signatureHeader, appSecret }).ok;
}
