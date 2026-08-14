export function normalizePiiEmail(value?: string | null) {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, '');
  return normalized || undefined;
}

export function normalizePiiPhone(value?: string | null) {
  if (!value) return undefined;
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('00880')) digits = digits.slice(2);
  if (digits.startsWith('8801') && digits.length === 13) return digits;
  if (digits.startsWith('01') && digits.length === 11) return `88${digits}`;
  if (digits.startsWith('1') && digits.length === 10) return `880${digits}`;
  return digits.length >= 8 && digits.length <= 15 ? digits : undefined;
}

export function normalizePiiText(value?: string | null) {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, ' ');
  return normalized || undefined;
}
