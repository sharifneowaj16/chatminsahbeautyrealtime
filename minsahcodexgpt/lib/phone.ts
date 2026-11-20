const BD_MOBILE_REGEX = /^01[3-9]\d{8}$/;

const BENGALI_DIGITS: Record<string, string> = {
  '\u09E6': '0',
  '\u09E7': '1',
  '\u09E8': '2',
  '\u09E9': '3',
  '\u09EA': '4',
  '\u09EB': '5',
  '\u09EC': '6',
  '\u09ED': '7',
  '\u09EE': '8',
  '\u09EF': '9',
};

export function toAsciiDigits(value: string): string {
  return value.replace(/[\u09E6-\u09EF]/g, (ch) => BENGALI_DIGITS[ch] ?? ch);
}

export function normalizeBangladeshPhoneNumber(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;

  const raw = toAsciiDigits(String(value)).trim();
  if (!raw) return null;

  let digits = raw.replace(/[^0-9]/g, '');

  if (digits.startsWith('00880')) {
    digits = digits.slice(2);
  }

  if (digits.startsWith('88001') && digits.length === 14) {
    digits = digits.slice(3);
  } else if (digits.startsWith('8801') && digits.length === 13) {
    digits = `0${digits.slice(3)}`;
  } else if (/^1[3-9]\d{8}$/.test(digits)) {
    digits = `0${digits}`;
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
