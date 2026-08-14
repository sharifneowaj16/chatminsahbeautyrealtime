#!/usr/bin/env node
import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const root = process.cwd();
const ignored = new Set([".git", ".next", "node_modules"]);

function countFiles(dir) {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) count += countFiles(path);
    else if (entry.isFile()) count += 1;
  }
  return count;
}

function loadState() {
  try {
    return JSON.parse(readFileSync(resolve(root, ".ai/project-state.json"), "utf8"));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: "PROJECT_STATE_UNREADABLE", detail: String(error) }, null, 2));
    process.exit(1);
  }
}

const state = loadState();
const access = state.repository_access ?? {};
const required = access.required_paths ?? [];
const checks = required.map((path) => {
  const absolute = resolve(root, path);
  return {
    path,
    exists: existsSync(absolute),
    kind: existsSync(absolute) ? (statSync(absolute).isDirectory() ? "directory" : "file") : "missing",
  };
});
const fileCount = countFiles(root);
const rootName = basename(root);
const expectedRoot = access.expected_repository_root;
const minimum = Number(access.minimum_repository_file_count ?? 0);
const failures = [];

if (expectedRoot && rootName !== expectedRoot) failures.push(`repository root is ${rootName}, expected ${expectedRoot}`);
if (fileCount < minimum) failures.push(`repository file count ${fileCount} is below minimum ${minimum}`);
for (const check of checks) if (!check.exists) failures.push(`missing required path: ${check.path}`);

const result = {
  ok: failures.length === 0,
  repositoryRoot: root,
  repositoryRootName: rootName,
  expectedRoot,
  fileCount,
  minimumFileCount: minimum,
  activePhase: state.project?.active_phase,
  completedThrough: state.checkpoint?.completed_through,
  currentItem: state.next_item?.id,
  packageFrequency: state.execution_policy?.package_frequency,
  requiredPaths: checks,
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
