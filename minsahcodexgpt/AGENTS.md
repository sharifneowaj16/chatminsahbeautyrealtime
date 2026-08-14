# AGENTS.md — Mandatory AI Bootstrap for Minsah Beauty

This is the universal entry point for ChatGPT, Codex, Claude, Gemini, Copilot, Cursor and other coding agents.

## STOP: prove full repository access

Extract the complete ZIP and use `minsahbeauty-meta-v6-update/` as the repository root. Do not treat a preview of this file as the repository.

Run:

```bash
npm run ai:fast-start
```

This runs repository preflight, Second Brain validation and prints the machine-readable current work packet. If it cannot run, stop and report the exact filesystem/tooling limitation.

## Required source order

1. `.ai/project-state.json`
2. `.ai/phase31-execution-manifest.json`
3. `.ai/context-manifest.json`
4. `SECOND_BRAIN.md`
5. `AI_CONTEXT.md`
6. `CURRENT_LAYER.md`
7. `CURRENT_TASK.md`
8. `PRD.md`, `architecture.md`, `rules.md`, `phases.md`
9. active roadmap/evidence and affected source/tests/schema

## Current verified checkpoint

```text
Project: Minsah Beauty main project
Active phase: Phase 31
Completed through: Layer 6
Verified archive: minsahbeauty_phase31_layer6_complete.zip
Evidence log: phase31_layer6_verification.log
Active layer: Layer 7
Current item: 9.8 — Final runtime and release gate
Packaging: full project package after the active layer release gate, not after every item
```

## Mandatory execution rules

- Do not restart or rewrite verified Layers 1-6.
- Process numbered items sequentially; never skip an item gate.
- Use `npm run ai:work-packet` for exact scope and command contract.
- Use `npm run ai:advance-item` only after required evidence exists; it is dry-run by default.
- Any Prisma schema change requires `migration.sql` and `recovery.sql` in the same item.
- Never claim typecheck, lint, build, PostgreSQL, Redis, WebSocket, provider or production PASS without executed evidence.
- Preserve legacy paths until feature-flagged cutover and rollback proof exist.
- Never store raw tokens, webhook secrets, unsafe payloads or unclassified PII.
- Do not create per-item ZIPs. Package only after the full layer gate.

When checkpoint state changes, update machine state and run:

```bash
npm run ai:sync-context
npm run qa:second-brain
```
