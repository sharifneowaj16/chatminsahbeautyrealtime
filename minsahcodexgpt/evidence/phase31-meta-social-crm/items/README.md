# Phase 31 numbered-item evidence contract

Every numbered item produces reproducible evidence without micro-packaging.

Required pattern:

```text
evidence/phase31-meta-social-crm/items/phase31_layerX.Y_result.md
evidence/phase31-meta-social-crm/logs/phase31_layerX.Y_gate.log
```

The result file records scope, changed files, commands, schema/migration status, blockers and exact next item. The gate log preserves exact command output. Audit and layer-gate items may require an additional roadmap-specific evidence document.

No `layerX.Y_complete.zip` is produced. Full-project packaging occurs only after the completed layer gate.
