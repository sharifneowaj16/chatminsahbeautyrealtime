# Phase 31 Layer 5.5 — Instagram Legacy/Domain Audit

## Authoritative production paths

| Path | Current authority | Layer 5 disposition |
|---|---|---|
| Meta Instagram webhook route → `receiveInstagramWebhookEvents` → receipt/queue | `lib/meta/instagram/service.ts` | `MIGRATE` to domain ingress adapter; preserve receipt durability |
| Instagram queue worker → `processInstagramWebhookReceipt` | `lib/meta/instagram/messages.ts` | `MIGRATE` to 5.6 inbound domain; legacy implementation becomes rollback-only |
| Admin reply route → `sendInstagramReply` → outbound queue | `lib/meta/instagram/messages.ts` | `MIGRATE` to 5.7/5.8 request domains |
| Instagram queue worker → `executeInstagramReplyAttempt` | `lib/meta/instagram/messages.ts` | `MIGRATE` to 5.7/5.8 execution domains |
| Attachment scheduling → social attachment validation queue | worker plus `messages.ts` | `MIGRATE` to 5.9 media policy/domain |
| Conversation read/update/link routes | `lib/meta/instagram/conversations.ts` | `WRAP`; storage/admin adapter, not provider-write authority |
| Participant profile Graph read | `lib/meta/instagram/profiles.ts` | `WRAP` behind inbound identity/profile dependency |
| Direct provider send Graph write | `messages.ts#sendProviderReply` | `MIGRATE`; shared transport called only by outbound domains |
| Receipt recovery/retention | `messages.ts` | `WRAP`, then move after domain cutover |
| Realtime publishers | `lib/meta/instagram/realtime.ts` | `WRAP` as side-effect dependency with dedupe guard |

## Module inventory and classification

| Module | Classification | Target |
|---|---|---|
| `assignment.ts` | `WRAP` | conversation administration adapter |
| `attachments.ts` | `MIGRATE` | 5.9 media policy |
| `conversations.ts` | `WRAP` | domain repository/admin adapter |
| `messages.ts` | `MIGRATE` | 5.6–5.9 split |
| `policy.ts` | `MIGRATE` | 5.7/5.8 policy primitives |
| `profiles.ts` | `WRAP` | inbound participant resolver |
| `realtime.ts` | `WRAP` | deduplicated side-effect publisher |
| `service.ts` | `MIGRATE` | inbound receipt handoff adapter |
| `types.ts` | `MIGRATE` | platform domain contracts |
| `verify.ts` | `WRAP` | webhook transport compatibility |
| `webhook.ts` | `MIGRATE` | 5.6 inbound normalization |

## Direct Graph use

- `profiles.ts`: participant/profile read.
- `messages.ts#sendProviderReply`: standard message write to `/{accountId}/messages` and private reply write to `/{commentId}/private_replies`.
- No other Instagram module performs a provider Graph call.

## Existing policy and persistence behavior

- Standard reply window: 24 hours from last inbound activity.
- Private reply window: seven days, one-shot reservation/persistence, and comment source required.
- Existing outbound execution has durable attempts, execution-time policy checks, write-kill checks, provider IDs, unknown-outcome state and reconciliation markers.
- Existing inbound storage uses provider message IDs and receipt event keys, but attachment scheduling and realtime publication happen after persistence without a single domain side-effect claim. A duplicate receipt can therefore revisit side effects unless the new domain explicitly gates them.
- Existing reply request validation relies on route `requiredString` and service trimming; 5.7/5.8 must make whitespace rejection a domain invariant.

## Frozen implementation split

- **5.6:** normalize inbound receipt, resolve identities/participants, upsert conversation/message, and emit attachment/realtime side effects only for a newly-created message effect claim.
- **5.7:** validate and enqueue standard reply; execution-time kill switch and reply policy; unknown writes enter reconciliation and are never blindly retried.
- **5.8:** private reply comment relationship, seven-day/one-shot/Live policy, execution-time kill switch and reconciliation.
- **5.9:** inbound/outbound attachment policy, validation scheduling, quarantine and safe projection.

## 5.5 gate result

All `lib/meta/instagram/*` modules, production routes, workers, provider calls, policy assumptions, attachment flows and realtime paths are classified. No runtime behavior or Prisma schema changed in this item.
