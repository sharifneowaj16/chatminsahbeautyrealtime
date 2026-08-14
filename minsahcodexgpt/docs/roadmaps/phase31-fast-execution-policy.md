# Phase 31 Fast Execution Policy — Current Addendum

> **Current authority:** This addendum resolves execution and packaging conflicts in older Phase 31 prompt snapshots.
> **Updated:** 2026-07-26.

## Current checkpoint correction

The earlier fast-prompt snapshot started at Layer 4.2. The current repository evidence is newer:

```text
Completed through: Phase 31 Layer 4.8
Layer 4 status: PASS
Exact next item: Layer 5.1
```

Do not restart Layers 1-4.

## Execution model

- Implement Layer 5 in numbered order: `5.1 → 5.2 → ... → 5.12`.
- Every numbered item has its own focused gate and concise result.
- An AI may continue to the next item in the same session only after the current item gate is complete.
- Do not skip audit, migration, security or release-gate items.
- Keep each item independently traceable in `.ai/layer-progress.json`, evidence and source diff.

## Packaging model

Do not create a ZIP for every numbered item.

At the end of each completed layer, create a complete-project package:

```text
minsahbeauty_phase31_layerN_complete.zip
minsahbeauty_phase31_layerN_complete.zip.sha256
phase31_layerN_verification.log
layer evidence report
```

At Phase 31 final release only:

```text
minsahbeauty_phase31_complete.zip
minsahbeauty_phase31_complete.zip.sha256
phase31_final_verification.log
```

## Focused development loop

For each item:

1. inspect only the needed delta and existing decisions;
2. implement working code or the required audit artifact;
3. run affected tests, static audits and schema checks;
4. record exact PASS/FAIL/BLOCKED results;
5. update the progress/checkpoint surfaces;
6. continue only after the item gate is truthful.

At the layer gate, run all layer tests, cross-layer regressions, migration governance, security/redaction and idempotency/concurrency checks.

## Evidence honesty

Never claim dependency-backed typecheck, lint, build, PostgreSQL, Redis, realtime or live Meta PASS unless the command or provider evidence was actually executed and preserved. Live provider evidence remains separate from static/local checks.
