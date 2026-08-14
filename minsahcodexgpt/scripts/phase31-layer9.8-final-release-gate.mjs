#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { safeFinalReleaseSummary, validateFinalReleaseManifest } from './phase31-layer9.8-release-contract.mjs';

const manifestPath = process.env.PHASE31_LAYER9_8_RUNTIME_MANIFEST
  || 'evidence/phase31-meta-social-crm/provider-responses/phase31-layer9.8-runtime-release-manifest.json';
const absolute = path.resolve(process.cwd(), manifestPath);

if (!fs.existsSync(absolute)) {
  console.log('Phase 31 Layer 9.8 final runtime and release gate: BLOCKED');
  console.log(`Reason: runtime manifest is missing at ${manifestPath}`);
  process.exit(2);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(absolute, 'utf8'));
} catch {
  console.log('Phase 31 Layer 9.8 final runtime and release gate: BLOCKED');
  console.log('Reason: runtime manifest is not valid JSON.');
  process.exit(2);
}

const result = validateFinalReleaseManifest(manifest, { root: process.cwd() });
console.log(JSON.stringify(safeFinalReleaseSummary(manifest, result), null, 2));
if (!result.ok || result.computedVerdict !== 'PASS') {
  if (result.issues.length) {
    console.log('Validation issues:');
    for (const issue of result.issues) console.log(`- ${issue.code}${issue.check ? ` [${issue.check}]` : ''}: ${issue.message}`);
  }
  console.log('Phase 31 Layer 9.8 final runtime and release gate: BLOCKED');
  process.exit(2);
}
console.log('Phase 31 Layer 9.8 final runtime and release gate: PASS');
