#!/usr/bin/env node
import fs from 'node:fs';

const release = process.argv.includes('--release');
const policy = JSON.parse(fs.readFileSync('config/meta-api-version-policy.json', 'utf8'));
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const schema = fs.readFileSync('lib/tracking/meta-schema.ts', 'utf8');
const env = fs.readFileSync('.env.example', 'utf8');
const configured = policy.defaultVersion;
const registry = fs.readFileSync('lib/meta-platform/versioning/registry.ts', 'utf8');
const sdkVersion = packageJson.dependencies['facebook-nodejs-business-sdk'];
const entry = policy.versions?.[configured];
const now = new Date();
const checks = [];
const check = (label, ok, detail = '') => checks.push({ label, ok: Boolean(ok), detail });
const version = (value) => /^v\d+\.\d+$/.test(value ?? '');
const reached = (value) => Boolean(value && Date.parse(value) <= now.getTime());

check('policy schema version is 2', policy.schemaVersion === 2);
check('configured version is parseable', version(configured));
check('tracking schema delegates configured version to central registry', schema.includes("@/lib/meta-platform/versioning/registry") && schema.includes('export { DEFAULT_META_GRAPH_API_VERSION, normalizeMetaGraphApiVersion }'));
check('central registry reads the version policy', registry.includes('config/meta-api-version-policy.json'));
check('latest official version is parseable', version(policy.latestOfficialVersion));
check('minimum supported version is parseable', version(policy.minimumSupportedVersion));
check('target version is parseable', version(policy.targetVersion));
check('configured version has a policy entry', Boolean(entry));
check('SDK dependency is exact pinned', /^\d+\.\d+\.\d+$/.test(sdkVersion ?? ''));
check('configured policy SDK matches package', policy.businessSdkVersion === sdkVersion && (!entry?.sdkVersion || entry.sdkVersion === sdkVersion));
check('environment explicitly pins configured version', env.includes(`META_GRAPH_API_VERSION=${configured}`));
check('official versions source is documented', /^https:\/\/developers\.facebook\.com\//.test(policy.officialVersionsUrl ?? ''));
check('policy verification timestamp exists', !Number.isNaN(Date.parse(policy.verifiedAt)));
check('official expiration can remain null when Meta publishes TBD', entry?.officialExpirationDate === null || !Number.isNaN(Date.parse(entry?.officialExpirationDate)));
check('internal warning date is explicit for non-latest baseline', configured === policy.latestOfficialVersion || Boolean(entry?.internalWarningDate));
check('internal block date is explicit for non-latest baseline', configured === policy.latestOfficialVersion || Boolean(entry?.internalBlockDate));
check('configured version is not past internal block date', !reached(entry?.internalBlockDate), entry?.internalBlockDate ?? 'none');
check('configured regression did not fail', entry?.regressionStatus !== 'FAIL');

if (release) {
  const target = policy.versions?.[policy.targetVersion];
  check('release uses target version', configured === policy.targetVersion);
  check('target regression is approved', ['PASS', 'WAIVED'].includes(target?.regressionStatus));
  check('target SDK version is recorded', Boolean(target?.sdkVersion));
}

const failed = checks.filter((item) => !item.ok);
console.log(`Meta Graph version policy audit: ${checks.length - failed.length}/${checks.length} passed${release ? ' (release)' : ''}`);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
if (failed.length) process.exit(1);
