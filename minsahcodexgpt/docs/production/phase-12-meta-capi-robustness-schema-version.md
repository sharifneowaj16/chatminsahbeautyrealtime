# Phase 12 Production Notes — Meta Business SDK + CAPI Schema Version

## Current implementation

Server-side Meta CAPI delivery is centralized in:

```txt
lib/tracking/meta-business-sdk.ts
```

The adapter uses the official Node.js Business SDK classes:

```txt
EventRequest
ServerEvent
UserData
CustomData
Content
```

Shared schema helpers remain in:

```txt
lib/tracking/meta-schema.ts
```

Important constants/helpers:

```txt
TRACKING_SCHEMA_VERSION = mb_tracking_v1
DEFAULT_META_GRAPH_API_VERSION = v24.0
normalizeMetaGraphApiVersion()
withMetaSchemaVersion()
withMetaCapiPayloadSchemaVersion()
withMetaSafePayloadSchema()
```

## Safety guarantees

```txt
Public /api/facebook-capi blocks Purchase.
COD Purchase requires phoneConfirmedAt.
Online Purchase requires a verified completed payment.
Browser and server event names/event IDs remain identical for deduplication.
Purchase event_id remains Purchase-{orderId}.
Production test_event_code remains disabled.
Queue/log safe payloads contain no raw email or phone.
Business SDK timeout, retry, idempotency and failure logging are retained.
```

## Deploy QA

```bash
npm run qa:phase12
npm run typecheck:ts
npm run build
```
