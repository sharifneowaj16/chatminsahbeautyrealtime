# Project Second Brain v4

Second Brain v4 provides manifest-driven work packets, fail-closed item advancement, generated human checkpoint surfaces and per-layer packaging.

## Normal commands

```bash
npm run ai:fast-start
npm run ai:work-packet
npm run ai:status
```

## Checkpoint commands

```bash
npm run ai:sync-context
npm run ai:advance-item -- --item 6.1 --status COMPLETE --evidence <path> --log <path>
```

`ai:advance-item` is a dry run unless `--apply` is supplied.

## Files

- `project-state.json` — global live state.
- `phase31-execution-manifest.json` — remaining Phase 31 item contracts.
- `layer-progress.json` — active-layer progress.
- `context-manifest.json` — generated hashes.
- `FAST_WORKFLOW.md` — operating instructions.
- `prompts/` — portable AI prompts.
