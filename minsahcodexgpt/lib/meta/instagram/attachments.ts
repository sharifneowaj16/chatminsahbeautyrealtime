import path from 'node:path';
import { uploadFile } from '@/lib/storage/minio';
import {
  downloadMetaMedia,
  isMetaMediaMimeAllowed,
  parseAndValidateMetaMediaUrl,
  type MetaMediaAddressResolver,
} from '@/lib/meta-platform/transports/media';
import type { InstagramAttachmentInput, InstagramMessageType } from './types';
import { evaluateInstagramAttachmentMetadataPolicy } from '@/lib/meta-platform/domains/instagram/media-policy';
import { getInstagramMediaRuntimeMode } from '@/lib/meta-platform/domains/instagram/feature-flags';

export const INSTAGRAM_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/'];
const ALLOWED_EXACT_MIME = ['application/pdf', 'application/octet-stream'];

function validateInstagramAttachmentLegacy(input: InstagramAttachmentInput) {
  const issues: string[] = [];
  if (input.url) {
    try { parseAndValidateMetaMediaUrl(input.url); }
    catch (error) { issues.push(error instanceof Error ? error.message.replace(/^META_MEDIA_/, 'ATTACHMENT_') : 'ATTACHMENT_URL_INVALID'); }
  }
  if (input.fileSize !== null && input.fileSize !== undefined && (input.fileSize < 0 || input.fileSize > INSTAGRAM_ATTACHMENT_MAX_BYTES)) issues.push('ATTACHMENT_SIZE_BLOCKED');
  if (input.mimeType) {
    const mime = input.mimeType.toLowerCase().split(';')[0].trim();
    if (!isMetaMediaMimeAllowed({ mimeType: mime, allowedMimeTypes: ALLOWED_EXACT_MIME, allowedMimePrefixes: ALLOWED_MIME_PREFIXES })) issues.push('ATTACHMENT_MIME_BLOCKED');
  }
  return { valid: issues.length === 0, issues };
}

export function validateInstagramAttachment(input: InstagramAttachmentInput) {
  if (getInstagramMediaRuntimeMode(process.env) === 'LEGACY_ROLLBACK') return validateInstagramAttachmentLegacy(input);
  const policy = evaluateInstagramAttachmentMetadataPolicy({
    type: input.type,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
    hasSourceUrl: Boolean(input.url),
  });
  const issues = policy.safeReasonCode ? [policy.safeReasonCode] : [];
  if (input.url) {
    try { parseAndValidateMetaMediaUrl(input.url); }
    catch (error) { issues.push(error instanceof Error ? error.message.replace(/^META_MEDIA_/, 'ATTACHMENT_') : 'ATTACHMENT_URL_INVALID'); }
  }
  return { valid: issues.length === 0, issues };
}

function safeFileName(value: string | null | undefined, fallback: string) {
  const base = path.basename(value || fallback).replace(/[^a-zA-Z0-9._-]/g, '-');
  return base.slice(0, 160) || fallback;
}

export async function downloadInstagramAttachment(input: {
  attachment: InstagramAttachmentInput;
  accountId: string;
  conversationId: string;
  messageId: string;
  accessToken?: string | null;
  fetchImpl?: typeof fetch;
  resolver?: MetaMediaAddressResolver;
}) {
  const validation = validateInstagramAttachment(input.attachment);
  if (!validation.valid || !input.attachment.url) {
    return { status: 'REJECTED' as const, failureCode: validation.issues[0] ?? 'ATTACHMENT_URL_MISSING' };
  }
  try {
    const media = await downloadMetaMedia({
      url: input.attachment.url,
      authorization: input.accessToken ? `Bearer ${input.accessToken}` : undefined,
      fetchImpl: input.fetchImpl,
      resolver: input.resolver,
      maxBytes: INSTAGRAM_ATTACHMENT_MAX_BYTES,
      allowedMimeTypes: ALLOWED_EXACT_MIME,
      allowedMimePrefixes: ALLOWED_MIME_PREFIXES,
    });
    const fileName = safeFileName(input.attachment.fileName, media.fileName || `${input.attachment.type.toLowerCase()}-${input.messageId}`);
    const folder = `media/meta-instagram/${input.accountId}/${input.conversationId}`;
    const uploaded = await uploadFile(media.bytes, fileName, folder, media.mimeType);
    return { status: 'READY' as const, storageKey: uploaded.key, storageUrl: uploaded.url, mimeType: media.mimeType, fileSize: media.size };
  } catch (error) {
    const code = error instanceof Error ? error.message : 'META_MEDIA_DOWNLOAD_FAILED';
    if (code.includes('BLOCKED') || code.includes('INVALID') || code.includes('MISMATCH')) {
      return { status: 'REJECTED' as const, failureCode: code.replace(/^META_MEDIA_/, 'ATTACHMENT_') };
    }
    return { status: 'FAILED' as const, failureCode: code.replace(/^META_MEDIA_/, 'ATTACHMENT_') };
  }
}

export function normalizeInstagramAttachmentType(value: unknown): InstagramMessageType {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('image')) return 'IMAGE';
  if (text.includes('video')) return 'VIDEO';
  if (text.includes('audio') || text.includes('voice')) return 'AUDIO';
  if (text.includes('file')) return 'FILE';
  return 'UNKNOWN';
}
