export type MetaDeliveryFailureClass = 'TRANSIENT' | 'PERMANENT' | 'AUTH';

export function classifyMetaDeliveryFailure(input: {
  status?: number;
  errorCode?: string | number | null;
  networkError?: boolean;
}): MetaDeliveryFailureClass {
  if (input.networkError || !input.status) return 'TRANSIENT';
  if (input.status === 429 || input.status >= 500) return 'TRANSIENT';
  if (String(input.errorCode ?? '') === '190') return 'AUTH';
  return 'PERMANENT';
}

export function metaFailureIsRetryable(input: {
  status?: number;
  errorCode?: string | number | null;
  networkError?: boolean;
}) {
  return classifyMetaDeliveryFailure(input) === 'TRANSIENT';
}
