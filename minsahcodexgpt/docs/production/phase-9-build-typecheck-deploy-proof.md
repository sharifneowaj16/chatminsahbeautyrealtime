# Phase 9 — Build / Typecheck / Deploy Proof

## Goal

Phase 9 proves that the Phase 1–8 security/tracking/runtime hardening is not only statically green, but also deployable as a clean production Next.js project.

## No-Go rule

Do not deploy if any of these commands fail in the production-like CI/deploy environment:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run lint
npm run typecheck
npm run build
npm run qa:predeploy
```

For live tracking/runtime readiness, run the deploy gate with a real Redis connection:

```bash
TRACKING_DEPLOY_GATE_LIVE_REDIS=true npm run qa:tracking-deploy-gate
```

For search production verification, run:

```bash
SEARCH_PRODUCTION_BASE_URL=https://your-production-domain.com npm run search:production-smoke
SEARCH_PRODUCTION_BASE_URL=https://your-production-domain.com npm run qa:phase30
```

## Required execution order

1. Install dependencies from lockfile:

```bash
npm ci
```

2. Generate Prisma client. This step may need access to Prisma engine binaries from `binaries.prisma.sh` unless your deploy image/cache already contains them:

```bash
npx prisma generate
```

3. Apply database migrations before serving new code:

```bash
npx prisma migrate deploy
```

4. Run lint/typecheck/build:

```bash
npm run lint
npm run typecheck
npm run build
```

5. Run the full predeploy gate:

```bash
npm run qa:predeploy
```

6. Start production only after all gates are green:

```bash
npm run start
```

## Sandbox limitation observed

In the audit sandbox, `npx prisma generate` could not complete because the environment had no internet access and Prisma attempted to download schema-engine metadata from `binaries.prisma.sh`.

That is a sandbox/runtime dependency limitation, not proof that production will fail. Production CI must either:

- allow Prisma engine binary download during dependency/generate step, or
- provide a deploy image/cache where the required Prisma engines are already available.

## Expected proof artifacts

Capture and attach logs for:

- `node --version`
- `npm --version`
- `npm ci`
- `npx prisma generate`
- `npx prisma migrate deploy`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run qa:predeploy`
- `TRACKING_DEPLOY_GATE_LIVE_REDIS=true npm run qa:tracking-deploy-gate`
- `SEARCH_PRODUCTION_BASE_URL=... npm run search:production-smoke`

## Rollback rule

If migration succeeds but build/deploy fails, do not keep serving a mixed app/database state. Roll back the app to the previous production image and review whether a database rollback or compensating migration is needed.
