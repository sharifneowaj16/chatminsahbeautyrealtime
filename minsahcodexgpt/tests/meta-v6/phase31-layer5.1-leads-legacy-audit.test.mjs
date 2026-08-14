import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const evidence = fs.readFileSync('evidence/phase31-meta-social-crm/05-leads-legacy-audit.md', 'utf8');

test('every legacy Lead TypeScript module is explicitly classified', () => {
  const modules = fs.readdirSync('lib/meta/leads').filter((name) => name.endsWith('.ts'));
  const lines = evidence.split('\n');
  for (const moduleName of modules) {
    const line = lines.find((value) => value.startsWith('|') && value.includes(`lib/meta/leads/${moduleName}`));
    assert.ok(line, `missing audit row for ${moduleName}`);
    assert.match(line, /`(?:MIGRATE|WRAP|DEPRECATE|DELETE_LATER)`/);
  }
});

test('audit freezes exact 5.2 through 5.4 ownership', () => {
  assert.match(evidence, /### 5\.2 — Lead normalize and mapping domain/);
  assert.match(evidence, /### 5\.3 — Lead processing and CRM handoff domain/);
  assert.match(evidence, /### 5\.4 — Meta test-lead domain and evidence path/);
});

test('audit identifies parallel manual sync and test-lead isolation gaps', () => {
  assert.match(evidence, /Parallel\/legacy path discovered/);
  assert.match(evidence, /no production test-lead creation service/);
  assert.match(evidence, /must not remain authoritative/);
});
