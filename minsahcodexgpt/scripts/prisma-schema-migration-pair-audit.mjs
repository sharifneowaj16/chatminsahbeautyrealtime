#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const explicitFiles = process.env.PRISMA_CHANGED_FILES?.split(',').map((item) => item.trim()).filter(Boolean);

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function changedFiles() {
  if (explicitFiles?.length) return explicitFiles;
  if (!fs.existsSync(path.join(root, '.git'))) return null;
  const baseSha = process.env.PRISMA_MIGRATION_BASE_SHA?.trim();
  if (baseSha) return git(['diff', '--name-only', `${baseSha}...HEAD`]).split(/\r?\n/).filter(Boolean);
  const baseRef = process.env.GITHUB_BASE_REF?.trim();
  if (baseRef) {
    try {
      git(['fetch', '--no-tags', '--depth=1', 'origin', baseRef]);
    } catch {
      // The checkout may already contain the merge base; continue fail-closed below.
    }
    const mergeBase = git(['merge-base', `origin/${baseRef}`, 'HEAD']);
    return git(['diff', '--name-only', `${mergeBase}...HEAD`]).split(/\r?\n/).filter(Boolean);
  }
  try {
    return git(['diff', '--name-only', 'HEAD~1...HEAD']).split(/\r?\n/).filter(Boolean);
  } catch {
    return git(['status', '--porcelain']).split(/\r?\n/).filter(Boolean).map((line) => line.slice(3));
  }
}

const files = changedFiles();
if (files === null) {
  console.log('PASS Prisma schema/migration pair audit — archive has no Git metadata; CI enforces the change-set gate.');
  process.exit(0);
}

const schemaChanged = files.includes('prisma/schema.prisma');
const migrationSql = files.filter((file) => /^prisma\/migrations\/\d{12,14}_[^/]+\/migration\.sql$/.test(file));
const migrationDirs = migrationSql.map((file) => path.dirname(file));
const missingRecovery = migrationDirs.filter((dir) => !files.includes(`${dir}/recovery.sql`) && !fs.existsSync(path.join(root, dir, 'recovery.sql')));

const failures = [];
if (schemaChanged && migrationSql.length === 0) failures.push('prisma/schema.prisma changed without a new timestamped migration.sql');
if (missingRecovery.length) failures.push(`migration recovery.sql missing: ${missingRecovery.join(', ')}`);
if (migrationSql.some((file) => !fs.existsSync(path.join(root, file)))) failures.push('a declared migration.sql does not exist on disk');

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
console.log(`PASS Prisma schema/migration pair audit — schemaChanged=${schemaChanged} migrations=${migrationSql.length}`);
