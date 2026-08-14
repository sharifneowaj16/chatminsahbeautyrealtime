import { createHash } from 'node:crypto';
export function digestInstagramAttachmentUrl(value: string | null | undefined) { return value ? createHash('sha256').update(value).digest('hex') : null; }
export function sanitizeInstagramAttachmentMetadata(input: Record<string, unknown>) { const allowed = new Set(['externalId','type','mimeType','fileName','fileSize','contentDigest','validatorVersion','reasonCode']); return Object.fromEntries(Object.entries(input).filter(([key, value]) => allowed.has(key) && value !== undefined)); }
