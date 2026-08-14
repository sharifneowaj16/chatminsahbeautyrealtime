#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportArg = process.argv.find((arg) => arg.startsWith('--report='));
const reportPath = reportArg
  ? path.resolve(root, reportArg.slice('--report='.length))
  : path.join(root, 'docs/release/meta-v6/phase-15-production-release-report.json');
const planPath = path.join(root, 'config/meta-v6-production-closure-plan.json');
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const issues = [];

if (plan.schemaVersion !== 1) issues.push('CLOSURE_PLAN_SCHEMA_INVALID');
if (!Array.isArray(plan.workstreams) || plan.workstreams.length === 0) issues.push('CLOSURE_PLAN_WORKSTREAMS_EMPTY');
const ids = new Set();
for (const stream of plan.workstreams ?? []) {
  if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(stream.id ?? '')) issues.push(`CLOSURE_WORKSTREAM_ID_INVALID:${stream.id}`);
  if (ids.has(stream.id)) issues.push(`CLOSURE_WORKSTREAM_DUPLICATE:${stream.id}`);
  ids.add(stream.id);
  if (!String(stream.owner ?? '').trim()) issues.push(`CLOSURE_WORKSTREAM_OWNER_MISSING:${stream.id}`);
  if (!Array.isArray(stream.blockerPatterns) || stream.blockerPatterns.length === 0) issues.push(`CLOSURE_WORKSTREAM_PATTERNS_MISSING:${stream.id}`);
  if (!Array.isArray(stream.commands) || stream.commands.length === 0) issues.push(`CLOSURE_WORKSTREAM_COMMANDS_MISSING:${stream.id}`);
  if (!Array.isArray(stream.requiredEvidence) || stream.requiredEvidence.length === 0) issues.push(`CLOSURE_WORKSTREAM_EVIDENCE_MISSING:${stream.id}`);
  if (!String(stream.completionRule ?? '').trim()) issues.push(`CLOSURE_WORKSTREAM_RULE_MISSING:${stream.id}`);
  for (const pattern of stream.blockerPatterns ?? []) {
    try { new RegExp(pattern); } catch { issues.push(`CLOSURE_WORKSTREAM_PATTERN_INVALID:${stream.id}:${pattern}`); }
  }
}

const mapped = [];
const unmapped = [];
for (const blocker of report.blockers ?? []) {
  const owners = plan.workstreams
    .filter((stream) => stream.blockerPatterns.some((pattern) => new RegExp(pattern).test(blocker)))
    .map((stream) => stream.id);
  if (owners.length) mapped.push({ blocker, workstreams: owners });
  else unmapped.push(blocker);
}
if (unmapped.length) issues.push(...unmapped.map((blocker) => `CLOSURE_BLOCKER_UNMAPPED:${blocker}`));

const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  releaseDecision: report.decision,
  blockerCount: (report.blockers ?? []).length,
  mappedCount: mapped.length,
  unmapped,
  workstreams: plan.workstreams.map((stream) => ({
    id: stream.id,
    owner: stream.owner,
    blockerCount: mapped.filter((row) => row.workstreams.includes(stream.id)).length,
    commands: stream.commands,
    requiredEvidence: stream.requiredEvidence,
    completionRule: stream.completionRule,
  })),
  issues,
};
const outputPath = path.join(root, 'docs/release/meta-v6/phase-16-closure-status.json');
if (process.argv.includes('--write')) fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (issues.length) process.exit(1);
