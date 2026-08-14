const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

(async () => {
  const queueName = `phase31-layer9-8-smoke-${Date.now()}`;

  const queueConn = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });

  const workerConn = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });

  const queue = new Queue(queueName, {
    connection: queueConn
  });

  const worker = new Worker(
    queueName,
    async (job) => {
      console.log(`WORKER_RECEIVED=${job.id}`);
      return { ok: true };
    },
    {
      connection: workerConn
    }
  );

  const completed = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('BullMQ completion timeout'));
    }, 15000);

    worker.once('completed', (job) => {
      clearTimeout(timer);
      console.log(`JOB_COMPLETED=${job.id}`);
      resolve();
    });

    worker.once('failed', (job, err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  const job = await queue.add(
    'phase31-runtime-smoke',
    { marker: 'phase31-layer9.8' },
    {
      removeOnComplete: true,
      removeOnFail: true
    }
  );

  console.log(`JOB_ENQUEUED=${job.id}`);

  await completed;

  await worker.close();
  await queue.close();
  await queueConn.quit();
  await workerConn.quit();

  console.log('BULLMQ_RUNTIME_SMOKE=PASS');
})().catch((err) => {
  console.error('BULLMQ_RUNTIME_SMOKE=FAIL');
  console.error(err.message);
  process.exit(1);
});
