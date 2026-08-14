# Meta Business SDK CAPI Migration

## Runtime contract

All server-side Meta Conversions API delivery now runs through:

```txt
facebook-nodejs-business-sdk@24.0.1
EventRequest
ServerEvent
UserData
CustomData
Content
```

The browser remains Meta Pixel (`fbevents.js`). Browser and server events continue to share the same `event_id` for deduplication.

## Event coverage

The Business SDK adapter sends all server CAPI events, including:

```txt
PageView
ViewContent
AddToCart
AddToWishlist
ViewCart
InitiateCheckout
AddShippingInfo
AddPaymentInfo
Search
CompleteRegistration
Contact
Purchase (confirmed COD and verified online payment only)
```

## Delivery architecture

```txt
Browser/API route or verified order lifecycle
  -> BullMQ canonical event payload
  -> metaCapiWorker
  -> lib/tracking/meta-business-sdk.ts
  -> EventRequest.execute()
  -> Meta Graph /events
```

The queue stores hashed matching fields rather than raw customer PII. Meta's SDK recognizes SHA-256 values and does not hash them a second time. `_fbp`, `_fbc`, IP address, user-agent and the hashed external ID are passed through unchanged.

## Production environment

```env
META_PIXEL_ID=
META_CAPI_ACCESS_TOKEN=
META_GRAPH_API_VERSION=v24.0
META_CAPI_TIMEOUT_MS=10000
```

`META_TEST_EVENT_CODE` must remain unset in production.

## Verification

```bash
npm run qa:phase12
npm run typecheck:ts
npm run build
```

In Events Manager, verify Browser/Server deduplication using matching event names and event IDs, especially `Purchase-<orderId>`.
