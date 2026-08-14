import fs from 'node:fs';
export const read = (path) => fs.readFileSync(path, 'utf8');
export const exists = (path) => fs.existsSync(path);
export function runAudit(label, checks) {
  let passed = 0;
  for (const [name, condition] of checks) {
    if (!condition) { console.error(`FAIL ${name}`); process.exitCode = 1; continue; }
    passed += 1; console.log(`PASS ${name}`);
  }
  if (!process.exitCode) console.log(`${label}: ${passed}/${checks.length} PASS`);
}
