#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = 'config/meta-capability-manifest.json';
const docPaths = {
  inventory: 'docs/architecture/meta/current-source-inventory.md',
  capabilities: 'docs/architecture/meta/capability-manifest.md',
  migration: 'docs/architecture/meta/legacy-to-target-map.md',
};
const writeDocs = process.argv.includes('--write-docs');
const jsonOutput = process.argv.includes('--json');

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const normalizePath = (value) => value.split(path.sep).join('/');
const manifest = JSON.parse(read(manifestPath));

const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.prisma', '.sql', '.yml', '.yaml']);
const pathSignal = /(^|[-_/\.])(meta|facebook|instagram)([-_/\.]|$)/i;
const contentSignals = [
  ['BUSINESS_SDK_IMPORT', /\b(?:from\s+|require\s*\(|import\s*\()\s*['\"]facebook-nodejs-business-sdk['\"]/],
  ['GRAPH_URL', /graph\.(?:facebook|instagram)\.com/i],
  ['PROVIDER_ENV', /(?:META|FACEBOOK|INSTAGRAM)_[A-Z0-9_]+/],
  ['WEBHOOK_SIGNATURE', /x-hub-signature|hub\.verify_token/i],
  ['META_DOMAIN_SYMBOL', /\bMeta(?:Event|Catalog|Lead|Connection|Ads|Instagram|Pixel|Capi|CAPI|Platform)|\bFacebook(?:API|Client|Page|Message)|\bInstagram(?:API|Client|Message|Conversation)/i],
];

function listFiles(scanRoot) {
  const absolute = path.join(root, scanRoot);
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return [absolute];
  const files = [];
  const stack = [absolute];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (['node_modules', '.next', '.git', 'generated'].includes(entry.name)) continue;
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(target);
      else if (entry.isFile()) files.push(target);
    }
  }
  return files;
}

function isSupportedFile(file) {
  const base = path.basename(file);
  return allowedExtensions.has(path.extname(file)) || ['.env.example', 'schema.prisma', 'package.json'].includes(base);
}

function detectSignals(relativePath, content) {
  const signals = [];
  if (pathSignal.test(relativePath)) signals.push('PATH_NAME');
  const codeFile = ['.ts', '.tsx', '.js', '.mjs', '.cjs'].includes(path.extname(relativePath));
  for (const [name, pattern] of contentSignals) {
    if (name === 'WEBHOOK_SIGNATURE' && !codeFile) continue;
    if (pattern.test(content)) signals.push(name);
  }
  return [...new Set(signals)].sort();
}

function discoverCandidates() {
  const excluded = new Set(manifest.scope.excludedPaths);
  const discovered = new Map();
  for (const scanRoot of manifest.scope.scanRoots) {
    for (const absolute of listFiles(scanRoot)) {
      if (!isSupportedFile(absolute)) continue;
      const relativePath = normalizePath(path.relative(root, absolute));
      if (excluded.has(relativePath) || discovered.has(relativePath)) continue;
      const content = fs.readFileSync(absolute, 'utf8');
      const signals = detectSignals(relativePath, content);
      if (signals.length > 0) {
        discovered.set(relativePath, { path: relativePath, signals, sha256: sha256(content) });
      }
    }
  }
  return [...discovered.values()].sort((left, right) => left.path.localeCompare(right.path));
}

const capabilities = new Map(manifest.capabilities.map((capability) => [capability.id, capability]));
const discovered = discoverCandidates();
const inventory = [...manifest.inventory].sort((left, right) => left.path.localeCompare(right.path));
const discoveredByPath = new Map(discovered.map((entry) => [entry.path, entry]));
const inventoryByPath = new Map(inventory.map((entry) => [entry.path, entry]));
const checks = [];
const check = (label, ok, detail = '') => checks.push({ label, ok: Boolean(ok), detail });

check('manifest schema version is supported', manifest.schemaVersion === 1);
check('manifest is frozen with a source identity', Boolean(manifest.frozenAt && manifest.source));
check('scan roots and exclusions are explicit', Array.isArray(manifest.scope?.scanRoots) && manifest.scope.scanRoots.length > 0 && Array.isArray(manifest.scope?.excludedPaths));
check('governance blocks new unmapped paths', manifest.governance?.newUnmappedPathsBlockPhase19 === true);
check('legacy deletion is forbidden before observed cutover', manifest.governance?.legacyDeletionAllowedBeforeObservedCutover === false);
check('realtime service is explicitly included', manifest.governance?.realtimeServiceIncluded === true && manifest.scope.scanRoots.some((value) => value.startsWith('realtime-service')));
check('manifest stores no provider secrets or live claims', manifest.governance?.secretsStored === false && manifest.governance?.providerCallsPerformed === false);

const capabilityIds = manifest.capabilities.map((capability) => capability.id);
check('capability IDs are unique', new Set(capabilityIds).size === capabilityIds.length);
for (const capability of manifest.capabilities) {
  check(`capability ${capability.id} has complete migration metadata`,
    Boolean(capability.title && capability.owner && capability.targetPath && capability.cutoverFlag && capability.finalAction)
      && Array.isArray(capability.tokenRoles) && capability.tokenRoles.length > 0
      && Array.isArray(capability.transports) && capability.transports.length > 0
      && Array.isArray(capability.assets) && capability.assets.length > 0
      && Number.isInteger(capability.targetPhase) && capability.targetPhase >= 20 && capability.targetPhase <= 33);
}

check('inventory paths are unique', new Set(inventory.map((entry) => entry.path)).size === inventory.length);
check('inventory is sorted by path', inventory.every((entry, index) => index === 0 || inventory[index - 1].path.localeCompare(entry.path) <= 0));
check('all discovered active paths are mapped', discovered.every((entry) => inventoryByPath.has(entry.path)), discovered.filter((entry) => !inventoryByPath.has(entry.path)).map((entry) => entry.path).join(', '));
check('all inventory paths remain active candidates', inventory.every((entry) => discoveredByPath.has(entry.path)), inventory.filter((entry) => !discoveredByPath.has(entry.path)).map((entry) => entry.path).join(', '));

let entryMetadataValid = true;
let hashesValid = true;
let signalsValid = true;
for (const entry of inventory) {
  const capability = capabilities.get(entry.primaryCapabilityId);
  const current = discoveredByPath.get(entry.path);
  if (!capability || !current) {
    entryMetadataValid = false;
    continue;
  }
  const metadataMatches = entry.owner === capability.owner
    && JSON.stringify(entry.tokenRoles) === JSON.stringify(capability.tokenRoles)
    && JSON.stringify(entry.transports) === JSON.stringify(capability.transports)
    && JSON.stringify(entry.assets) === JSON.stringify(capability.assets)
    && entry.targetPhase === capability.targetPhase
    && entry.cutoverFlag === capability.cutoverFlag
    && entry.finalAction === capability.finalAction
    && Boolean(entry.kind && entry.lifecycle);
  if (!metadataMatches) entryMetadataValid = false;
  if (entry.sha256 !== current.sha256) hashesValid = false;
  if (JSON.stringify(entry.signals) !== JSON.stringify(current.signals)) signalsValid = false;
}
check('every entry resolves capability metadata without placeholders', entryMetadataValid && inventory.every((entry) => !/UNKNOWN|TBD|UNMAPPED/i.test(JSON.stringify(entry))));
check('source hashes match the frozen inventory', hashesValid);
check('source signals match the frozen inventory', signalsValid);

const bySignal = (signal) => inventory.filter((entry) => entry.signals.includes(signal));
check('all Business SDK imports map to the SDK transport phase', bySignal('BUSINESS_SDK_IMPORT').length > 0 && bySignal('BUSINESS_SDK_IMPORT').every((entry) => entry.primaryCapabilityId === 'sdk-transport' && entry.targetPhase === 23));
check('all direct Graph URLs declare Graph transport', bySignal('GRAPH_URL').length > 0 && bySignal('GRAPH_URL').every((entry) => entry.transports.includes('GRAPH_HTTP') || entry.primaryCapabilityId === 'graph-media-boundary'));
check('all provider environment paths declare credential roles', bySignal('PROVIDER_ENV').length > 0 && bySignal('PROVIDER_ENV').every((entry) => entry.tokenRoles.length > 0));
check('all webhook signature paths declare webhook transport', bySignal('WEBHOOK_SIGNATURE').length > 0 && bySignal('WEBHOOK_SIGNATURE').every((entry) => entry.transports.includes('WEBHOOK')));
const realtimeEntries = inventory.filter((entry) => entry.path.startsWith('realtime-service/'));
check('realtime service paths are mapped to Phase 31', realtimeEntries.length > 0 && realtimeEntries.every((entry) => entry.targetPhase === 31));
check('legacy paths have an explicit removal or boundary action', inventory.filter((entry) => entry.lifecycle === 'LEGACY_ACTIVE').every((entry) => /DEPRECATE|REMOVE|DISABLE|BOUNDARY/i.test(entry.finalAction)));

function countBy(values, selector) {
  const counts = new Map();
  for (const value of values) {
    const key = selector(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])));
}

function markdownTable(headers, rows) {
  const escape = (value) => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
  return [
    `| ${headers.map(escape).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`),
  ].join('\n');
}

function renderInventoryDoc() {
  const roots = countBy(inventory, (entry) => entry.path.split('/')[0]);
  const kinds = countBy(inventory, (entry) => entry.kind);
  const signals = countBy(inventory.flatMap((entry) => entry.signals.map((signal) => ({ signal }))), (entry) => entry.signal);
  const highRisk = inventory.filter((entry) => entry.signals.some((signal) => ['BUSINESS_SDK_IMPORT', 'GRAPH_URL', 'PROVIDER_ENV', 'WEBHOOK_SIGNATURE'].includes(signal)));
  return `# Current Meta source inventory\n\n> Frozen from \`${manifest.source}\` at \`${manifest.frozenAt}\`. This document is generated from \`${manifestPath}\` by \`scripts/meta-platform-source-inventory.mjs\`; edit the manifest and regenerate rather than hand-editing this file.\n\n## Scope and guarantees\n\n- Active scan roots: ${manifest.scope.scanRoots.map((value) => `\`${value}\``).join(', ')}.\n- Excluded support scopes: ${manifest.scope.excludedSupportScopes.map((value) => `\`${value}\``).join(', ')}.\n- Candidate rule: ${manifest.scope.candidateRule}.\n- Inventory entries: **${inventory.length}** across **${manifest.capabilities.length}** capabilities.\n- New unmapped active paths fail the Phase 19 audit.\n- No provider call, secret capture, schema migration, or runtime cutover was performed to create this inventory.\n\n## Coverage summary\n\n### By root\n\n${markdownTable(['Root', 'Files'], roots)}\n\n### By kind\n\n${markdownTable(['Kind', 'Files'], kinds)}\n\n### By detection signal\n\n${markdownTable(['Signal', 'Files'], signals)}\n\n## High-risk provider boundaries\n\n${markdownTable(['Path', 'Signals', 'Capability', 'Phase', 'Final action'], highRisk.map((entry) => [entry.path, entry.signals.join(', '), entry.primaryCapabilityId, entry.targetPhase, entry.finalAction]))}\n\n## Complete active inventory\n\n${markdownTable(['Path', 'Lifecycle', 'Kind', 'Capability', 'Owner', 'Token role(s)', 'Transport(s)', 'Asset(s)', 'Target phase', 'Cutover flag', 'Final action'], inventory.map((entry) => [entry.path, entry.lifecycle, entry.kind, entry.primaryCapabilityId, entry.owner, entry.tokenRoles.join(', '), entry.transports.join(', '), entry.assets.join(', '), entry.targetPhase, entry.cutoverFlag, entry.finalAction]))}\n`;
}

function renderCapabilitiesDoc() {
  return `# Meta capability manifest\n\n> Human-readable view of \`${manifestPath}\`, frozen at \`${manifest.frozenAt}\`. The JSON manifest is authoritative.\n\n## Contract\n\nEach capability declares an accountable owner, explicit credential role, transport boundary, provider asset class, target migration phase, cutover flag, final action, and target architecture path. \`NONE_REQUIRED\` is used only where a runtime cutover flag would be misleading; no field may be \`UNKNOWN\`, \`TBD\`, or unmapped.\n\n${markdownTable(['Capability', 'Owner', 'Token role(s)', 'Transport(s)', 'Asset(s)', 'Target phase', 'Cutover flag', 'Final action', 'Target path'], manifest.capabilities.map((capability) => [capability.id, capability.owner, capability.tokenRoles.join(', '), capability.transports.join(', '), capability.assets.join(', '), capability.targetPhase, capability.cutoverFlag, capability.finalAction, capability.targetPath]))}\n\n## Governance rules\n\n- Business SDK imports ultimately belong only under \`lib/meta-platform/transports/business-sdk/**\`.\n- Direct Graph calls ultimately belong only under \`lib/meta-platform/transports/graph-http/**\`.\n- Meta credential reads ultimately belong only under \`lib/meta-platform/credentials/**\`.\n- Webhook HMAC verification ultimately belongs only under \`lib/meta-platform/transports/webhook/**\`.\n- Legacy deletion is forbidden until the capability has observed cutover evidence and rollback proof.\n- The separate realtime service remains in scope and must be bridged or migrated during Phase 31.\n`;
}

function renderMigrationDoc() {
  const rows = manifest.capabilities.map((capability) => {
    const entries = inventory.filter((entry) => entry.primaryCapabilityId === capability.id);
    const roots = [...new Set(entries.map((entry) => entry.path.split('/').slice(0, 3).join('/')))];
    return [capability.id, entries.length, roots.slice(0, 6).map((value) => `\`${value}\``).join(', ') + (roots.length > 6 ? ` +${roots.length - 6} more` : ''), capability.targetPath, capability.targetPhase, capability.cutoverFlag, capability.finalAction];
  });
  const legacy = inventory.filter((entry) => entry.lifecycle === 'LEGACY_ACTIVE' || entry.primaryCapabilityId === 'social-realtime');
  return `# Legacy-to-target Meta migration map\n\n> Generated from the frozen Phase 19 manifest. This is a migration control document, not evidence that any provider cutover has occurred.\n\n## Capability migration map\n\n${markdownTable(['Capability', 'Files', 'Representative current roots', 'Target', 'Phase', 'Cutover flag', 'Final action'], rows)}\n\n## Legacy and parallel-runtime paths requiring observed cutover\n\n${markdownTable(['Path', 'Lifecycle', 'Capability', 'Target phase', 'Cutover flag', 'Final action'], legacy.map((entry) => [entry.path, entry.lifecycle, entry.primaryCapabilityId, entry.targetPhase, entry.cutoverFlag, entry.finalAction]))}\n\n## Cutover sequence\n\n1. Phase 20 establishes the application-facing facade and compatibility boundary.\n2. Phases 21–27 establish models, credentials, transports, durability, resilience, and controlled replay.\n3. Phases 28–32 migrate capability groups behind explicit flags with shadow/canary evidence.\n4. Phase 33 removes legacy paths only after observation, rollback, load, recovery, bundle, and live-provider evidence.\n\n## Rollback rule\n\nBefore legacy deletion, rollback means disabling the new capability flag and restoring the last verified producer/reader. After deletion, rollback requires the approved release archive or a forward fix; historical migrations and evidence are never edited to simulate a passing gate.\n`;
}

const generatedDocs = {
  [docPaths.inventory]: renderInventoryDoc(),
  [docPaths.capabilities]: renderCapabilitiesDoc(),
  [docPaths.migration]: renderMigrationDoc(),
};

if (writeDocs) {
  for (const [file, content] of Object.entries(generatedDocs)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  }
}

for (const [file, expected] of Object.entries(generatedDocs)) {
  const absolute = path.join(root, file);
  check(`${file} exists and matches the manifest`, fs.existsSync(absolute) && fs.readFileSync(absolute, 'utf8') === expected);
}

const passed = checks.filter((item) => item.ok).length;
const summary = {
  manifestPath,
  frozenAt: manifest.frozenAt,
  capabilities: manifest.capabilities.length,
  inventoryEntries: inventory.length,
  discoveredEntries: discovered.length,
  realtimeEntries: realtimeEntries.length,
  directSdkImports: bySignal('BUSINESS_SDK_IMPORT').length,
  directGraphUrls: bySignal('GRAPH_URL').length,
  providerEnvPaths: bySignal('PROVIDER_ENV').length,
  webhookSignaturePaths: bySignal('WEBHOOK_SIGNATURE').length,
  checks: checks.length,
  passed,
};

if (jsonOutput) {
  console.log(JSON.stringify({ summary, checks }, null, 2));
} else {
  for (const item of checks) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
  }
  console.log(`\nPhase 19 Meta source inventory audit: ${passed}/${checks.length} passed`);
  console.log(`Mapped ${inventory.length} active paths across ${manifest.capabilities.length} capabilities; realtime paths: ${realtimeEntries.length}.`);
}

if (passed !== checks.length) process.exit(1);
