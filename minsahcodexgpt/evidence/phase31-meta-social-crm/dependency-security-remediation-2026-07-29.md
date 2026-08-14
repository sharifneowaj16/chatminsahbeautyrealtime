# Dependency security remediation — 2026-07-29

## Scope and guardrails

- Main application and `realtime-service` package manifests/lockfiles.
- Exact verification toolchain: Node.js `22.16.0`, npm `10.9.2`.
- Prisma schema change: none; schema SHA-256 remains `d3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce`.
- No `npm audit fix --force` or incompatible major override was applied.

## Main application

Updated Next.js to `16.2.12`, next-auth to `4.24.15`, Prisma client/adapter/CLI to `7.9.1`, Sharp to `0.35.3`, concurrently to `9.2.4`, and the Next PostCSS override to `8.5.24`. Next's Sharp copy is deduped to the root `0.35.3`. Patched transitive production leaves include `fast-xml-parser 5.10.1`, `fast-uri 3.1.4`, `valibot 1.4.2`, and `shell-quote 1.9.0`.

Executed outcomes:

- Clean `npm ci`: PASS; 658 packages installed; Prisma freshness postinstall PASS.
- `npm run db:generate`: PASS; Prisma Client `7.9.1` generated and stamped.
- Current full install audit summary: `9 high` package records.
- Local production-tree check for the residual lint chain: empty.
- Full lint: PASS with `0 errors, 490 warnings`.

The resolved residual is the dev-only ESLint/Next lint path ending at `minimatch@3.1.5 -> brace-expansion@1.1.16`. The patched parallel TypeScript-ESLint branch uses `minimatch@10.2.4 -> brace-expansion@5.0.8`. A forced override is unsafe because the old and new packages expose incompatible CommonJS APIs; wait for compatible upstream ESLint/Next plugin releases.

## Realtime service

Updated Prisma client/adapter/CLI to `7.9.1`, Express to `4.22.2`, `ws` to `8.21.1`, and overrode esbuild to `0.28.1`. Refreshed MinIO XML dependencies to `fast-xml-parser 5.10.1` and `fast-xml-builder 1.3.0`.

Executed outcomes:

- Clean `npm --prefix realtime-service ci`: PASS; 284 packages installed; `0 vulnerabilities` reported.
- Frozen realtime typecheck: PASS, dependency-backed.
- Frozen realtime build: PASS, dependency-backed.
- Graph isolation and Facebook cutover focused tests: PASS.

## Release boundary

Dependency remediation is complete. Phase 31 release remains BLOCKED for independent main-source TypeScript errors, disposable PostgreSQL proof, live Redis/BullMQ recovery proof, authentic live Meta evidence, and final-package reproducibility. The Next production build completes webpack compilation before the TypeScript gate fails.

## Local residual-tree proof

### Full development tree (`exit 0`)

`	ext
minsah-beauty@2.0.0 D:\minsahbeauty Meta\minsahbeauty_phase31_final_blocked_state_delivery\PROJECT\minsahbeauty-meta-v6-update
+-- eslint-config-next@16.2.12
| +-- eslint-import-resolver-typescript@3.10.1
| | +-- eslint-plugin-import@2.32.0 deduped
| | `-- eslint@9.39.4 deduped
| +-- eslint-plugin-import@2.32.0
| | +-- eslint@9.39.4 deduped
| | `-- minimatch@3.1.5 deduped
| +-- eslint-plugin-jsx-a11y@6.10.2
| | +-- eslint@9.39.4 deduped
| | `-- minimatch@3.1.5 deduped
| +-- eslint-plugin-react-hooks@7.0.1
| | `-- eslint@9.39.4 deduped
| +-- eslint-plugin-react@7.37.5
| | +-- eslint@9.39.4 deduped
| | `-- minimatch@3.1.5 deduped
| +-- eslint@9.39.4 deduped
| `-- typescript-eslint@8.57.2
|   +-- @typescript-eslint/eslint-plugin@8.57.2
|   | +-- @typescript-eslint/type-utils@8.57.2
|   | | `-- eslint@9.39.4 deduped
|   | `-- eslint@9.39.4 deduped
|   +-- @typescript-eslint/parser@8.57.2
|   | `-- eslint@9.39.4 deduped
|   +-- @typescript-eslint/typescript-estree@8.57.2
|   | `-- minimatch@10.2.4
|   |   `-- brace-expansion@5.0.8
|   +-- @typescript-eslint/utils@8.57.2
|   | `-- eslint@9.39.4 deduped
|   `-- eslint@9.39.4 deduped
`-- eslint@9.39.4
  +-- @eslint-community/eslint-utils@4.9.1
  | `-- eslint@9.39.4 deduped
  +-- @eslint/config-array@0.21.2
  | `-- minimatch@3.1.5 deduped
  +-- @eslint/eslintrc@3.3.5
  | `-- minimatch@3.1.5 deduped
  `-- minimatch@3.1.5
    `-- brace-expansion@1.1.16

```

### Production tree (`--omit=dev`; npm reports empty with exit 1)

`	ext
minsah-beauty@2.0.0 D:\minsahbeauty Meta\minsahbeauty_phase31_final_blocked_state_delivery\PROJECT\minsahbeauty-meta-v6-update
`-- (empty)

```