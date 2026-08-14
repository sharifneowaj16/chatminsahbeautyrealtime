# Build Evidence Contract

Production build evidence is valid only when it is bound to the exact source revision that was tested. A copied console excerpt without source identity is not release evidence.

## Required identity

Record one immutable source identifier:

- the Git commit SHA, with a clean working tree; or
- when a repository archive is the only available source, the SHA-256 of that archive plus the SHA-256 of any applied patch.

Do not claim a command result for a later working copy. Generated Prisma output must be produced from the same `prisma/schema.prisma` revision.

## Required command record

For each command, record:

```text
source_revision: <commit SHA or archive/patch SHA-256>
working_tree_clean: true|false
command: <exact command>
started_at: <ISO-8601 timestamp with timezone>
finished_at: <ISO-8601 timestamp with timezone>
exit_code: <integer>
result: PASS|FAIL|BLOCKED
artifact: <log/report path>
```

The minimum Phase 17/18 closure sequence is:

```bash
npm run db:generate
npm run typecheck
npm run lint
npm test
NODE_OPTIONS=--trace-deprecation npm run build
```

A network failure downloading an official Prisma engine, an out-of-memory termination, or a missing terminal exit code is `BLOCKED`, not `PASS`.

## Redis evidence

Record the deployed Redis protocol without secrets. `redis://` is valid for a protected private service network; `rediss://` is valid for a TLS-enabled endpoint. Final runtime evidence must include a live ping from the same network/container class used by BullMQ workers.
