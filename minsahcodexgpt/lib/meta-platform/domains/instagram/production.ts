import type { MetaInstagramWebhookProcessingOptions } from '@/lib/meta/instagram/messages';
import type { NormalizedInstagramEvent } from '@/lib/meta/instagram/types';
import { processInstagramInboundReceipt } from './runtime';
import { getMetaInstagramCutoverStatus, shouldScheduleInstagramMediaDownloads } from './cutover.ts';
import { compareInstagramShadowNormalization, META_INSTAGRAM_SHADOW_NOT_OBSERVED, type InstagramShadowComparison } from './shadow-comparison.ts';

function attachCutoverMetadata<T>(value: T, metadata: Record<string, unknown>): T {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.freeze({ ...(value as Record<string, unknown>), cutover: Object.freeze(metadata) }) as T;
}

async function runLegacy(
  receiptId: string,
  options: MetaInstagramWebhookProcessingOptions,
  captureShadow: boolean,
  allowMediaDownloads: boolean,
) {
  const legacy = await import('@/lib/meta/instagram/messages');
  let comparison: InstagramShadowComparison | undefined = captureShadow ? META_INSTAGRAM_SHADOW_NOT_OBSERVED : undefined;
  const previousObserver = options.observeNormalizedEvent;
  const value = await legacy.processInstagramWebhookReceipt(receiptId, {
    ...options,
    allowMediaDownloads,
    mediaDownloadBlockReason: allowMediaDownloads ? undefined : 'META_PLATFORM_SOCIAL_MEDIA_DOWNLOADS_DISABLED',
    observeNormalizedEvent: (event: NormalizedInstagramEvent) => {
      previousObserver?.(event);
      if (captureShadow) comparison = compareInstagramShadowNormalization(event);
    },
  });
  return Object.freeze({ value, ...(comparison ? { comparison } : {}) });
}

export async function processInstagramInboundReceiptProduction(
  receiptId: string,
  options: MetaInstagramWebhookProcessingOptions,
) {
  const cutover = getMetaInstagramCutoverStatus(process.env);
  const allowMediaDownloads = shouldScheduleInstagramMediaDownloads(process.env);
  if (cutover.read.mode === 'PLATFORM') {
    const value = await processInstagramInboundReceipt(receiptId, {
      ...options,
      allowMediaDownloads,
      mediaDownloadBlockReason: allowMediaDownloads ? undefined : 'META_PLATFORM_SOCIAL_MEDIA_DOWNLOADS_DISABLED',
    });
    return attachCutoverMetadata(value, {
      readMode: cutover.read.mode,
      readAuthority: cutover.read.authority,
      readReasonCode: cutover.read.reasonCode,
      mediaMode: cutover.media.mode,
      mediaDownloadsEnabled: allowMediaDownloads,
    });
  }
  const legacy = await runLegacy(receiptId, options, cutover.read.mode === 'SHADOW', allowMediaDownloads);
  return attachCutoverMetadata(legacy.value, {
    readMode: cutover.read.mode,
    readAuthority: cutover.read.authority,
    readReasonCode: cutover.read.reasonCode,
    mediaMode: cutover.media.mode,
    mediaDownloadsEnabled: allowMediaDownloads,
    ...(legacy.comparison ? { shadowComparison: legacy.comparison } : {}),
  });
}
