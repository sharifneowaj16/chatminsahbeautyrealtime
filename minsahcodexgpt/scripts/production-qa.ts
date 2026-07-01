import 'dotenv/config';

process.env.PRODUCTION_QA_CLI = 'true';

import prisma from '../lib/prisma';
import { metaCapiPurchaseQueue } from '../lib/queue/metaCapiQueue';
import { buildProductionQaSnapshot } from '../lib/tracking/production-qa';

function parseHoursArg() {
  const hoursArg = process.argv.find((arg) => arg.startsWith('--hours='));
  const parsed = hoursArg ? Number.parseInt(hoursArg.split('=')[1] ?? '', 10) : 24;
  if (Number.isNaN(parsed)) return 24;
  return Math.min(Math.max(parsed, 1), 24 * 30);
}

async function main() {
  const snapshot = await buildProductionQaSnapshot({ windowHours: parseHoursArg() });

  console.log(JSON.stringify({
    ok: true,
    status: snapshot.status,
    checkedAt: snapshot.checkedAt,
    summary: snapshot.summary,
    blockers: snapshot.checks.filter((check) => check.severity === 'BLOCKER'),
    warnings: snapshot.checks.filter((check) => check.severity === 'WARN'),
  }, null, 2));

  if (snapshot.status === 'BLOCKED') {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('[ProductionQA] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([
      prisma.$disconnect(),
      metaCapiPurchaseQueue.close(),
    ]);
  });
