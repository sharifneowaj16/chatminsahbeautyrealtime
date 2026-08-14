import {
  META_LEAD_DOMAIN_FIELD_LIMIT,
  META_LEAD_DOMAIN_VALUE_LIMIT,
  type MetaLeadProviderField,
  type MetaLeadSafeCustomField,
} from './types.ts';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const EMAIL_IN_TEXT_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_IN_TEXT_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/;
const TOKEN_IN_TEXT_PATTERN = /(?:EA[A-Za-z0-9_-]{15,}|(?:access|auth|refresh|verify|webhook)?[_-]?(?:token|secret|password|api[_-]?key)\s*[:=]\s*\S+)/i;
const SENSITIVE_FIELD_NAME_PATTERN = /(?:^|_)(?:email|e_mail|phone|mobile|whatsapp|name|first_name|last_name|full_name|address|street|postal|zip|token|secret|password|api_key|webhook|signature|authorization|cookie|birth|dob|nid|passport)(?:_|$)/i;

export function cleanMetaLeadText(value: unknown, max = META_LEAD_DOMAIN_VALUE_LIMIT): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, max) : undefined;
}

export function normalizeMetaLeadFieldName(value: unknown): string | undefined {
  return cleanMetaLeadText(value, 120)?.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function normalizeMetaLeadPhone(value: unknown, defaultCountryCode = '880'): string | undefined {
  const raw = cleanMetaLeadText(value, 80);
  if (!raw) return undefined;
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) digits = `${defaultCountryCode}${digits.slice(1)}`;
  else if (digits.startsWith('1') && digits.length === 10 && defaultCountryCode === '880') digits = `880${digits}`;
  if (digits.length < 8 || digits.length > 15) return undefined;
  return `+${digits}`;
}

export function normalizeMetaLeadEmail(value: unknown): string | undefined {
  const raw = cleanMetaLeadText(value, 320)?.toLowerCase();
  return raw && EMAIL_PATTERN.test(raw) ? raw : undefined;
}

export function maskMetaLeadPhone(value?: string): string | undefined {
  if (!value) return undefined;
  const visible = value.slice(-4);
  return `${'*'.repeat(Math.max(0, value.length - visible.length))}${visible}`;
}

export function maskMetaLeadEmail(value?: string): string | undefined {
  if (!value) return undefined;
  const separator = value.indexOf('@');
  if (separator <= 0 || separator >= value.length - 1) return undefined;
  const local = value.slice(0, separator);
  const domain = value.slice(separator + 1);
  const prefix = local.slice(0, Math.min(2, local.length));
  return `${prefix}${'*'.repeat(Math.max(3, local.length - prefix.length))}@${domain}`;
}

export function containsMetaLeadSensitiveValue(value: string): boolean {
  return EMAIL_IN_TEXT_PATTERN.test(value) || PHONE_IN_TEXT_PATTERN.test(value) || TOKEN_IN_TEXT_PATTERN.test(value);
}

export function isMetaLeadSensitiveFieldName(name: string): boolean {
  return SENSITIVE_FIELD_NAME_PATTERN.test(name);
}

export function normalizeMetaLeadProviderFields(input: unknown): readonly MetaLeadProviderField[] {
  if (!Array.isArray(input)) return Object.freeze([]);
  const fields: MetaLeadProviderField[] = [];
  for (const raw of input.slice(0, META_LEAD_DOMAIN_FIELD_LIMIT)) {
    const candidate = raw as { name?: unknown; values?: unknown } | null;
    const name = normalizeMetaLeadFieldName(candidate?.name);
    if (!name) continue;
    const source = Array.isArray(candidate?.values) ? candidate.values : [candidate?.values];
    const values = source.map((item) => cleanMetaLeadText(item)).filter((item): item is string => Boolean(item)).slice(0, 20);
    if (!values.length) continue;
    fields.push(Object.freeze({ name, values: Object.freeze(values) }));
  }
  return Object.freeze(fields);
}

export function projectMetaLeadCustomFields(
  fields: readonly MetaLeadProviderField[],
  knownNames: ReadonlySet<string>,
): readonly MetaLeadSafeCustomField[] {
  return Object.freeze(fields
    .filter((field) => !knownNames.has(field.name))
    .map((field) => Object.freeze({
      name: field.name,
      valueCount: field.values.length,
      classification: isMetaLeadSensitiveFieldName(field.name)
        ? 'SENSITIVE_NAME' as const
        : field.values.some(containsMetaLeadSensitiveValue)
          ? 'SENSITIVE_VALUE' as const
          : 'METADATA_ONLY' as const,
    })));
}

export function redactMetaLeadSensitiveText(value: unknown, fallback = 'Lead processing failed'): string {
  const clean = cleanMetaLeadText(value, 1_000);
  if (!clean) return fallback;
  return clean
    .replace(/EA[A-Za-z0-9_-]{15,}/g, '[REDACTED_TOKEN]')
    .replace(/https?:\/\/\S+/gi, '[REDACTED_URL]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[REDACTED_PHONE]')
    .replace(/((?:access|auth|refresh|verify|webhook)?[_-]?(?:token|secret|password|api[_-]?key)\s*[:=]\s*)\S+/gi, '$1[REDACTED]')
    .slice(0, 500);
}
