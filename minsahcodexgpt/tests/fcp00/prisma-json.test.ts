import assert from 'node:assert/strict';
import { toPrismaInputJson } from '../../lib/prisma-json';

assert.deepEqual(toPrismaInputJson({ title: 'Hero', enabled: true, order: 1, items: [null, 'x'] }), {
  title: 'Hero', enabled: true, order: 1, items: [null, 'x'],
});
assert.throws(() => toPrismaInputJson({ missing: undefined }), /contains undefined/);
assert.throws(() => toPrismaInputJson({ createdAt: new Date() }), /Date instance/);
assert.throws(() => toPrismaInputJson({ invalid: Number.NaN }), /non-finite number/);
assert.throws(() => toPrismaInputJson(new (class Config {})()), /class instance/);
console.log('FCP-00 Prisma JSON converter tests passed.');
