# Continue the active Phase 31 layer

Read `AGENTS.md`, run `npm run ai:preflight` and `npm run qa:second-brain`, then inspect `.ai/layer-progress.json`.

Execute only the first item whose status is not `COMPLETE`. Finish its focused gate, update all checkpoint/progress surfaces, and only then continue to the next item. A single session may complete several sequential items, but no item may be skipped and no layer package may be produced before the final layer gate passes.
