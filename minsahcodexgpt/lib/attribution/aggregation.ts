import type { AttributionCoverage } from './types';

export function calculateAttributionCoverage(input: Omit<AttributionCoverage, 'unattributedOrders' | 'coverage'>): AttributionCoverage {
  const totalOrders = Math.max(0, input.totalOrders);
  const attributedOrders = Math.max(0, Math.min(input.attributedOrders, totalOrders));
  return {
    ...input,
    totalOrders,
    attributedOrders,
    unattributedOrders: totalOrders - attributedOrders,
    coverage: totalOrders === 0 ? null : attributedOrders / totalOrders,
  };
}

export function labelAttributionModel(model: 'FIRST_PARTY' | 'META_REPORTED') {
  return model === 'FIRST_PARTY'
    ? { key: model, label: 'First-party attribution', comparable: false }
    : { key: model, label: 'Meta-reported attribution', comparable: false };
}
