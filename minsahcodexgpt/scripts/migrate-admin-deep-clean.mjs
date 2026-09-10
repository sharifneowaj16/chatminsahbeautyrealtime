import fs from 'fs';
import path from 'path';

const TARGET_DIRS = [
  path.join(process.cwd(), 'app', 'admin'),
  path.join(process.cwd(), 'app', 'components', 'admin'),
  path.join(process.cwd(), 'components', 'admin'),
];

const REPLACEMENTS = [
  // Text grays to Magic Blue hierarchy
  { from: /\btext-gray-900\b/g, to: 'text-[#f7f8f8]' },
  { from: /\btext-gray-800\b/g, to: 'text-[#f7f8f8]' },
  { from: /\btext-gray-700\b/g, to: 'text-[#d0d6e0]' },
  { from: /\btext-gray-600\b/g, to: 'text-[#8a8f98]' },
  { from: /\btext-gray-500\b/g, to: 'text-[#8a8f98]' },
  { from: /\btext-gray-400\b/g, to: 'text-[#62666d]' },
  { from: /\btext-gray-300\b/g, to: 'text-[#d0d6e0]' },

  // Active pill tabs with white text on black background
  { from: /activeTab === tab \? 'bg-white text-black[^']*'/g, to: "activeTab === tab ? 'bg-white/[0.12] text-[#f7f8f8] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'" },

  // Bare bg-white (not followed by / or -)
  { from: /\bbg-white\b(?!\/)(?!\s*text-black)/g, to: 'bg-[#161824]' },
  { from: /\bbg-white\s+text-black\b/g, to: 'bg-[#5e6ad2] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]' },

  // Alert/Status tone cleanups
  { from: /\bbg-red-50\b/g, to: 'bg-rose-500/10' },
  { from: /\bborder-red-200\b/g, to: 'border-rose-500/20' },
  { from: /\btext-red-700\b/g, to: 'text-rose-400' },
  { from: /\btext-red-800\b/g, to: 'text-rose-300' },

  { from: /\bbg-green-50\b/g, to: 'bg-emerald-500/10' },
  { from: /\bbg-green-100\b/g, to: 'bg-emerald-500/10' },
  { from: /\bborder-green-200\b/g, to: 'border-emerald-500/20' },
  { from: /\btext-green-700\b/g, to: 'text-emerald-400' },
  { from: /\btext-green-800\b/g, to: 'text-emerald-300' },

  { from: /\bbg-amber-50\b/g, to: 'bg-amber-500/10' },
  { from: /\bbg-amber-100\b/g, to: 'bg-amber-500/10' },
  { from: /\bborder-amber-200\b/g, to: 'border-amber-500/20' },
  { from: /\btext-amber-700\b/g, to: 'text-amber-400' },
  { from: /\btext-amber-800\b/g, to: 'text-amber-300' },

  { from: /\bbg-yellow-50\b/g, to: 'bg-amber-500/10' },
  { from: /\bbg-yellow-100\b/g, to: 'bg-amber-500/10' },
  { from: /\bborder-yellow-200\b/g, to: 'border-amber-500/20' },
  { from: /\btext-yellow-700\b/g, to: 'text-amber-400' },
  { from: /\btext-yellow-800\b/g, to: 'text-amber-300' },

  { from: /\bbg-purple-50\b/g, to: 'bg-purple-500/10' },
  { from: /\bbg-purple-100\b/g, to: 'bg-purple-500/10' },
  { from: /\bborder-purple-200\b/g, to: 'border-purple-500/20' },
  { from: /\btext-purple-700\b/g, to: 'text-purple-300' },

  // Switch/Toggles and miscellaneous light grays
  { from: /\bbg-gray-200\b/g, to: 'bg-white/[0.12]' },
  { from: /\bbg-gray-300\b/g, to: 'bg-white/[0.16]' },
  { from: /\bborder-gray-300\b/g, to: 'border-[#232636]' },
  { from: /\bborder-gray-200\b/g, to: 'border-[#232636]' },
  { from: /\bpeer-focus:ring-blue-300\b/g, to: 'peer-focus:ring-[#5e6ad2]/30' },
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

console.log(`\nCompleted: ${modifiedCount} files updated with ${replacementTotal} deep cleanups.`);
