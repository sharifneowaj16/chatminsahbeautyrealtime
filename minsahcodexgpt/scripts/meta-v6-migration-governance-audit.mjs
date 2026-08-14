#!/usr/bin/env node
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'config/meta-v6-migration-manifest.json');
const migrationRoot = path.join(root, 'prisma/migrations');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const checks = [];
const add = (label, ok, detail = '') => checks.push({ label, ok: Boolean(ok), detail });

add('migration manifest schema is version 1', manifest.schemaVersion === 1);
add('migration manifest has generated timestamp', !Number.isNaN(Date.parse(manifest.generatedAt)));
add('migration manifest contains rows', Array.isArray(manifest.migrations) && manifest.migrations.length > 0);

const diskMigrations = fs.readdirSync(migrationRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => fs.existsSync(path.join(migrationRoot, name, 'migration.sql')))
  .sort();
const listed = manifest.migrations.map((item) => item.migration).sort();
add('every committed migration is hashed', JSON.stringify(diskMigrations) === JSON.stringify(listed), `disk=${diskMigrations.length} listed=${listed.length}`);
add('migration names are unique', new Set(listed).size === listed.length);
add('migration names use ordered timestamp prefix', listed.every((name) => /^\d{12,14}_[a-z0-9_]+$/i.test(name)));
add('migration order has no duplicate timestamp', new Set(listed.map((name) => /^([0-9]{12,14})_/.exec(name)?.[1] ?? name)).size === listed.length);

for (const row of manifest.migrations) {
  const full = path.join(root, row.path);
  const exists = fs.existsSync(full);
  add(`${row.migration} file exists`, exists);
  if (!exists) continue;
  const source = fs.readFileSync(full);
  const digest = createHash('sha256').update(source).digest('hex');
  add(`${row.migration} hash matches`, digest === row.sha256);
  add(`${row.migration} rollback/forward-fix note exists`, typeof row.rollbackStrategy === 'string' && row.rollbackStrategy.length >= 20);
  add(`${row.migration} verification note exists`, typeof row.verification === 'string' && row.verification.length >= 20);
  const sql = source.toString('utf8').toUpperCase();
  const detectedDestructive = ['DROP TABLE', 'DROP COLUMN', 'TRUNCATE TABLE'].some((token) => sql.includes(token));
  add(`${row.migration} destructive classification matches`, Boolean(row.destructive) === detectedDestructive);
}

const failed = checks.filter((item) => !item.ok);
console.log(`Meta v6 migration governance audit: ${checks.length - failed.length}/${checks.length} passed`);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
if (failed.length) process.exit(1);
