import 'dotenv/config';

import { metaCapiPurchaseQueue } from '../lib/queue/metaCapiQueue';
import prisma from '../lib/prisma';
import {
  buildTrackingHealthSnapshot,
  persistTrackingHealthCheck,
  sendTrackingHealthAlert,
} from '../lib/tracking/health';

function parseHoursArg() {
  const hoursArg = process.argv.find((arg) => arg.startsWith('--hours='));
  const parsed = hoursArg ? Number.parseInt(hoursArg.split('=')[1] ?? '', 10) : 24;
  if (Number.isNaN(parsed)) return 24;
  return Math.min(Math.max(parsed, 1), 24 * 30);
}

async function main() {
  const windowHours = parseHoursArg();
  const snapshot = await buildTrackingHealthSnapshot({ windowHours });
  const persisted = await persistTrackingHealthCheck(snapshot);
  const alert = await sendTrackingHealthAlert(snapshot);

  console.log(JSON.stringify({
    ok: true,
    healthCheckId: persisted.id,
    status: snapshot.status,
    notes: snapshot.notes,
    metrics: snapshot.metrics,
    alert,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('[TrackingHealthCron] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([
      prisma.$disconnect(),
      metaCapiPurchaseQueue.close(),
    ]);
  });
