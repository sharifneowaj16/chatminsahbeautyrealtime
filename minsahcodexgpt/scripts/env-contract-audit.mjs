import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ignored = new Set(['node_modules', '.git', '.next', 'docs']);
const publicSecretPattern = /NEXT_PUBLIC_[A-Z0-9_]*(SECRET|PASSWORD|PRIVATE_KEY|ACCESS_KEY)/;
const credentialPattern = /(postgres(?:ql)?:\/\/[^\s"']+:[^\s"']+@|redis(?:s)?:\/\/[^\s"']+:[^\s"']+@)/i;
const forbiddenFiles = [/^\.env(?:\..+)?$/, /\.pem$/i, /\.key$/i, /(?:dump|backup).*\.(sql|gz)$/i];
const isExampleEnv = (rel) => rel === '.env.example' || rel.endsWith('/.env.example');
const findings = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).replaceAll('\\', '/');
    if (entry.isDirectory()) { walk(full); continue; }
    if (forbiddenFiles.some((re) => re.test(entry.name)) && !isExampleEnv(rel)) {
      findings.push(`${rel}: forbidden secret/runtime file`);
      continue;
    }
    if (!/\.(?:[cm]?[jt]sx?|json|ya?ml|env|example|md|txt|sh|dockerfile)$/i.test(entry.name) && entry.name !== 'Dockerfile') continue;
    const text = fs.readFileSync(full, 'utf8');
    text.split(/\r?\n/).forEach((line, index) => {
      if (publicSecretPattern.test(line) && !/\bpattern\s*:/.test(line)) findings.push(`${rel}:${index + 1}: secret-like NEXT_PUBLIC variable`);
      if (!isExampleEnv(rel) && credentialPattern.test(line)) findings.push(`${rel}:${index + 1}: embedded credential URL`);
    });
  }
}
walk(root);
if (findings.length) {
  console.error('Environment contract audit failed:\n' + findings.map((x) => `- ${x}`).join('\n'));
  process.exit(1);
}
console.log('Environment contract audit passed: no committed runtime env files, credential URLs, or secret-like NEXT_PUBLIC keys found.');
