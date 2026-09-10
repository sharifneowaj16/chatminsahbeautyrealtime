import fs from 'fs';
import path from 'path';

const TARGET_DIRS = [
  path.join(process.cwd(), 'app', 'admin'),
  path.join(process.cwd(), 'app', 'components', 'admin'),
  path.join(process.cwd(), 'components', 'admin'),
];

const REPLACEMENTS = [
  // Minsah surface/background tokens to Magic Blue
  { from: /\bbg-minsah-light\b/g, to: 'bg-[#0b0c10]' },
  { from: /\bbg-minsah-surface-page\b/g, to: 'bg-[#0b0c10]' },
  { from: /\bbg-minsah-surface-panel\b/g, to: 'bg-[#161824]' },
  { from: /\bbg-minsah-surface-subtle\b/g, to: 'bg-[#10121b]' },
  { from: /\bbg-minsah-surface-accent\b/g, to: 'bg-white/[0.04]' },
  { from: /\bbg-minsah-surface-inverse\b/g, to: 'bg-[#161824]' },
  { from: /\bbg-minsah-action-primary\b/g, to: 'bg-[#5e6ad2]' },
  { from: /\baccent-minsah-action-primary\b/g, to: 'accent-[#5e6ad2]' },
  { from: /\bbg-minsah-status-warning-surface\b/g, to: 'bg-amber-500/10' },
  { from: /\bbg-minsah-status-success-text\b/g, to: 'bg-emerald-400' },

  // Minsah border tokens
  { from: /\bborder-minsah-border-subtle\b/g, to: 'border-[#232636]' },
  { from: /\bborder-minsah-border-default\b/g, to: 'border-[#232636]' },
  { from: /\bborder-minsah-border-strong\b/g, to: 'border-white/20' },
  { from: /\bborder-minsah-accent\b/g, to: 'border-[#232636]' },
  { from: /\bborder-minsah-action-primary\b/g, to: 'border-[#5e6ad2]' },
  { from: /\bborder-minsah-text-inverse\b/g, to: 'border-white/30' },
  { from: /\bfocus:border-minsah-primary\b/g, to: 'focus:border-[#5e6ad2]' },

  // Minsah text tokens
  { from: /\btext-minsah-text-primary\b/g, to: 'text-[#f7f8f8]' },
  { from: /\btext-minsah-text-muted\b/g, to: 'text-[#8a8f98]' },
  { from: /\btext-minsah-text-subtle\b/g, to: 'text-[#62666d]' },
  { from: /\btext-minsah-text-link\b/g, to: 'text-[#5e6ad2]' },
  { from: /\btext-minsah-text-inverse\b/g, to: 'text-white' },
  { from: /\btext-minsah-status-warning-text\b/g, to: 'text-amber-400' },
  { from: /\btext-minsah-dark\b/g, to: 'text-[#f7f8f8]' },
  { from: /\btext-minsah-secondary\b/g, to: 'text-[#8a8f98]' },
  { from: /\btext-minsah-primary\b/g, to: 'text-[#5e6ad2]' },

  // Layout container classes
  { from: /\bminsah-panel\b/g, to: 'bg-[#161824] border border-[#232636] rounded-xl' },
  { from: /\bminsah-control\b/g, to: '' },
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

console.log(`\nCompleted: ${modifiedCount} files updated with ${replacementTotal} token migrations.`);
