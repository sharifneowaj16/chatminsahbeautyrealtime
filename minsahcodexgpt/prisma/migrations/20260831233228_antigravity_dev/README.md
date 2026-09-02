# Migration: 20260831233228_antigravity_dev

## Reason & Summary
Manual recovery script for failed migration: `20260831233228_antigravity_dev`.
Original migration ran in a single transaction and encountered a failure partway (duplicate column on `Order`), which rolled back uncommitted statements.
The accompanying `recovery.sql` is idempotent (`IF EXISTS` / `IF NOT EXISTS` / `DO` blocks) to safely apply only missing DDL changes.

## Resolution
After manual recovery execution:
```bash
npx prisma migrate resolve --applied "20260831233228_antigravity_dev"
```
