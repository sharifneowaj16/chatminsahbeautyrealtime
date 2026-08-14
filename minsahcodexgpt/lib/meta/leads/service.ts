// Compatibility facade. The Phase 31 Lead domain runtime is authoritative.
export {
  MetaLeadPermanentProcessingError,
  processMetaLeadReceipt,
  runMetaLeadReceiptRecovery,
  runMetaLeadRetention,
  runMetaLeadSlaAlerts,
} from '@/lib/meta-platform/domains/leads/runtime';
