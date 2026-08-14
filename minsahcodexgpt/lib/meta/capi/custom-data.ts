export function normalizeMetaCurrency(value?: unknown) {
  const currency = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return /^[A-Z]{3}$/.test(currency) ? currency : undefined;
}

export function validateMetaValueCurrency(customData: Record<string, unknown>) {
  const issues: string[] = [];
  const hasValue = customData.value !== undefined && customData.value !== null;
  const hasCurrency = customData.currency !== undefined && customData.currency !== null;
  if (hasValue) {
    const value = Number(customData.value);
    if (!Number.isFinite(value) || value < 0) issues.push('META_VALUE_INVALID');
    if (!normalizeMetaCurrency(customData.currency)) issues.push('META_CURRENCY_REQUIRED_WITH_VALUE');
  } else if (hasCurrency && !normalizeMetaCurrency(customData.currency)) {
    issues.push('META_CURRENCY_INVALID');
  }
  return issues;
}
