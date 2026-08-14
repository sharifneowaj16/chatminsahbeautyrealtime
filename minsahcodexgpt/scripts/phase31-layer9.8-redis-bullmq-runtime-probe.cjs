const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const { spawn } = require('child_process');

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error('RUNTIME_PROBE=FAIL');
  console.error('reason=REDIS_URL_NOT_SET');
  process.exit(1);
}

function connection() {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });
}

async function waitFor(fn, timeoutMs = 20000, intervalMs = 250) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await fn();
    if (value) return value;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error('timeout');
}

async function testPing() {
  const r = connection();
  const pong = await r.ping();
  await r.quit();

  if (pong !== 'PONG') throw new Error('redis ping failed');

  console.log('REDIS_PING=PONG');
}

async function testRetry() {
  const queueName = `phase31-9-8-retry-${Date.now()}`;

  const qConn = connection();
  const wConn = connection();

  const queue = new Queue(queueName, { connection: qConn });

  let executions = 0;

  const worker = new Worker(
    queueName,
    async () => {
      executions += 1;
      console.log(`RETRY_EXECUTION=${executions}`);

      if (executions === 1) {
        throw new Error('intentional-first-attempt-failure');
      }

      return { ok: true };
    },
    {
      connection: wConn
    }
  );

  const completed = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('retry completion timeout')),
      20000
    );

    worker.on('completed', job => {
      clearTimeout(timer);
      resolve(job);
    });

    worker.on('failed', (job, err) => {
      if (job && job.attemptsMade >= 2) {
        clearTimeout(timer);
        reject(err);
      }
    });
  });

  const job = await queue.add(
    'retry-probe',
    { marker: 'phase31-layer9.8' },
    {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 500
      },
      removeOnComplete: false,
      removeOnFail: false
    }
  );

  console.log(`RETRY_JOB_ENQUEUED=${job.id}`);

  const finished = await completed;

  if (executions !== 2) {
    throw new Error(`expected 2 executions, got ${executions}`);
  }

  console.log(`RETRY_ATTEMPTS_MADE=${finished.attemptsMade}`);
  console.log('BULLMQ_RETRY=PASS');

  await worker.close();
  await queue.obliterate({ force: true });
  await queue.close();
  await qConn.quit();
  await wConn.quit();
}

async function childCrashWorker(queueName) {
  const conn = connection();

  const worker = new Worker(
    queueName,
    async job => {
      console.log(`CRASH_WORKER_RECEIVED=${job.id}`);

      setTimeout(() => {
        process.exit(73);
      }, 300);

      await new Promise(() => {});
    },
    {
      connection: conn,
      lockDuration: 2000,
      stalledInterval: 1000,
      maxStalledCount: 2
    }
  );

  worker.on('error', err => {
    console.error(`CRASH_WORKER_ERROR=${err.message}`);
  });
}

async function testCrashRecovery() {
  const queueName = `phase31-9-8-recovery-${Date.now()}`;

  const qConn = connection();
  const queue = new Queue(queueName, { connection: qConn });

  const job = await queue.add(
    'crash-recovery-probe',
    { marker: 'phase31-layer9.8' },
    {
      removeOnComplete: false,
      removeOnFail: false
    }
  );

  console.log(`RECOVERY_JOB_ENQUEUED=${job.id}`);

  const child = spawn(
    process.execPath,
    [__filename, '--crash-worker', queueName],
    {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );

  let crashReceived = false;

  child.stdout.on('data', chunk => {
    const text = chunk.toString();
    process.stdout.write(text);

    if (text.includes('CRASH_WORKER_RECEIVED=')) {
      crashReceived = true;
    }
  });

  child.stderr.on('data', chunk => {
    process.stderr.write(chunk.toString());
  });

  await waitFor(() => crashReceived, 10000);

  const exitInfo = await new Promise(resolve => {
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });

  console.log(`CRASH_WORKER_EXIT=${exitInfo.code}`);

  if (exitInfo.code === 0) {
    throw new Error('crash worker unexpectedly exited cleanly');
  }

  const recoveryConn = connection();

  const recoveryWorker = new Worker(
    queueName,
    async recoveredJob => {
      console.log(`RECOVERY_WORKER_RECEIVED=${recoveredJob.id}`);
      return {
        recovered: true
      };
    },
    {
      connection: recoveryConn,
      lockDuration: 2000,
      stalledInterval: 1000,
      maxStalledCount: 2
    }
  );

  const recoveredJob = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('worker recovery timeout')),
      30000
    );

    recoveryWorker.on('stalled', jobId => {
      console.log(`JOB_STALLED=${jobId}`);
    });

    recoveryWorker.on('completed', completedJob => {
      clearTimeout(timer);
      resolve(completedJob);
    });

    recoveryWorker.on('failed', (failedJob, err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  console.log(`RECOVERY_JOB_COMPLETED=${recoveredJob.id}`);
  console.log('BULLMQ_WORKER_CRASH_RECOVERY=PASS');

  await recoveryWorker.close();
  await queue.obliterate({ force: true });
  await queue.close();
  await qConn.quit();
  await recoveryConn.quit();
}

async function main() {
  if (process.argv[2] === '--crash-worker') {
    return childCrashWorker(process.argv[3]);
  }

  console.log('=== PHASE31 LAYER9.8 REDIS/BULLMQ LIVE RUNTIME PROBE ===');

  await testPing();
  await testRetry();
  await testCrashRecovery();

  console.log('RUNTIME_PROBE_EXECUTED=true');
  console.log('REDIS_BULLMQ_RUNTIME=PASS');
}

main().catch(err => {
  console.error(`RUNTIME_PROBE_ERROR=${err.message}`);
  console.error('REDIS_BULLMQ_RUNTIME=FAIL');
  process.exit(1);
});
