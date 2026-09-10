import fs from 'fs';
import path from 'path';

const TARGET_DIRS = [
  path.join(process.cwd(), 'app', 'admin'),
  path.join(process.cwd(), 'app', 'components', 'admin'),
  path.join(process.cwd(), 'components', 'admin'),
];

// Mappings for light-mode classes to Magic Blue dark tokens
const REPLACEMENTS = [
  // Container backgrounds & borders
  { from: /\bbg-white\s+rounded-/g, to: 'bg-[#161824] rounded-' },
  { from: /\bbg-white\s+border-/g, to: 'bg-[#161824] border-' },
  { from: /\bbg-white\s+p-/g, to: 'bg-[#161824] p-' },
  { from: /\bbg-white\s+shadow/g, to: 'bg-[#161824] shadow' },
  { from: /\bbg-gray-50\b/g, to: 'bg-[#10121b]' },
  { from: /\bbg-gray-100\b/g, to: 'bg-[#10121b]' },
  { from: /\bhover:bg-gray-50\b/g, to: 'hover:bg-white/[0.04]' },
  { from: /\bhover:bg-gray-100\b/g, to: 'hover:bg-white/[0.06]' },
  { from: /\bborder-gray-100\b/g, to: 'border-[#232636]' },
  { from: /\bborder-gray-200\b/g, to: 'border-[#232636]' },
  { from: /\bborder-gray-300\b/g, to: 'border-[#232636]' },
  { from: /\bdivide-gray-100\b/g, to: 'divide-[#232636]' },
  { from: /\bdivide-gray-200\b/g, to: 'divide-[#232636]' },
  // Info callout styling
  { from: /\bbg-blue-50\b/g, to: 'bg-[#5e6ad2]/10' },
  { from: /\bborder-blue-200\b/g, to: 'border-[#5e6ad2]/20' },
  { from: /\btext-blue-800\b/g, to: 'text-[#f7f8f8]' },
  { from: /\btext-blue-600\b/g, to: 'text-[#5e6ad2]' },
  { from: /\bbg-blue-100\b/g, to: 'bg-[#5e6ad2]/20' },
  // Button overrides in admin
  { from: /bg-white\s+text-black\s+hover:bg-white\/90/g, to: 'bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]' },
];

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

let modifiedCount = 0;
let replacementTotal = 0;

for (const dir of TARGET_DIRS) {
  const files = getAllFiles(dir);
  for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf8');
    let fileChanged = false;

    for (const { from, to } of REPLACEMENTS) {
      const matches = content.match(from);
      if (matches) {
        content = content.replace(from, to);
        fileChanged = true;
        replacementTotal += matches.length;
      }
    }

    if (fileChanged) {
      fs.writeFileSync(filePath, content, 'utf8');
      modifiedCount++;
      console.log(`Updated ${path.relative(process.cwd(), filePath)}`);
    }
  }
}

console.log(`\nCompleted: ${modifiedCount} files updated with ${replacementTotal} light-mode cleanups.`);
