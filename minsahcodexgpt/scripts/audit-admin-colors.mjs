import fs from 'fs';
import path from 'path';

const searchDirs = ['app/admin', 'app/components/admin', 'components/admin'];
const patterns = [
  { name: 'text-black', regex: /\btext-black\b/ },
  { name: 'text-gray-900', regex: /\btext-gray-900\b/ },
  { name: 'text-gray-800', regex: /\btext-gray-800\b/ },
  { name: 'text-gray-700', regex: /\btext-gray-700\b/ },
  { name: 'minsah- tokens in admin', regex: /\bminsah-[a-z0-9-]+/ },
  { name: 'bare bg-white', regex: /\bbg-white\b(?!\/)/ },
  { name: 'bare bg-gray', regex: /\bbg-gray-(?:50|100|200|300)\b(?!\/)/ },
];

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (/\.(tsx|ts)$/.test(file)) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = searchDirs.flatMap(walk);
const fileMatches = {};
let totalMatches = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    for (const p of patterns) {
      if (p.regex.test(line)) {
        if (!fileMatches[file]) fileMatches[file] = [];
        fileMatches[file].push({ lineNum: idx + 1, pattern: p.name, text: line.trim() });
        totalMatches++;
      }
    }
  });
}

console.log(`\n=== AUDIT SUMMARY (${totalMatches} occurrences across ${Object.keys(fileMatches).length} files) ===`);
for (const [file, matches] of Object.entries(fileMatches)) {
  console.log(`\n--- ${file} (${matches.length}) ---`);
  matches.forEach((m) => {
    console.log(`  L${m.lineNum} [${m.pattern}]: ${m.text.slice(0, 100)}`);
  });
}
