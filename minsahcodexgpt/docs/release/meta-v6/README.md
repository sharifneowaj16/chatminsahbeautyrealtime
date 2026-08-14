# Meta v6 Phase Evidence Template

**Phase:**  
**Branch:**  
**Owner:**  
**Started:**  
**Completed:**  
**Manifest status:**  

## Scope

## Changed files

## Schema and migration evidence

## Automated gate evidence

```text
Paste secret-free command summaries here.
```

## Semantic fixtures and snapshots

## Security and privacy negative tests

## Runtime Meta evidence

State `Not applicable` only when the phase manifest does not require runtime evidence.

## Rollback / forward-fix plan

## Open risks

## Acceptance criteria sign-off

- [ ] Every acceptance criterion mapped to evidence
- [ ] Typecheck/lint/tests/build as required
- [ ] Migration applied in disposable environment
- [ ] No secrets or raw PII in evidence
- [ ] Manifest state updated

## Post-spec production closure

`npm run qa:meta-v6-phase16` validates the Phase 16 closure controls. Capture fresh source-bound command evidence with `npm run capture:meta-v6-command-evidence`, generate the evidence-only production report, then run `npm run qa:meta-v6-closure-status -- --write` to ensure every blocker has an owner and completion rule.
