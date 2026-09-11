const BD_MOBILE_REGEX = /^01[3-9]\d{8}$/;

export function normalizeBangladeshPhoneNumber(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;

  const raw = String(value).trim();
  if (!raw) return null;

  let digits = raw.replace(/[^0-9]/g, '');

  if (digits.startsWith('00880')) {
    digits = digits.slice(2);
  }

  if (digits.startsWith('8801') && digits.length === 13) {
    digits = `0${digits.slice(3)}`;
  }

  if (!BD_MOBILE_REGEX.test(digits)) return null;
  return digits;
}

export function isValidBangladeshPhoneNumber(value: unknown): boolean {
  return normalizeBangladeshPhoneNumber(value) !== null;
}

export function getBangladeshPhoneVariations(value: unknown): string[] {
  const normalized = normalizeBangladeshPhoneNumber(value);
  if (!normalized) {
    if (typeof value === 'string' && value.trim()) {
      return [value.trim()];
    }
    return [];
  }
  return Array.from(
    new Set([
      normalized,
      `+88${normalized}`,
      `88${normalized}`,
      `+880${normalized.slice(1)}`,
    ]),
  );
}
