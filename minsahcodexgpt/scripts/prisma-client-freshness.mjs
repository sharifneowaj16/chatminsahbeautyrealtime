import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');
const generatedDir = path.join(projectRoot, 'generated', 'prisma');
const clientPath = path.join(generatedDir, 'client.ts');
const stampPath = path.join(generatedDir, '.schema.sha256');

const schema = await readFile(schemaPath);
const digest = createHash('sha256').update(schema).digest('hex');

if (process.argv.includes('--write')) {
  await mkdir(generatedDir, { recursive: true });
  await readFile(clientPath);
  await writeFile(stampPath, `${digest}\n`, 'utf8');
  console.log(`Stamped generated Prisma client for schema ${digest.slice(0, 12)}.`);
  process.exit(0);
}

let storedDigest;
try {
  await readFile(clientPath);
  storedDigest = (await readFile(stampPath, 'utf8')).trim();
} catch {
  console.error('Generated Prisma client is missing. Run `npm run db:generate` in an environment that can generate Prisma Client.');
  process.exit(1);
}

if (storedDigest !== digest) {
  console.error('Generated Prisma client is stale for prisma/schema.prisma. Run `npm run db:generate` and commit the refreshed generated/prisma snapshot.');
  process.exit(1);
}

console.log(`Generated Prisma client matches schema ${digest.slice(0, 12)}.`);
