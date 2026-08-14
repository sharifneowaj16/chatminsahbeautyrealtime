# Second Brain v4 — Fast, safe coding workflow

The goal is to remove repeated reading, manual checkpoint drift and unnecessary packaging without weakening item gates.

## Start a coding session

```bash
npm run ai:fast-start
```

This proves full repository access, validates Second Brain consistency and prints the exact current work packet.

After startup, do not reread the full roadmap unless the work packet conflicts with source evidence. Use:

```bash
npm run ai:work-packet
npm run ai:work-packet -- --json
npm run ai:work-packet -- --item 6.2
```

## Numbered-item output contract

Every item creates:

```text
evidence/phase31-meta-social-crm/items/phase31_layerX.Y_result.md
evidence/phase31-meta-social-crm/logs/phase31_layerX.Y_gate.log
```

Audit and release-gate items may require an additional roadmap-specific evidence document listed by `npm run ai:work-packet`.

No item ZIP is created.

## Advance an item safely

The helper is dry-run by default:

```bash
npm run ai:advance-item -- \
  --item 6.1 \
  --status COMPLETE \
  --evidence evidence/phase31-meta-social-crm/08-realtime-facebook-audit.md \
  --log evidence/phase31-meta-social-crm/logs/phase31_layer6.1_gate.log
```

After reviewing the preview, add `--apply`. The helper refuses `COMPLETE` when required evidence files are missing. It updates machine state, regenerates human checkpoint files, refreshes hashes and reruns the Second Brain audit.

For a blocked item:

```bash
npm run ai:advance-item -- \
  --item 6.1 \
  --status BLOCKED \
  --blocker "Exact blocker" \
  --log evidence/phase31-meta-social-crm/logs/phase31_layer6.1_gate.log \
  --apply
```

## Layer completion

The final layer item may reach `GATE_PASS_AWAITING_PACKAGE`, but the next layer must not start until the full project ZIP, checksum, verification log and roadmap evidence exist. Fresh-extract verification remains mandatory.

## Safety boundaries

- Current source and same-snapshot executable evidence override prose.
- Schema changes require `migration.sql` and `recovery.sql` in the same numbered item.
- Production wiring tests are required; isolated module tests alone are insufficient.
- Never claim build, database, Redis, realtime or live-provider PASS without executed evidence.
