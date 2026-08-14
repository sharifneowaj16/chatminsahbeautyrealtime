export const META_PAGE_OPERATION_PERMISSIONS = Object.freeze({
  LEADGEN_SUBSCRIBE: Object.freeze(['pages_manage_metadata', 'leads_retrieval']),
  FACEBOOK_INBOX_SYNC: Object.freeze(['pages_messaging', 'pages_read_engagement']),
  INSTAGRAM_MESSAGING: Object.freeze(['instagram_manage_messages']),
} as const);

export type MetaPageOperation = keyof typeof META_PAGE_OPERATION_PERMISSIONS;

function cleanPermission(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim().toLowerCase();
  return /^[a-z][a-z0-9_]{2,95}$/.test(clean) ? clean : null;
}

function permissionList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(cleanPermission).filter((item): item is string => Boolean(item)))].sort();
}

export function evaluateMetaPagePermissions(input: Readonly<{
  operation: MetaPageOperation;
  permissions: unknown;
}>): Readonly<{
  checked: boolean;
  allowed: boolean;
  required: readonly string[];
  granted: readonly string[];
  missing: readonly string[];
  declined: readonly string[];
  reasonCode: 'ALLOWED' | 'META_PAGE_PERMISSIONS_UNCHECKED' | 'META_PAGE_PERMISSION_MISSING';
}> {
  const row = input.permissions && typeof input.permissions === 'object' && !Array.isArray(input.permissions)
    ? input.permissions as Readonly<Record<string, unknown>>
    : {};
  const checked = row.checked === true;
  const granted = permissionList(row.granted);
  const declined = permissionList(row.declined);
  const required = META_PAGE_OPERATION_PERMISSIONS[input.operation];
  const missing = required.filter((permission) => !granted.includes(permission));
  const allowed = checked && missing.length === 0;
  return Object.freeze({
    checked,
    allowed,
    required,
    granted: Object.freeze(granted),
    missing: Object.freeze(missing),
    declined: Object.freeze(declined),
    reasonCode: !checked ? 'META_PAGE_PERMISSIONS_UNCHECKED' : missing.length ? 'META_PAGE_PERMISSION_MISSING' : 'ALLOWED',
  });
}
