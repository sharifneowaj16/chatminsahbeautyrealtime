import crypto from 'node:crypto';
import fs from 'node:fs';
import { exists, read, runAudit } from './meta-platform-phase31-layer7-audit-lib.mjs';
const itemIds = ['7.1','7.2','7.3','7.4','7.5','7.6','7.7'];
const schemaHash = crypto.createHash('sha256').update(fs.readFileSync('prisma/schema.prisma')).digest('hex');
const docs = ['evidence/phase31-meta-social-crm/09-admin-api-audit.md', 'evidence/phase31-meta-social-crm/09-admin-api.md'];
const logsGood = itemIds.every((id) => {
  const path = `evidence/phase31-meta-social-crm/logs/phase31_layer${id}_gate.log`;
  if (!exists(path)) return false;
  const text = read(path);
  return /PASS|# pass [1-9]/.test(text) && !/# fail [1-9]|^not ok/m.test(text);
});
runAudit('Layer 7.8 audit', [
  ['final reports exist', docs.every(exists)],
  ['all item results exist', [...itemIds, '7.8'].every((id) => exists(`evidence/phase31-meta-social-crm/items/phase31_layer${id}_result.md`))],
  ['prior gates are green', logsGood],
  ['schema unchanged', schemaHash === 'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce'],
  ['package scripts present', read('package.json').includes('qa:phase31-meta-layer7')],
  ['safe DTO scanner active', read('lib/meta-platform/admin/contracts.ts').includes('assertMetaAdminSafeDto')],
  ['CSRF guard active', read('app/api/admin/_utils.ts').includes('requireAdminMutationPermission')],
]);
