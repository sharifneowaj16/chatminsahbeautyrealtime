# Project Structure

## Overview

This repository is a **Next.js 16 + React 19 + TypeScript** ecommerce application for **Minsah Beauty**. It uses the App Router, Prisma/Postgres, Redis/BullMQ workers, Elasticsearch, MinIO, and several payment/tracking integrations.

## Top-Level Layout

```text
minsahcodexgpt/
|-- .github/                    # GitHub Actions workflow definitions
|-- app/                        # Next.js App Router pages, layouts, and API routes
|-- components/                 # Shared UI components outside app route folders
|-- contexts/                   # React context providers for auth, cart, products, tracking
|-- data/                       # Static data such as categories and Bangladesh locations
|-- docs/                       # Internal project documentation
|-- hooks/                      # Reusable React hooks
|-- lib/                        # Core server/client business logic and integrations
|-- minsahinboxcodex/           # Alternate or extracted social inbox implementation files
|-- prisma/                     # Prisma schema, seed, and SQL migrations
|-- public/                     # Static assets served by Next.js
|-- scripts/                    # One-off maintenance and indexing scripts
|-- types/                      # Shared TypeScript type definitions
|-- utils/                      # Small utility helpers
|-- addtocardallfiles/          # Snapshot/reference copies related to cart/buy-now work
|-- middleware.ts               # Next.js middleware
|-- instrumentation.ts          # App instrumentation entrypoint
|-- package.json                # Scripts and dependency manifest
|-- next.config.ts              # Next.js configuration
|-- prisma.config.ts            # Prisma configuration
|-- tsconfig.json               # TypeScript configuration
|-- eslint.config.mjs           # ESLint configuration
|-- postcss.config.mjs          # PostCSS/Tailwind setup
|-- nixpacks.toml               # Deployment/buildpack config
|-- .env.example                # Required environment variable template
`-- README.md                   # Default starter README; not project-specific
```

## Important Folders

### `app/`

Main application routes, layouts, route-local components, and API handlers.

```text
app/
|-- layout.tsx                  # Root app layout
|-- page.tsx                    # Homepage
|-- globals.css                 # Global styles
|-- components/                 # App-scoped UI pieces
|-- account/                    # Customer account pages
|-- admin/                      # Admin dashboard pages
|-- api/                        # Route handlers for app APIs
|-- cart/ checkout/ shop/       # Commerce flows
|-- products/                   # Product details
|-- search/                     # Search UI
|-- marketing/                  # Marketing dashboards/pages
|-- gift/                       # Gift flow
|-- login/ register/            # Auth pages
|-- forgot-password/            # Password reset start
|-- reset-password/             # Password reset completion
|-- wishlist/ favourites/       # Saved-product pages
`-- about/, contact/, faq/, ... # Content and campaign pages
```

### `app/api/`

Backend surface exposed through Next.js route handlers.

```text
app/api/
|-- auth/                       # Customer auth endpoints
|-- admin/                      # Admin auth, orders, inventory, customers, site config
|-- addresses/                  # Address CRUD
|-- cart/                       # Cart APIs
|-- buy-now/                    # Buy-now checkout APIs
|-- payments/                   # bkash, nagad, rocket, card, COD
|-- products/ categories/       # Catalog APIs
|-- reviews/ returns/ orders/   # Customer commerce flows
|-- search/                     # Search, metrics, suggestions, trending
|-- social/                     # Social inbox messaging/reply/webhook endpoints
|-- upload/                     # Media upload endpoints
|-- tracking/, track/, behavior/# Tracking and attribution
|-- webhook/facebook/           # Facebook webhook
`-- health/                     # Health checks
```

### `components/`

Shared reusable UI components kept outside route folders.

```text
components/
|-- account/                    # Account page client components
|-- admin/                      # Admin UI widgets and panels
|-- cart/                       # Cart and buy-now controls
|-- SafeText.tsx                # Safe text rendering
|-- verify-otp-client.tsx       # Auth verification UI
`-- reset-password-client.tsx   # Password reset UI
```

### `lib/`

Core business logic, adapters, and integrations.

```text
lib/
|-- auth/                       # JWT, password, NextAuth helpers
|-- cache/                      # Redis cache wrappers
|-- elasticsearch/              # Search indexing, analytics, ranking logic
|-- encoding/                   # Encoding fix/interceptor utilities
|-- facebook/                   # Facebook profile, inbox sync, pixel helpers
|-- payments/                   # Payment provider integrations
|-- queue/                      # BullMQ queue setup
|-- search/                     # Search transformation helpers
|-- social/                     # Social message ingestion logic
|-- steadfast/                  # Steadfast courier integration
|-- storage/                    # MinIO storage helpers
|-- tracking/                   # Pixels, campaign logic, tracking manager
|-- workers/                    # Background workers
|-- prisma.ts                   # Prisma client bootstrap
|-- redis.ts                    # Redis connection
|-- env.ts                      # Environment parsing/validation
`-- logger.ts                   # Logging helper
```

### `prisma/`

Database schema, seed data, and migration history.

```text
prisma/
|-- schema.prisma               # Main data model
|-- seed.ts                     # Seed script
`-- migrations/                 # Timestamped SQL migrations
```

## Supporting Areas

- `contexts/`: React providers for cart, auth, categories, products, admin auth, and tracking.
- `types/`: Shared domain types for products, users, search, tracking, social, Facebook, and admin.
- `utils/`: Formatting, currency, and social icon helpers.
- `scripts/`: Elasticsearch initialization, migration, reindexing, image recompression, and test helpers.
- `docs/`: Project-specific notes such as API inventory and Facebook Conversion API guidance.
- `public/`: Static images and SVG assets.

## Notes

- `README.md` is still the default Next.js starter README and does not describe this codebase.
- `minsahinboxcodex/` appears to hold alternate/extracted social inbox source files.
- `addtocardallfiles/` appears to be a snapshot/reference folder rather than the primary app source.
