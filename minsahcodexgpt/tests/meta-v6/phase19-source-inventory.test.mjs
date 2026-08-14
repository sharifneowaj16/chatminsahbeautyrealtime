import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import test from 'node:test';

const manifest = JSON.parse(fs.readFileSync('config/meta-capability-manifest.json', 'utf8'));

function runAuditJson() {
  return JSON.parse(execFileSync(process.execPath, ['scripts/meta-platform-source-inventory.mjs', '--json'], { encoding: 'utf8' }));
}

test('Phase 19 inventory audit maps every active provider path', () => {
  const result = runAuditJson();
  assert.equal(result.summary.passed, result.summary.checks);
  assert.equal(result.summary.inventoryEntries, result.summary.discoveredEntries);
  assert.ok(result.summary.inventoryEntries >= 300);
  assert.ok(result.summary.realtimeEntries > 0);
});

test('capabilities have explicit ownership, roles, phases and cutover actions', () => {
  assert.ok(manifest.capabilities.length >= 20);
  for (const capability of manifest.capabilities) {
    assert.ok(capability.owner);
    assert.ok(capability.tokenRoles.length > 0);
    assert.ok(capability.transports.length > 0);
    assert.ok(capability.assets.length > 0);
    assert.ok(Number.isInteger(capability.targetPhase));
    assert.ok(capability.cutoverFlag);
    assert.ok(capability.finalAction);
    assert.doesNotMatch(JSON.stringify(capability), /UNKNOWN|TBD|UNMAPPED/i);
  }
});

test('direct provider boundaries and realtime service remain explicitly governed', () => {
  const sdkImports = manifest.inventory.filter((entry) => entry.signals.includes('BUSINESS_SDK_IMPORT'));
  const graphUrls = manifest.inventory.filter((entry) => entry.signals.includes('GRAPH_URL'));
  const realtime = manifest.inventory.filter((entry) => entry.path.startsWith('realtime-service/'));
  const legacy = manifest.inventory.filter((entry) => entry.lifecycle === 'LEGACY_ACTIVE');

  assert.ok(sdkImports.length > 0);
  assert.ok(sdkImports.every((entry) => entry.primaryCapabilityId === 'sdk-transport' && entry.targetPhase === 23));
  assert.ok(graphUrls.length > 0);
  assert.ok(graphUrls.every((entry) => entry.transports.includes('GRAPH_HTTP') || entry.primaryCapabilityId === 'graph-media-boundary'));
  assert.ok(realtime.length > 0);
  assert.ok(realtime.every((entry) => entry.targetPhase === 31));
  assert.ok(legacy.length > 0);
  assert.ok(legacy.every((entry) => /DEPRECATE|REMOVE|DISABLE|BOUNDARY/i.test(entry.finalAction)));
});

test('generated architecture documents identify the JSON manifest as authoritative', () => {
  for (const file of [
    'docs/architecture/meta/current-source-inventory.md',
    'docs/architecture/meta/capability-manifest.md',
    'docs/architecture/meta/legacy-to-target-map.md',
  ]) {
    const content = fs.readFileSync(file, 'utf8');
    assert.match(content, /config\/meta-capability-manifest\.json|frozen Phase 19 manifest/i);
  }
});
