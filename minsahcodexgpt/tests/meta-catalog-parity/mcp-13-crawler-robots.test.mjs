import test from 'node:test';
import assert from 'node:assert/strict';
import robots from '../../app/robots.ts';

test('MCP-13: robots.ts explicitly whitelists Meta crawlers for catalog feed and product pages', () => {
  const config = robots();

  assert.ok(config);
  assert.ok(Array.isArray(config.rules));
  assert.ok(config.rules.length >= 2);

  // 1. Meta crawler dedicated rule
  const metaRule = config.rules.find((r) =>
    Array.isArray(r.userAgent) &&
    r.userAgent.includes('facebookexternalhit') &&
    r.userAgent.includes('Facebot')
  );

  assert.ok(metaRule, 'Dedicated Meta crawler rule must exist');
  assert.deepEqual(metaRule.userAgent, [
    'facebookexternalhit',
    'Facebot',
    'meta-externalagent',
    'meta-externalfetcher',
  ]);

  // Allowed paths must include catalog feed and product pages
  assert.ok(metaRule.allow.includes('/api/meta/catalog/feed'), 'Must allow /api/meta/catalog/feed');
  assert.ok(metaRule.allow.includes('/products/'), 'Must allow /products/');
  assert.ok(metaRule.allow.includes('/'), 'Must allow root');
  assert.ok(metaRule.disallow.includes('/admin/'), 'Must disallow admin');

  // 2. Generic rule check
  const genericRule = config.rules.find((r) => r.userAgent === '*');
  assert.ok(genericRule, 'Generic user-agent * rule must exist');
  assert.ok(genericRule.disallow.includes('/api/'), 'Generic crawlers remain disallowed on /api/');

  // 3. Sitemap verification
  assert.ok(config.sitemap.includes('/sitemap.xml'));
});
