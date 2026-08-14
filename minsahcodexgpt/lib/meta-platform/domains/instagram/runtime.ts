import type { MetaInstagramWebhookProcessingOptions } from '@/lib/meta/instagram/messages';
import { processInstagramWebhookReceipt as processInstagramInboundStorageAdapter } from '@/lib/meta/instagram/messages';

export function processInstagramInboundReceipt(
  receiptId: string,
  options: MetaInstagramWebhookProcessingOptions,
) {
  return processInstagramInboundStorageAdapter(receiptId, options);
}
