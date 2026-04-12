import crypto from 'crypto'

export function verifyFacebookSignature(
  rawBody: Buffer,
  signatureHeader: string | string[] | undefined,
  appSecret: string
): boolean {
  if (!signatureHeader || Array.isArray(signatureHeader)) {
    return false
  }

  const [algo, receivedHash] = signatureHeader.split('=')
  if (algo !== 'sha256' || !receivedHash) {
    return false
  }

  const expectedHash = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    )
  } catch {
    return false
  }
}
