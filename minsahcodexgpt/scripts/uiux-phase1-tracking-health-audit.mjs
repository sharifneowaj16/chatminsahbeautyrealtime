#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pagePath = path.join(root, 'app/admin/tracking-health/page.tsx');
const widgetPath = path.join(root, 'app/admin/tracking-health/TikTokEventsApiHealth.tsx');
const testPath = path.join(root, 'tests/routes/admin-tracking-health-route.test.tsx');
const browserTestPath = path.join(root, 'tests/accessibility/admin-tracking-health-route.spec.ts');
const source = fs.readFileSync(pagePath, 'utf8');
const widgetSource = fs.readFileSync(widgetPath, 'utf8');
const testSource = fs.readFileSync(testPath, 'utf8');
const browserTestSource = fs.readFileSync(browserTestPath, 'utf8');

const lucideImport = widgetSource.match(/import\s*\{([\s\S]*?)\}\s*from\s*['"]lucide-react['"]/);
const importedIcons = lucideImport
  ? lucideImport[1].split(',').map((name) => name.trim()).filter(Boolean)
  : [];

const checks = [
  ['Tracking-health widget imports Target from lucide-react', importedIcons.includes('Target')],
  ['Tracking-health widget renders the Target icon', widgetSource.includes('<Target className=')],
  ['Tracking-health route keeps its default page export', /export default function TrackingHealthPage\s*\(/.test(source)],
  ['Isolated route-section render test exists', fs.existsSync(testPath)],
  ['Render test executes the extracted route section', testSource.includes('renderToStaticMarkup(<TikTokEventsApiHealth')],
  ['Render test asserts the Target icon markup', testSource.includes('lucide-target')],
  ['Browser route-render regression test exists', fs.existsSync(browserTestPath)],
  ['Browser test verifies the dashboard heading', browserTestSource.includes("name: 'Tracking Health Dashboard'")],
  ['Browser test fails on page errors', browserTestSource.includes("page.on('pageerror'") && browserTestSource.includes('expect(pageErrors).toEqual([])')],
];

let failed = 0;
for (const [name, pass] of checks) {
  console.log(`${pass ? '✓' : '✗'} ${name}`);
  if (!pass) failed += 1;
}

console.log(`\nUI/UX Phase 1 audit: ${checks.length - failed}/${checks.length} checks passed`);
if (failed > 0) process.exit(1);
console.log('UI/UX Phase 1 tracking-health blocker fix is present.');
