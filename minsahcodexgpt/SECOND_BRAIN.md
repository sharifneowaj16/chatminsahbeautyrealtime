# SECOND_BRAIN.md — Operating Model v4

Second Brain v4 provides machine-readable work packets, fail-closed advancement and per-layer packaging without relying on chat history.

## Canonical surfaces

| Surface | Purpose |
|---|---|
| `AGENTS.md` | Universal bootstrap and stop conditions |
| `.ai/project-state.json` | Authoritative live checkpoint |
| `.ai/phase31-execution-manifest.json` | Layers 6–9 work packets and artifact contracts |
| `.ai/layer-progress.json` | Current layer item statuses |
| `.ai/context-manifest.json` | Context hashes and repository access evidence |
| `.ai/FAST_WORKFLOW.md` | Fast, evidence-gated command workflow |
| `AI_CONTEXT.md`, `CURRENT_LAYER.md`, `CURRENT_TASK.md` | Generated human-readable context |

Historical chats and archived memories are non-authoritative.

## Fast startup

```bash
npm run ai:fast-start
```

This proves repository access, validates the Second Brain and prints the current machine-readable work packet.

## Execution model

1. Work only on the current numbered item.
2. Run the focused test, audit and combined gate from the work packet.
3. Preserve concise item result and gate log evidence.
4. Advance with `npm run ai:advance-item`; it is dry-run by default and refuses missing evidence.
5. Generate context with `npm run ai:sync-context`.
6. Package only after the full layer gate passes.
7. Fresh-extract the ZIP and rerun acceptance gates before delivery.

## Current checkpoint

```text
Phase 31: IN_PROGRESS
Completed through: Layer 6
Verified archive: minsahbeauty_phase31_layer6_complete.zip
Evidence log: phase31_layer6_verification.log
Active layer: Layer 7
Current item: 9.8 — Final runtime and release gate
```
