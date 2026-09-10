import fs from 'fs';
import path from 'path';

const TARGET_DIRS = [
  path.join(process.cwd(), 'app', 'admin'),
  path.join(process.cwd(), 'app', 'components', 'admin'),
  path.join(process.cwd(), 'components', 'admin'),
];

// Mapping of legacy hex/tokens to Magic Blue tokens
const REPLACEMENTS = [
  // Old backgrounds -> Magic Blue workspace / canvas / panel
  { from: /#08090A/gi, to: '#10121b' },
  { from: /#0B0C0E/gi, to: '#090a0f' },
  { from: /#141518/gi, to: '#10121b' },
  { from: /#151516/gi, to: '#161824' },
  { from: /#18191D/gi, to: '#161824' },
  { from: /#1C1D1F/gi, to: '#1b1e2c' },
  { from: /#24262E/gi, to: '#232636' },
  { from: /#0D0E11/gi, to: '#10121b' },
  { from: /#121316/gi, to: '#161824' },
  // Old border/divider utilities
  { from: /border-white\/\[0\.08\]/g, to: 'border-[#232636]' },
  { from: /border-white\/\[0\.06\]/g, to: 'border-[#232636]' },
  { from: /border-white\/\[0\.07\]/g, to: 'border-[#232636]' },
  { from: /border-white\/\[0\.1\]/g, to: 'border-[#232636]' },
  { from: /divide-white\/\[0\.08\]/g, to: 'divide-[#232636]' },
  { from: /divide-white\/\[0\.06\]/g, to: 'divide-[#232636]' },
  { from: /divide-white\/\[0\.1\]/g, to: 'divide-[#232636]' },
  // Focus rings
  { from: /focus:ring-white\/20\/40/g, to: 'focus:ring-1 focus:ring-[#5e6ad2]' },
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
