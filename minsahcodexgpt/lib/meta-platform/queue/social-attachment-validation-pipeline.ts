import path from 'node:path';
import {
  evaluateMetaSocialAttachmentPolicy,
  type MetaSocialAttachmentPolicyDecision,
} from '../policies/attachments.ts';
import type { MetaNormalizedInstagramAttachment } from '../contracts/instagram.ts';
import type { MetaDownloadedMedia, MetaStoredMedia } from '../transports/media/types.ts';

export type MetaSocialAttachmentPipelineResult = Readonly<{
  outcome: 'READY' | 'REJECTED';
  decision: MetaSocialAttachmentPolicyDecision;
  downloaded?: MetaDownloadedMedia;
  stored?: MetaStoredMedia;
}>;

function safeSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '-').replace(/\.{2,}/g, '-').slice(0, 120) || 'unknown';
}

export function buildMetaSocialPrivateStorageKey(input: Readonly<{
  accountId: string;
  attachmentId: string;
  digest: string;
  fileName: string;
}>): string {
  const extension = path.extname(input.fileName).replace(/[^A-Za-z0-9.]/g, '').slice(0, 12);
  return `private/meta-social/instagram/${safeSegment(input.accountId)}/${input.digest.slice(0, 2)}/${safeSegment(input.attachmentId)}-${input.digest}${extension}`;
}

export async function runMetaSocialAttachmentValidationPipeline(input: Readonly<{
  attachment: MetaNormalizedInstagramAttachment;
  accountId: string;
  now: Date;
  download: () => Promise<MetaDownloadedMedia>;
  storeSecurely: (media: MetaDownloadedMedia, storageKey: string) => Promise<MetaStoredMedia>;
}>): Promise<MetaSocialAttachmentPipelineResult> {
  const metadataDecision = evaluateMetaSocialAttachmentPolicy({
    attachment: input.attachment,
    stage: 'METADATA',
    evaluatedAt: input.now,
  });
  if (metadataDecision.decision === 'BLOCKED') {
    return Object.freeze({ outcome: 'REJECTED', decision: metadataDecision });
  }

  const downloaded = await input.download();
  const downloadedDecision = evaluateMetaSocialAttachmentPolicy({
    attachment: input.attachment,
    stage: 'DOWNLOADED',
    evaluatedAt: input.now,
    actualMimeType: downloaded.mimeType,
    actualSize: downloaded.size,
    contentDigest: downloaded.digest,
  });
  if (downloadedDecision.decision === 'BLOCKED') {
    return Object.freeze({ outcome: 'REJECTED', decision: downloadedDecision, downloaded });
  }

  const storageKey = buildMetaSocialPrivateStorageKey({
    accountId: input.accountId,
    attachmentId: input.attachment.attachmentKey,
    digest: downloaded.digest,
    fileName: downloaded.fileName,
  });
  const stored = await input.storeSecurely(downloaded, storageKey);
  const storedDecision = evaluateMetaSocialAttachmentPolicy({
    attachment: input.attachment,
    stage: 'STORED',
    evaluatedAt: input.now,
    actualMimeType: stored.mimeType,
    actualSize: stored.size,
    contentDigest: stored.digest,
    scanResult: stored.scanResult,
    storageVerified: true,
  });
  if (storedDecision.decision !== 'ALLOWED') {
    return Object.freeze({ outcome: 'REJECTED', decision: storedDecision, downloaded, stored });
  }
  return Object.freeze({ outcome: 'READY', decision: storedDecision, downloaded, stored });
}
