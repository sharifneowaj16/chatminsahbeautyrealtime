const SIGNATURES: readonly { readonly mime: string; readonly test: (bytes: Buffer) => boolean }[] = [
  { mime: 'image/jpeg', test: (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  { mime: 'image/png', test: (bytes) => bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/gif', test: (bytes) => bytes.subarray(0, 6).toString('ascii') === 'GIF87a' || bytes.subarray(0, 6).toString('ascii') === 'GIF89a' },
  { mime: 'image/webp', test: (bytes) => bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP' },
  { mime: 'application/pdf', test: (bytes) => bytes.subarray(0, 5).toString('ascii') === '%PDF-' },
  { mime: 'video/mp4', test: (bytes) => bytes.length >= 12 && bytes.subarray(4, 8).toString('ascii') === 'ftyp' },
  { mime: 'audio/mpeg', test: (bytes) => bytes.length >= 3 && (bytes.subarray(0, 3).toString('ascii') === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) },
];

export function normalizeMetaMediaMimeType(value: string | null | undefined): string {
  return value?.split(';')[0]?.trim().toLowerCase() || 'application/octet-stream';
}

export function detectMetaMediaMimeType(bytes: Buffer): string | null {
  return SIGNATURES.find((entry) => entry.test(bytes))?.mime ?? null;
}

export function isMetaMediaMimeAllowed(input: {
  readonly mimeType: string;
  readonly allowedMimeTypes?: readonly string[];
  readonly allowedMimePrefixes?: readonly string[];
}): boolean {
  const exact = input.allowedMimeTypes ?? ['application/pdf', 'application/octet-stream'];
  const prefixes = input.allowedMimePrefixes ?? ['image/', 'video/', 'audio/'];
  return exact.includes(input.mimeType) || prefixes.some((prefix) => input.mimeType.startsWith(prefix));
}
