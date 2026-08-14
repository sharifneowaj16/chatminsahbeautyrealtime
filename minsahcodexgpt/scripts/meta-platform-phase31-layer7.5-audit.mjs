import { read, runAudit } from './meta-platform-phase31-layer7-audit-lib.mjs';
const health = read('lib/meta-platform/admin/provider-health.ts');
const route = read('app/api/admin/meta/health/route.ts');
runAudit('Layer 7.5 audit', [
  ['APP scope', health.includes("'APP'")] ,
  ['BUSINESS scope', health.includes("'BUSINESS'")] ,
  ['PAGE scope', health.includes("'PAGE'")] ,
  ['Instagram scope', health.includes("'INSTAGRAM_ACCOUNT'")] ,
  ['ad account scope', health.includes("'AD_ACCOUNT'")] ,
  ['form scope', health.includes("'FORM'")] ,
  ['revocation visible', health.includes('revokedAt')],
  ['safe remediation codes', health.includes('REAUTHORIZE_PROVIDER_ASSET') && health.includes('REVIEW_REQUIRED_PERMISSIONS')],
  ['route is authorized and scanned', route.includes('META_OPS_VIEW') && route.includes('assertMetaAdminSafeDto')],
  ['secret references not selected', !/select:\s*\{[^}]*secretRef/s.test(health) && !/select:\s*\{[^}]*tokenRef/s.test(health)],
]);
