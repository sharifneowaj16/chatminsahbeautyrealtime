# Coding Phase 0 — Repository and Configuration Foundation

## Goal

Make the new repository safe and reproducible before commerce/UI refactors begin, without modifying Prisma schema, migrations or business logic.

## Implemented

- Restored and expanded `.gitignore`.
- Added `.dockerignore` to prevent secrets, caches and local artifacts entering Docker build context.
- Pinned Node.js `22.16.0` and npm `10.x` across package metadata, local version files, Docker and CI.
- Restored GitHub Actions CI with environment-template, lint, type-check, optional-test, production-build, dependency-security and Docker-build jobs.
- Removed hard-coded public deployment URLs from `next.config.ts`; deployment environments now control `NEXT_PUBLIC_*` values.
- Added a shared environment manifest and production-aware validator.
- Hardened `lib/env.ts` while preserving its existing exported API.
- Expanded `.env.example` into an operational inventory for app, auth, storage, search, payments, couriers, tracking, bots and QA tools.
- Replaced `npx prisma` inside npm scripts/entrypoint with the installed local Prisma binary to avoid accidental network resolution.
- Added canonical lint, type-check and environment-check scripts.

## Explicitly untouched

- `prisma/schema.prisma`
- `prisma/migrations/**`
- Database model definitions
- Order, payment, stock, delivery and tracking business logic

## Delivery sequence

This completed coding phase is delivered as the first serial full-project archive:

`minsah_new_repo_phase1.zip`
