# ADR-024 — Graph HTTP, webhook and secure media transports

- **Status:** Accepted
- **Date:** 2026-07-22
- **Phase:** 24

## Context

The existing application contained multiple direct Graph URL builders, raw fetch implementations, duplicate webhook HMAC helpers and a media downloader that did not resolve DNS before fetching. Those paths duplicated version, authentication, timeout, redaction, pagination and remote-content safety policy. Phase 23 intentionally covered only the official Business SDK and could not own endpoints that require raw Graph HTTP, webhook raw bodies or remote media.

## Decision

1. All new raw Graph requests use `lib/meta-platform/transports/graph-http/**`.
2. The Graph client fixes the origin to `https://graph.facebook.com`, accepts relative paths only, authorizes an explicit credential role, sends access tokens only through the `Authorization` header, applies approved Graph version policy and adds `appsecret_proof` when an APP credential exists.
3. Provider `paging.next` URLs never cross the transport boundary. Pagination follows only normalized `cursors.after`, with explicit page/item bounds and repeated-cursor detection.
4. Batch transport allows 1–50 relative operations and returns a result for every item, including partial failures.
5. Meta webhook HMAC and verification-token logic exists in `transports/webhook/**`. Raw bodies are size-bounded before parsing. Notifications receive stable event keys and deterministic ordering metadata. Receipt persistence uses put-if-absent before downstream processing.
6. Remote media accepts HTTPS Meta-owned hosts only. Every hostname and redirect is resolved and rejected if any address is private, loopback, link-local, documentation, multicast or otherwise reserved. Cross-origin redirects do not receive the original authorization header.
7. Downloaded media is bounded by declared and streamed bytes, checked against MIME allowlists and magic bytes, and can be stored only after a malware scanner returns `CLEAN` through the secure storage contract.
8. Existing application modules use compatibility wrappers so Phase 24 does not perform capability cutovers assigned to Phases 28–31. The separate realtime service remains a Phase 31 migration target.

## Consequences

- Raw provider security policy is centralized and testable.
- Existing application behavior can continue while direct URL/fetch and HMAC implementation details leave domain modules.
- Live DNS, malware scanner, private object storage and provider credentials are still required for production evidence.
- Legacy redirect URLs used by old Facebook avatar rendering remain isolated in a named compatibility helper and should be replaced by authenticated proxy delivery during the Phase 31 legacy Facebook cutover.
