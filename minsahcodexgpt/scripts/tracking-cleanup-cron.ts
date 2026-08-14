import 'dotenv/config';

import { metaCapiPurchaseQueue } from '../lib/queue/metaCapiQueue';
import prisma from '../lib/prisma';
import { runTrackingFailureCleanup } from '../lib/tracking/failure-retention';
import { cleanupExpiredTelegramActionTokens } from '../lib/telegram/action-tokens';

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function parseLimitArg() {
  const arg = process.argv.find((value) => value.startsWith('--limit='));
  const parsed = arg ? Number.parseInt(arg.split('=')[1] ?? '', 10) : undefined;
  if (!parsed || Number.isNaN(parsed)) return undefined;
  return Math.min(Math.max(parsed, 1), 10_000);
}

async function main() {
  const dryRun = hasFlag('--dry-run') || hasFlag('--dryRun');
  const limit = parseLimitArg();
  const result = await runTrackingFailureCleanup({
    dryRun,
    limit,
  });

  const telegram = dryRun
    ? { skipped: true, reason: 'DRY_RUN' }
    : { deletedActionTokens: await cleanupExpiredTelegramActionTokens({ limit }) };

  console.log(JSON.stringify({ ...result, telegram }, null, 2));
}

main()
  .catch((error) => {
    console.error('[TrackingCleanupCron] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([
      prisma.$disconnect(),
      metaCapiPurchaseQueue.close(),
    ]);
  });
