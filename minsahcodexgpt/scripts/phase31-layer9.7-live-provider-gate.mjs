#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  LIVE_META_EVIDENCE_CATEGORIES,
  safeEvidenceSummary,
  validateLiveMetaEvidenceManifest,
} from './phase31-layer9.7-evidence-contract.mjs';

const manifestPath = process.env.PHASE31_LAYER9_7_EVIDENCE_MANIFEST
  || 'evidence/phase31-meta-social-crm/provider-responses/phase31-layer9.7-live-evidence-manifest.json';
const confirmed = process.env.PHASE31_LAYER9_7_CONFIRM_LIVE === 'YES';

function blocked(reason, details = {}) {
  console.log('Phase 31 Layer 9.7 live Meta provider gate: BLOCKED');
  console.log(`Reason: ${reason}`);
  console.log(JSON.stringify({
    phase: 31,
    item: '9.7',
    requiredCategories: LIVE_META_EVIDENCE_CATEGORIES.length,
    ...details,
  }, null, 2));
  process.exitCode = 2;
}

if (!confirmed) {
  blocked('Explicit live-evidence confirmation is missing. Set PHASE31_LAYER9_7_CONFIRM_LIVE=YES only after authentic redacted artifacts are captured.');
} else {
  const absolute = path.resolve(process.cwd(), manifestPath);
  if (!fs.existsSync(absolute)) {
    blocked('The live evidence manifest is missing.', { manifestPath, missingCategories: LIVE_META_EVIDENCE_CATEGORIES });
  } else {
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(absolute, 'utf8'));
    } catch {
      blocked('The live evidence manifest is not valid JSON.', { manifestPath });
    }
    if (manifest) {
      const result = validateLiveMetaEvidenceManifest(manifest, { root: process.cwd() });
      const summary = safeEvidenceSummary(manifest, result);
      console.log(JSON.stringify(summary, null, 2));
      if (!result.ok) {
        console.log('Evidence validation issues:');
        for (const item of result.issues) console.log(`- ${item.code}${item.recordId ? ` [${item.recordId}]` : ''}: ${item.message}`);
        process.exitCode = 2;
      } else {
        console.log('Phase 31 Layer 9.7 live Meta provider gate: PASS');
      }
    }
  }
}
