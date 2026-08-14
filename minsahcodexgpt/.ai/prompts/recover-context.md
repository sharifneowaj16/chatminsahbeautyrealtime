# Context recovery prompt

Do not infer project status from chat history or an archive filename.

Run:

```bash
npm run ai:preflight
npm run ai:status
npm run qa:second-brain
```

Then compare `.ai/project-state.json`, `.ai/layer-progress.json`, `CURRENT_LAYER.md`, `CURRENT_TASK.md`, `phases.md`, `memory.md` and the latest verification log. If they disagree, repair context drift before implementation. Current source and same-snapshot executable evidence have higher priority than prose.
