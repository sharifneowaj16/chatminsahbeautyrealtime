# Phase 23 evidence — unified Meta Business SDK transport

## Source status

`READY_FOR_RUNTIME_QA`

The approved Phase 23 source boundary is implemented. It centralizes the official Business SDK import, validates the runtime contract lazily, creates authorized rotation-aware clients, injects app-secret proof through the SDK call boundary, normalizes provider results and errors, enforces deadlines/cancellation, and supplies focused domain adapters plus migration-safe legacy facades.

No Ads, Catalog, Insights, Audience, Pixel, Page, Lead or CAPI production workflow has been cut over. Those observed migrations remain in Phases 28–31.

## Implemented contracts

- The SDK package is imported only from `lib/meta-platform/transports/business-sdk/runtime.ts` with a namespace import.
- Runtime validation checks all required constructors and the approved major/minor SDK line.
- Package and runtime versions are reported separately, including patch metadata drift.
- Capability authorization completes before `FacebookAdsApi` construction.
- The Phase 22 credential client registry owns caching and rotation invalidation; the transport clears and disables the replaced SDK API instance.
- SDK crash reporting is disabled; debug mode is explicit.
- Configured APP credentials enable automatic `appsecret_proof` injection on SDK calls.
- Executor logs contain only connection, role, version, operation, duration and normalized diagnostics.
- SDK cursors/provider objects are exported into plain canonical values.
- Focused adapters exist for business, ads, insights, audiences, catalog, pixels, CAPI, pages and leads.
- Existing SDK wrappers delegate to the unified boundary and contain no direct package import.
- The public client-safe MetaPlatform entry does not import the server-only SDK transport.

## Verified command evidence

The final command results and blocker evidence are recorded in `memory.md`. The release package was accepted only after the Phase 23 static architecture audit, governed source inventory, focused strict TypeScript compilation and prior-phase regression audits passed.

## Runtime evidence still required

- Clean locked dependency installation.
- Exact `test:meta-v6-phase23` execution against the installed `facebook-nodejs-business-sdk@24.0.1` runtime.
- Standard repository typecheck and production build after Prisma generation is fresh.
- Controlled provider smoke tests with approved test assets and role-specific credentials.
- Rotation/disposal observation under a real long-lived process.

## Exit assessment

The source exit condition is met: the Business SDK package import exists only in the unified transport directory. The phase remains `READY_FOR_RUNTIME_QA`, not `CODE_COMPLETE` or `COMPLETE`, because exact installed-runtime and target-like provider evidence are not available in this environment.
