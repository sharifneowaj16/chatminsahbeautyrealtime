#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const ignored = new Set([".git", ".next", "node_modules"]);
const state = JSON.parse(readFileSync(resolve(root, ".ai/project-state.json"), "utf8"));
const checkpointLog = state.checkpoint?.verification_log;
const files = [
  "AGENTS.md",
  "SECOND_BRAIN.md",
  ".ai/project-state.json",
  ".ai/layer-progress.json",
  ".ai/phase31-execution-manifest.json",
  ".ai/FAST_WORKFLOW.md",
  "AI_CONTEXT.md",
  "CURRENT_LAYER.md",
  "CURRENT_TASK.md",
  "rules.md",
  "phases.md",
  "memory.md",
  "docs/roadmaps/phase31-fast-execution-policy.md",
  "docs/roadmaps/phase31-layers-3-to-9-implementation-roadmap.md",
  "phase31_layer4_verification.log",
  ...(checkpointLog && existsSync(resolve(root, checkpointLog)) ? [checkpointLog] : []),
];

function sha256(path) {
  return createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex");
}

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

const manifest = {
  schema_version: 2,
  generated_at: new Date().toISOString(),
  second_brain_version: state.second_brain?.version,
  checkpoint: {
    completed_through: state.checkpoint?.completed_through,
    current_item: state.next_item?.id,
    active_layer: state.execution_policy?.active_layer,
    package_frequency: state.execution_policy?.package_frequency,
    verified_archive: state.checkpoint?.verified_archive,
    verification_log: state.checkpoint?.verification_log,
  },
  repository: {
    expected_root: state.repository_access?.expected_repository_root,
    file_count: countFiles(root),
    minimum_file_count: state.repository_access?.minimum_repository_file_count,
  },
  context_files: Object.fromEntries(files.map((path) => [path, { sha256: sha256(path) }])),
};

writeFileSync(resolve(root, ".ai/context-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote .ai/context-manifest.json with ${files.length} context hashes and ${manifest.repository.file_count} repository files.`);
