import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('MCP-08A: purge deceptive compare-at price (* 1.2) and default stock (100) from SeedHeroBuyBox', () => {
  const filePath = path.resolve(
    'app/(storefront)/products/[id]/components/hero/SeedHeroBuyBox.tsx'
  );
  const content = fs.readFileSync(filePath, 'utf8');

  // Verify fictitious markup * 1.2 is completely gone
  assert.equal(
    content.includes('* 1.2'),
    false,
    'SeedHeroBuyBox must not synthesize compare-at price with * 1.2'
  );

  // Verify fake default stock = 100 is completely gone
  assert.equal(
    content.includes('?? 100'),
    false,
    'SeedHeroBuyBox must not default stock to 100'
  );
});

test('MCP-08A: purge synthetic 5.0 rating and fake distribution from ProductClient', () => {
  const filePath = path.resolve(
    'app/(storefront)/products/[id]/components/ProductClient.tsx'
  );
  const content = fs.readFileSync(filePath, 'utf8');

  // Verify synthetic 5.0 fallback is gone
  assert.equal(
    content.includes('|| 5.0') || content.includes('|| 5'),
    false,
    'ProductClient must not invent synthetic 5.0 rating fallback'
  );

  // Verify fake 5-star distribution is gone
  assert.equal(
    content.includes('5: rating?.total'),
    false,
    'ProductClient must not invent 100% 5-star distribution'
  );
});

test('MCP-08A: purge mock defaultShopProducts from ProductShopDrawer', () => {
  const filePath = path.resolve(
    'app/(storefront)/products/[id]/components/ProductShopDrawer.tsx'
  );
  const content = fs.readFileSync(filePath, 'utf8');

  // Verify mock products array is deleted
  assert.equal(
    content.includes('defaultShopProducts'),
    false,
    'ProductShopDrawer must not contain or use mock defaultShopProducts'
  );
});
