# Phase 10 — Telegram Bot Production Hardening

## Production Rule

Telegram controls operational order actions. A Telegram callback can confirm COD orders, and COD Phone Confirmed triggers Meta CAPI + GA4 Purchase. Therefore Telegram actions must be treated as production write APIs, not convenience buttons.

Final rule:

```txt
No Telegram action can change an order unless:
1. x-telegram-bot-api-secret-token matches TELEGRAM_WEBHOOK_SECRET
2. TELEGRAM_ADMIN_USER_IDS contains the Telegram user id
3. callback_data is a valid tokenized t:<token> action
4. order state transition is allowed
5. action is logged and idempotent
```

## Implemented Controls

- Webhook fails closed in production when `TELEGRAM_WEBHOOK_SECRET` is missing.
- Admin allowlist fails closed in production when `TELEGRAM_ADMIN_USER_IDS` is missing.
- Raw callback data such as `phone_confirm_{orderId}` is not accepted.
- New order buttons use DB-backed tokenized callback data: `t:<token>`.
- Tokens are stored hashed as SHA-256 in `TelegramActionToken.tokenHash`.
- Tokens expire and are consumed with an atomic update.
- Every action attempt is recorded in `TelegramActionLog`.
- Phone Confirmed, Phone Off, Cancel, and Pathao Send each use explicit order-state guards.

## State Rules

### Phone Confirmed

Allowed only for COD/cash orders that are not cancelled/refunded/delivered and do not already have Meta Purchase sent.

Effects:

```txt
status = CONFIRMED
phoneConfirmedAt = now
confirmationStatus = CONFIRMED_BY_PHONE
confirmedByAdminId = telegram:<userId>
metaEventId = Purchase-{orderId}
queue Meta CAPI Purchase once
queue GA4 Purchase once
```

### Phone Off

Blocked after confirmation, shipment, delivery, cancellation, or refund.

### Cancel

Blocked when:

```txt
online payment is completed
order is phone-confirmed
order is shipped/delivered/refunded/cancelled
Pathao consignment/tracking/sentAt exists
```

### Pathao Send

Requires:

```txt
order confirmed or phoneConfirmedAt exists
COD order has phoneConfirmedAt
order not cancelled/refunded/delivered
shipping address exists
```

The Pathao service still performs duplicate-dispatch checks.

## Required Environment Variables

```env
TELEGRAM_RELAY_BASE=https://api.telegram.org/bot
TELEGRAM_ORDER_BOT_TOKEN=...
TELEGRAM_ORDER_CHAT_ID=...
TELEGRAM_WEBHOOK_SECRET=...
TELEGRAM_ADMIN_USER_IDS=123456789,987654321
```

## QA

Run before launch:

```bash
npm run qa:telegram-security
npm run audit:security
npm run qa:phase8-static
```

Manual tests:

| Test | Expected |
|---|---|
| Missing webhook secret in production | 503 / fail closed |
| Wrong secret header | 401 |
| Valid secret but non-allowlisted user | 403 |
| Raw `phone_confirm_{orderId}` callback | rejected |
| Valid token + Phone Confirmed COD | order confirmed + CAPI/GA4 queued once |
| Repeated tap | no duplicate Purchase |
| Phone Off after confirmed | blocked |
| Cancel after paid/shipped/Pathao-dispatched | blocked |
| Pathao Send before confirmation | blocked |
| Pathao Send repeated | already dispatched/no duplicate |

Set only after real evidence:

```env
QA_TELEGRAM_BOT_HARDENING_VERIFIED=true
QA_TELEGRAM_BOT_HARDENING_EVIDENCE_URL=https://private-evidence-link
```
