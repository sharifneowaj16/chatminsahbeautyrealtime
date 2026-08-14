#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  PHASE31_EXCLUDED_LIVE_SCOPES,
  PHASE31_STATIC_AUDIT_SUITE_ORDER,
  PHASE31_STATIC_AUDIT_SUITES,
} from './meta-v6-phase31-audit-contract.mjs';

const SECRET_ENV_NAME = /(?:^|_)(?:TOKEN|SECRET|PASSWORD|PRIVATE_KEY|CLIENT_SECRET|APP_SECRET|ACCESS_KEY|DATABASE_URL|DIRECT_URL|REDIS_URL)(?:$|_)/i;
const FORBIDDEN_STATIC_COMMAND = /(?:^|:)(?:live|provider-evidence|layer3-db)(?:$|:)|(?:^|:)release(?:$|:)|(?:^|:)build(?:$|:)|npm\s+ci/i;

export function createStaticAuditEnvironment(source = process.env) {
  const clean = {};
  for (const [name, value] of Object.entries(source)) {
    if (value === undefined || SECRET_ENV_NAME.test(name)) continue;
    clean[name] = value;
  }
  clean.CI = '1';
  clean.PHASE31_AUDIT_MODE = 'STATIC_NO_SECRETS';
  clean.PHASE31_LIVE_PROVIDER_EVIDENCE = 'DISABLED';
  return clean;
}

export function validatePhase31StaticAuditContract(packageScripts) {
  const errors = [];
  const actualOrder = Object.keys(PHASE31_STATIC_AUDIT_SUITES);
  if (JSON.stringify(actualOrder) !== JSON.stringify(PHASE31_STATIC_AUDIT_SUITE_ORDER)) {
    errors.push('Static suite declaration order does not match the canonical order');
  }

  for (const suiteName of PHASE31_STATIC_AUDIT_SUITE_ORDER) {
    const definition = PHASE31_STATIC_AUDIT_SUITES[suiteName];
    if (!definition || definition.executionClass !== 'STATIC_NO_SECRETS') {
      errors.push(`${suiteName}: execution class must be STATIC_NO_SECRETS`);
      continue;
    }
    if (!definition.commands.length) errors.push(`${suiteName}: command list is empty`);
    const seen = new Set();
    for (const command of definition.commands) {
      if (seen.has(command)) errors.push(`${suiteName}: duplicate command ${command}`);
      seen.add(command);
      if (FORBIDDEN_STATIC_COMMAND.test(command)) errors.push(`${suiteName}: forbidden live/runtime command ${command}`);
      if (typeof packageScripts?.[command] !== 'string') errors.push(`${suiteName}: package script is missing: ${command}`);
    }
  }
  return errors;
}

export function getPhase31StaticAuditManifest(suiteName) {
  const definition = PHASE31_STATIC_AUDIT_SUITES[suiteName];
  if (!definition) throw new Error(`Unknown Phase 31 static audit suite: ${suiteName}`);
  return {
    schemaVersion: 1,
    phase: 31,
    mode: 'STATIC_NO_SECRETS',
    suite: suiteName,
    title: definition.title,
    commands: [...definition.commands],
    excludedLiveScopes: [...PHASE31_EXCLUDED_LIVE_SCOPES],
  };
}

function npmExecutable() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function npmInvocation(env) {
  const npmExecPath = typeof env.npm_execpath === 'string' && env.npm_execpath.trim()
    ? env.npm_execpath
    : null;
  if (npmExecPath) {
    return {
      executable: env.npm_node_execpath || process.execPath,
      argsPrefix: [npmExecPath],
      shell: false,
    };
  }
  return {
    executable: npmExecutable(),
    argsPrefix: [],
    shell: process.platform === 'win32',
  };
}

export function runPhase31StaticAuditSuite(suiteName, options = {}) {
  const root = options.root ?? process.cwd();
  const manifest = getPhase31StaticAuditManifest(suiteName);
  const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const errors = validatePhase31StaticAuditContract(packageJson.scripts ?? {});
  if (errors.length) {
    for (const error of errors) console.error(`[phase31-audit-contract] ${error}`);
    return 2;
  }

  const env = createStaticAuditEnvironment(options.env ?? process.env);
  const invocation = npmInvocation(env);
  console.log(`\n[Phase 31 static audit] ${suiteName}: ${manifest.title}`);
  console.log(`[Phase 31 static audit] commands=${manifest.commands.length}; live scopes excluded=${manifest.excludedLiveScopes.join(',')}`);

  for (const command of manifest.commands) {
    console.log(`\n[Phase 31 static audit:${suiteName}] npm run ${command}`);
    const result = spawnSync(invocation.executable, [...invocation.argsPrefix, 'run', '--silent', command], {
      cwd: root,
      env,
      stdio: 'inherit',
      shell: invocation.shell,
    });
    if (result.error) {
      console.error(`[Phase 31 static audit:${suiteName}] spawn error: ${result.error.message}`);
      return 1;
    }
    if (result.status !== 0) {
      console.error(`[Phase 31 static audit:${suiteName}] FAIL command=${command} exit=${result.status ?? 'signal'}`);
      return result.status ?? 1;
    }
  }

  console.log(`\n[Phase 31 static audit:${suiteName}] PASS (${manifest.commands.length}/${manifest.commands.length} commands)`);
  return 0;
}

export function runPhase31StaticAuditCli(suiteName, argv = process.argv.slice(2)) {
  let manifest;
  try {
    manifest = getPhase31StaticAuditManifest(suiteName);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }

  const listOnly = argv.includes('--list') || argv.includes('--dry-run');
  const json = argv.includes('--json');
  if (listOnly) {
    if (json) console.log(JSON.stringify(manifest, null, 2));
    else {
      console.log(`${manifest.suite}: ${manifest.title}`);
      for (const command of manifest.commands) console.log(command);
      console.log(`excluded-live-scopes: ${manifest.excludedLiveScopes.join(',')}`);
    }
    return 0;
  }
  return runPhase31StaticAuditSuite(suiteName);
}
