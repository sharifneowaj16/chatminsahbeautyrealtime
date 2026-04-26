# Admin Marketing + Analytics Meta Roadmap

This roadmap is designed around existing `admin/marketing` and `admin/analytics` flows.

## What Already Existed

- `admin/marketing` with tab-based client (`overview/social/whatsapp/email/sms/google`)
- `admin/analytics` performance dashboard
- `SiteConfig` table for storing JSON config
- Facebook/CAPI utilities and tracking infrastructure in `lib/facebook/*` and `app/api/facebook-capi/route.ts`

## What Was Upgraded Now

- Added `meta` tab under `admin/marketing`
- Added editable Meta setup blocks:
  - Pixel + CAPI token
  - Campaign objective + daily budget
  - Retarget audience selection
- Added analytics section in `admin/analytics`:
  - Pixel health
  - Event counts
  - Retarget audience and campaign efficiency cards
- Added secured admin APIs (cookie token validated):
  - `GET/PUT /api/admin/meta/settings`
  - `GET/PUT /api/admin/meta/audiences`

## Phase-Wise Implementation Plan

### Phase 1 (Now): Config + Audience Base

- Persist Meta setup and audience presets via `SiteConfig`
- Keep UI on current admin pages, no new duplicate section
- API-backed save/load for `admin/marketing?tab=meta`

### Phase 2: Campaign Objects + Execution Control

- Add campaign CRUD in DB + API
- Add status transitions: `draft`, `active`, `paused`, `completed`
- Add optimization-rule config:
  - pause on low ROAS
  - scale on stable CPA/ROAS

### Phase 3: Retargeting Rule Engine

- Audience rule builder:
  - event include/exclude
  - lookback windows
  - min action counts
- Exclusion packs:
  - purchasers last N days
  - high-frequency users
- Rule preview with estimated audience size

### Phase 4: Analytics Attribution Layer

- Store campaign/adset/ad IDs for events
- Build attribution metrics:
  - ROAS by audience
  - CPA/CAC by objective
  - funnel drop-off by retarget stage
- Add client-ready export summary

## Exact Database Schema (Current + Recommended)

### Current (already in schema)

- `SiteConfig`
  - used for persisted meta settings and audiences (JSON)
- `CampaignAttribution`, `TrackingDevice`, `CustomerBehavior`
  - attribution and behavior context
- `Order`, `OrderItem`, `SearchClickEvent`, `SearchClickMetrics`
  - conversion and monetization signals

### Recommended New Models (Phase 2+)

```prisma
model MetaCampaign {
  id               String   @id @default(cuid())
  name             String
  status           String   @default("draft")
  objective        String
  dailyBudgetBdt   Decimal  @db.Decimal(10, 2)
  adAccountId      String?
  campaignId       String?
  metadata         Json?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  adSets           MetaAdSet[]
}

model MetaAdSet {
  id               String   @id @default(cuid())
  campaignRefId    String
  name             String
  adSetId          String?
  audienceRule     Json
  placements       Json
  optimizationGoal String
  status           String   @default("draft")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  campaign         MetaCampaign @relation(fields: [campaignRefId], references: [id], onDelete: Cascade)
}

model MetaEventMetricDaily {
  id               String   @id @default(cuid())
  date             DateTime
  eventName        String
  eventCount       Int
  attributedRevenue Decimal? @db.Decimal(12, 2)
  campaignId       String?
  adSetId          String?
  audienceId       String?
  metadata         Json?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([date, eventName])
  @@index([campaignId, adSetId])
}
```

## Exact API List (Target)

### Implemented Now

- `GET /api/admin/meta/settings`
- `PUT /api/admin/meta/settings`
- `GET /api/admin/meta/audiences`
- `PUT /api/admin/meta/audiences`

### Phase 2 API

- `GET /api/admin/meta/campaigns`
- `POST /api/admin/meta/campaigns`
- `PATCH /api/admin/meta/campaigns/:id`
- `POST /api/admin/meta/campaigns/:id/publish`
- `POST /api/admin/meta/campaigns/:id/pause`

### Phase 3 API

- `POST /api/admin/meta/audience-preview`
- `POST /api/admin/meta/audiences/sync`
- `POST /api/admin/meta/lookalike/create`

### Phase 4 API

- `GET /api/admin/meta/analytics/overview`
- `GET /api/admin/meta/analytics/audiences`
- `GET /api/admin/meta/analytics/campaigns`
- `GET /api/admin/meta/analytics/export`

