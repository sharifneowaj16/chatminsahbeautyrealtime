#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const checks = [];
const check = (name, passed, details = '') => checks.push({ name, passed, details });
const hasAll = (text, parts) => parts.every((part) => text.includes(part));

const searchRoute = read('app/api/search/route.ts');
const indexing = read('lib/elasticsearch/indexing.ts');
const searchPage = read('app/(storefront)/search/page.tsx');
const highlightComponentPath = 'components/search/SearchHighlight.tsx';
const highlightComponent = exists(highlightComponentPath) ? read(highlightComponentPath) : '';

check(
  'Search API highlight uses Elasticsearch HTML encoder',
  /highlight:\s*{[\s\S]*encoder:\s*['"]html['"][\s\S]*pre_tags:\s*\[['"]<mark>['"]\][\s\S]*post_tags:\s*\[['"]<\/mark>['"]\]/.test(searchRoute),
  'Expected highlight.encoder = html with mark wrappers in app/api/search/route.ts'
);

check(
  'Secondary Elasticsearch search helper highlight uses HTML encoder',
  /highlight:\s*{[\s\S]*encoder:\s*['"]html['"][\s\S]*fields:\s*{\s*name:\s*{}\s*,\s*description:\s*{}\s*}/.test(indexing),
  'Expected encoder: html in lib/elasticsearch/indexing.ts helper search highlight config'
);

check(
  'Search page imports safe SearchHighlight component',
  hasAll(searchPage, ["@/components/search/SearchHighlight", '<SearchHighlight html={product.highlighted?.name} fallback={product.name} />'])
);

check(
  'Search page does not inject search highlight HTML directly',
  !searchPage.includes('dangerouslySetInnerHTML') && !searchPage.includes('HighlightedText html='),
  'Search highlights must not use dangerouslySetInnerHTML on app/(storefront)/search/page.tsx'
);

check(
  'Safe highlight component exists',
  Boolean(highlightComponent),
  `Missing ${highlightComponentPath}`
);

check(
  'Safe highlight component has no raw HTML injection path',
  Boolean(highlightComponent) &&
    !highlightComponent.includes('dangerouslySetInnerHTML') &&
    !highlightComponent.includes('__html') &&
    !highlightComponent.includes('DOMParser') &&
    !highlightComponent.includes('innerHTML')
);

check(
  'Safe highlight component only treats mark/em wrappers as formatting',
  hasAll(highlightComponent, [
    'HIGHLIGHT_TAG_PATTERN',
    '<\\/?(?:mark|em)>',
    "tag === '<mark>'",
    "tag === '<em>'",
    '<mark key={key}>{text}</mark>',
    '<em key={key}>{text}</em>',
  ])
);

check(
  'Safe highlight component decodes escaped source text as React text nodes',
  hasAll(highlightComponent, ['decodeHighlightEntities', 'String.fromCodePoint', 'nodes.push(text)']),
  'Escaped source text should be decoded into React text, not parsed as HTML'
);

let failed = 0;
for (const item of checks) {
  if (item.passed) {
    console.log(`PASS: ${item.name}`);
  } else {
    failed += 1;
    console.error(`FAIL: ${item.name}${item.details ? ` — ${item.details}` : ''}`);
  }
}

if (failed > 0) {
  console.error(`\nSearch highlight XSS audit failed: ${failed}/${checks.length} checks failed.`);
  process.exit(1);
}

console.log(`\nSearch highlight XSS audit passed: ${checks.length}/${checks.length} checks passed.`);
