import fs from 'node:fs';
import path from 'node:path';
import {
  compareMetaVersions,
  evaluateMetaVersionPolicy as evaluateCentralMetaVersionPolicy,
  loadMetaApiVersionPolicy as loadCentralMetaApiVersionPolicy,
  parseMetaVersion,
  type MetaApiVersionPolicy,
} from '@/lib/meta-platform/versioning/registry';
import type { MetaVersionPolicyResult } from './types';

export { compareMetaVersions, parseMetaVersion };

export function loadMetaApiVersionPolicy(file = path.join(process.cwd(), 'config/meta-api-version-policy.json')): MetaApiVersionPolicy {
  const defaultFile = path.join(process.cwd(), 'config/meta-api-version-policy.json');
  if (path.resolve(file) === path.resolve(defaultFile)) return loadCentralMetaApiVersionPolicy();
  return JSON.parse(fs.readFileSync(file, 'utf8')) as MetaApiVersionPolicy;
}

export function evaluateMetaVersionPolicy(input: {
  configuredVersion: string;
  sdkVersion: string;
  now?: Date;
  policy?: MetaApiVersionPolicy;
}): MetaVersionPolicyResult {
  const result = evaluateCentralMetaVersionPolicy(input);
  return { ...result, warnings: [...result.warnings] };
}
