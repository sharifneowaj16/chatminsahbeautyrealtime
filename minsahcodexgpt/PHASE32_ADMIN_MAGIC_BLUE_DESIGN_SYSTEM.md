# Phase 32: Admin Panel Linear "Magic Blue" Design System & Mobile Optimization

## Executive Summary
This phase transitions the entire Minsah Beauty Admin Panel (`/admin` and all sub-routes) to Linear's **Magic Blue** interface design system, purges all legacy colors and mismatched light-mode classes, and delivers responsive optimization across all mobile viewports.

---

## 1. Strict Boundaries & Guarantees
- **Storefront Isolation**: Storefront routes (`app/(storefront)/**`, `/`, `/products`, `/checkout`, `/account`) remain 100% untouched.
- **Purely Scoped Variables**: All theme variables and styling rules are scoped strictly under `.admin-workspace` and admin components.
- **Zero Business Logic Regressions**: All backend APIs, state providers, mutations, and authentication workflows remain intact.

---

## 2. Milestones & Task Breakdown

### Milestone 1: Global Scoped Variables & Token Infrastructure
- Update `--admin-*` tokens in `app/globals.css` with Magic Blue values:
  - `--admin-bg: #090a0f` (Sidebar)
  - `--admin-canvas: #10121b` (Workspace Canvas)
  - `--admin-panel: #161824` (Surface Card)
  - `--admin-border: #232636` (Card Borders)
  - `--admin-border-subtle: #1b1e2c` (Dividers)
  - `--admin-accent: #5e6ad2` (Magic Blue Accent)
  - `--admin-accent-hover: #6d78d5`
- Add scoped utility classes for `.admin-workspace` scrollbars, mobile safe-area paddings, and touch targets.

### Milestone 2: Admin Shell & Mobile Navigation (`AdminLayoutWrapper.tsx`)
- Migrate desktop navigation and mobile drawer to `#090a0f` with `#232636` borders.
- Update active navigation link styles to Linear Magic Blue accent (`#5e6ad2` / `rgba(94, 106, 210, 0.15)`).
- Upgrade mobile navigation:
  - Sticky mobile header with clear `44px` touch-friendly hamburger toggle.
  - Mobile slide-out drawer with backdrop blur and smooth gesture dismiss.
  - Responsive header controls (condense search shortcut on mobile, preserve bell and user menu).

### Milestone 3: Dashboard & KPI Analytics (`AdminDashboard.tsx`)
- Upgrade KPI stat cards to `#161824` with top-edge inset sheen highlights (`shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`).
- Responsive KPI grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` with optimized mobile paddings (`p-3.5`).
- Mobile-responsive banners and stacked action button layouts.

### Milestone 4: Core Management Subpages (Orders, Products, Customers)
- **Orders (`OrderManagement.tsx`)**:
  - Purge `bg-white`, `border-gray-200`, `text-gray-900`.
  - Implement Magic Blue dark table rows, status pills, and filter bar.
  - Add horizontal touch scroll container (`overflow-x-auto`) to prevent table clipping on mobile.
- **Products (`ProductManagement.tsx`)**:
  - Update product cards, inventory badges, and action menus to Magic Blue styling.
  - Mobile responsive filters and edit dialogs.
- **Customers & Marketing Hub**:
  - Standardize customer lists and CRM drawers with responsive layouts.

### Milestone 5: Settings & Preferences (`app/admin/settings/*`)
- Implement Linear's 2-column settings layout that gracefully collapses to 1-column on mobile.
- Grouped fieldset cards with Magic Blue active switches (`#5e6ad2`) and combobox triggers.

### Milestone 6: Quality Assurance & Cross-Device Testing
- Run automated verification (`npm run typecheck`).
- Test locally on desktop (1280px+), tablet (768px), and mobile (375px) via browser subagent.
- Verify storefront routes (`/`, `/products`, `/checkout`) to confirm zero contamination.
