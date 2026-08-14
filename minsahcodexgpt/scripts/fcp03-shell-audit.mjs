import { spawnSync } from 'node:child_process';

const result = spawnSync(
  process.execPath,
  ['--import', 'tsx', '--test', 'tests/fcp03/*.test.ts'],
  { stdio: 'inherit', shell: true },
);

if (result.status !== 0) process.exit(result.status ?? 1);
console.log('FCP-03 shell architecture audit passed.');
