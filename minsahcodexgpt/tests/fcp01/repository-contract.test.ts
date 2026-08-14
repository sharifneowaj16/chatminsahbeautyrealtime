import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

test('toolchain is pinned exactly', () => {
  assert.equal(pkg.engines.node, '22.16.0');
  assert.equal(pkg.engines.npm, '10.9.2');
  assert.equal(pkg.packageManager, 'npm@10.9.2');
  assert.equal(fs.readFileSync('.nvmrc', 'utf8').trim(), '22.16.0');
  assert.equal(fs.readFileSync('.node-version', 'utf8').trim(), '22.16.0');
});

test('all declared dependencies are exact versions', () => {
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    for (const [name, version] of Object.entries(pkg[section] ?? {})) {
      assert.match(String(version), /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, `${section}.${name} must be exact`);
    }
  }
});

test('npm test is a real blocking test command', () => {
  assert.equal(typeof pkg.scripts.test, 'string');
  assert.match(pkg.scripts.test, /--test/);
  assert.doesNotMatch(pkg.scripts.test, /echo|exit 0|no tests/i);
});

test('Dockerfile does not hardcode Minsah production public URLs', () => {
  const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
  assert.doesNotMatch(dockerfile, /https?:\/\/(?:realtime\.|minio\.)?minsahbeauty\.cloud/i);
});
