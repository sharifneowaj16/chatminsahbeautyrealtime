import fs from 'node:fs';

const checks = [];
function check(label, condition) {
  checks.push({ label, ok: Boolean(condition) });
}
function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function exists(path) {
  return fs.existsSync(path);
}

const schema = read('prisma/schema.prisma');
const migrationPath = 'prisma/migrations/20260708000000_add_checkout_order_idempotency/migration.sql';
const migration = exists(migrationPath) ? read(migrationPath) : '';
const orderRoute = read('app/api/orders/route.ts');
const checkout = read('app/checkout/page.tsx');
const helper = read('lib/checkout-idempotency.ts');
const pkg = JSON.parse(read('package.json'));

check('Order schema stores checkout idempotency key', schema.includes('checkoutIdempotencyKey String?'));
check('Order schema stores checkout payload hash', schema.includes('checkoutPayloadHash    String?'));
check('Order schema has user+idempotency unique guard', schema.includes('@@unique([userId, checkoutIdempotencyKey])'));
check('Order schema indexes idempotency key lookup', schema.includes('@@index([checkoutIdempotencyKey])'));
check('migration adds idempotency key column', migration.includes('ADD COLUMN "checkoutIdempotencyKey" TEXT'));
check('migration adds payload hash column', migration.includes('ADD COLUMN "checkoutPayloadHash" TEXT'));
check('migration creates DB unique index for same user/key', migration.includes('CREATE UNIQUE INDEX "Order_userId_checkoutIdempotencyKey_key"'));
check('idempotency helper validates required header', helper.includes('IDEMPOTENCY_KEY_REQUIRED') && helper.includes('readCheckoutIdempotencyKey'));
check('idempotency helper hashes stable payload', helper.includes('stableSerialize') && helper.includes('sha256'));
check('order API requires Idempotency-Key before order create', orderRoute.includes('readCheckoutIdempotencyKey(request)'));
check('order API hashes normalized checkout payload', orderRoute.includes('hashCheckoutIdempotencyPayload') && orderRoute.includes('checkoutPayloadHash'));
check('order API returns existing order on same key/hash replay', orderRoute.includes('idempotentReplay: true') && orderRoute.includes('existingOrder.checkoutPayloadHash !== checkoutPayloadHash'));
check('order API rejects same key with different payload', orderRoute.includes('IDEMPOTENCY_PAYLOAD_MISMATCH') && orderRoute.includes('{ status: 409 }'));
check('order API stores key and hash on created order', orderRoute.includes('checkoutIdempotencyKey,') && orderRoute.includes('checkoutPayloadHash,'));
check('order API handles concurrent unique race with replay lookup', orderRoute.includes('Prisma.PrismaClientKnownRequestError') && orderRoute.includes('error.code === "P2002"'));
check('checkout client generates idempotency key', checkout.includes('createCheckoutIdempotencyKey') && checkout.includes('crypto.randomUUID'));
check('checkout client persists key across retry', checkout.includes('checkoutIdempotencyKeyRef') && checkout.includes('checkoutIdempotencyKeyRef.current || createCheckoutIdempotencyKey()'));
check('checkout client sends Idempotency-Key header', checkout.includes('"Idempotency-Key": idempotencyKey'));
check('checkout client resets key after successful order handoff', checkout.includes('checkoutIdempotencyKeyRef.current = null;') && checkout.includes('router.push(nextURL)'));
check('package exposes phase6 idempotency audit script', pkg.scripts?.['qa:phase6-idempotency'] === 'node scripts/phase6-checkout-idempotency-audit.mjs');

for (const item of checks) {
  console.log(`${item.ok ? '✅' : '❌'} ${item.label}`);
}

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`\nPhase 6 checkout idempotency audit failed: ${failed.length}/${checks.length} checks failed.`);
  process.exit(1);
}

console.log(`\nPhase 6 checkout idempotency audit: ${checks.length}/${checks.length} checks passed.`);
