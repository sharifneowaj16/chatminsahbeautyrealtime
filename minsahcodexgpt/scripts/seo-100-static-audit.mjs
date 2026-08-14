import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => failures.push(message);
const walk = (dir) => {
  const out = [];
  if (!exists(dir)) return out;
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (['node_modules', '.next', '.git'].includes(entry.name)) continue;
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(rel));
    else if (/\.(ts|tsx|js|jsx|mjs|json)$/.test(entry.name)) out.push(rel);
  }
  return out;
};

if (/['\"]\/_next\/['\"]/.test(read('app/robots.ts'))) {
  fail('robots.ts must not disallow /_next/.');
}

for (const asset of ['public/images/og-default.jpg', 'public/images/logo.png']) {
  if (!exists(asset)) fail(`${asset} is missing.`);
}

const sourceFiles = [...walk('app'), ...walk('lib'), ...walk('components')];
for (const file of sourceFiles) {
  const content = read(file);
  if (/title\s*:\s*['\"][^'\"]*\|\s*Minsah Beauty['\"]/.test(content) && !/title\s*:\s*{\s*absolute/s.test(content)) {
    fail(`${file} contains a page metadata title with manual | Minsah Beauty suffix.`);
  }
}

const footer = read('app/components/Footer.tsx');
for (const banned of ['New York', 'PayPal', 'Visa', 'Mastercard', 'Minsah Beauty 2025']) {
  if (footer.includes(banned)) fail(`Footer still contains banned trust text: ${banned}`);
}

const topBar = read('app/components/TopBar.tsx');
for (const banned of ['/rewards', '/orders/track', '/community']) {
  if (topBar.includes(banned)) fail(`TopBar still links to missing route: ${banned}`);
}

const blog = exists('app/blog/page.tsx') ? read('app/blog/page.tsx') : '';
for (const banned of ['/blog/1', '/blog/2', '/blog/3', '`/blog/${post.id}`']) {
  if (blog.includes(banned)) fail(`Blog still links to missing post route: ${banned}`);
}

const combos = exists('app/combos/page.tsx') ? read('app/combos/page.tsx') : '';
if (/\/combos\/\$\{combo\.id\}|\/combos\/c\d+/.test(combos)) {
  fail('Combos still link to missing combo detail routes.');
}

const sitemap = read('app/sitemap.ts');
for (const privateRoute of ['/search', '/cart', '/checkout', '/login', '/register', '/account', '/wishlist', '/favourites', '/admin', '/test']) {
  if (sitemap.includes(`absoluteUrl('${privateRoute}')`) || sitemap.includes(`absoluteUrl("${privateRoute}")`)) {
    fail(`Sitemap includes private/noindex route: ${privateRoute}`);
  }
}

if (failures.length) {
  console.error('SEO 100 static audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('SEO 100 static audit passed.');
