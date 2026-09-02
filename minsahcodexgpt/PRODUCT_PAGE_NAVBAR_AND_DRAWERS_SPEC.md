# Product Page Floating Glass Pill Navbar & Triple Drawer Specification
**Project:** Minsah Beauty  
**Scope:** Built as a Universal Reusable Component (Initially deployed on Product Details Page `/products/[id]`)  
**Design Reference:** Seed-inspired Floating Glassmorphism Double Pill Architecture & Flyout Dropdown  
**Status:** Approved & Finalized Specification  

---

## 1. Overview & Objectives

This document specifies the architecture, user experience, and technical implementation of the **Floating Glass Pill Header** and its **Triple Drawer / Flyout System (Shop Drawer, Categories Drawer, Offers Drawer)** designed with Seed.com-inspired aesthetics for Minsah Beauty.

### Key Principles:
1. **Universal & Reusable Architecture:** Completely modular component. While active on `/products/[id]`, it is designed so it can easily be plugged into the homepage or other pages in the future.
2. **Seed.com Style Desktop Flyout:** On desktop (`≥ 768px`), hovering on **"Shop"** reveals a frosted glass flyout panel directly beneath the Shop button.
3. **Clean & Minimal Showcase:** No star ratings or "Add to Bag" clutter. Showcases high-resolution product photography, clean titles, and subtle benefits/attributes.
4. **Bottom Navigation Link:** A clean, elegant **"Shop all products →"** link at the bottom directing users to the full catalog (`/shop`).
5. **Luxury Glassmorphism Aesthetic:** Premium floating pill capsules (`backdrop-filter: blur(16px)`, translucent borders, soft ambient drop shadows, and responsive pill geometry).

---

## 2. Desktop Navigation Layout (`≥ 768px`)

The legacy rectangular "শপে ফিরে যান" (Back to shop) sticky bar is upgraded to a Seed-style **Dual Floating Glass Pill Header**:

```
┌─────────────────────────────────────────────────────────────┐   ┌───────────────────────────────┐
│  [Minsah.]  |  [Shop]  |  [Categories]  |  [Offers]         │   │   [🔍 Search]  |  [🛍️ Cart: 3] │
└──────┬─────────────┬──────────────┬──────────────┬──────────┘   └───────────────────────────────┘
       │             │              │              │
       │             │              │              └── 🏷️ Triggers ProductOffersDrawer
       │             │              └───────────────── 📂 Triggers ProductCategoriesDrawer
       │             └──────────────────────────────── 🛍️ Hover/Click opens Shop Flyout directly underneath
       └────────────────────────────────────────────── 🏠 Navigates to Storefront Home
```

### Desktop Elements:
- **Left Floating Capsule:**
  - **Brand Logo (`Minsah.`):** Bold, elegant typography linking to `/`.
  - **`Shop` Tab:** Hover or click smoothly drops down the **Shop Drawer / Flyout Panel** directly below the "Shop" button.
  - **`Categories` Tab:** Triggers the **Categories Drawer** with visual category tiles and links.
  - **`Offers` Tab:** Triggers the **Offers Drawer** with active discount vouchers, flash deals, and delivery perks.
- **Right Floating Capsule:**
  - **`Search` Button:** Quick search trigger for instant product lookup.
  - **`Cart` Button:** Displays dynamic item counter badge and opens the existing `CartDrawer`.

---

## 3. Mobile Navigation Layout (`< 768px`)

On compact viewports, the navbar adapts into a clean, distraction-free floating bar:

```
┌───────────────────────────────────────────────────────────────┐
│  [Minsah.]                         [🛍️ Cart: 2]   [☰ Menu]   │
└────────────────────────────────────────────────┬───────┬──────┘
                                                 │       │
              Opens existing Cart Drawer ────────┘       └── Opens ProductMobileNavDrawer
                                                                ├─► [Shop] ──► Opens Shop Drawer / Accordion
                                                                ├─► [Categories] ──► Opens Categories Drawer
                                                                ├─► [Offers] ──► Opens Offers Drawer
                                                                └─► [🔍 Search & Account]
```

---

## 4. The `ProductShopDrawer` Rules & Specifications

```
  ┌────────────────────────────────────────────────────────────┐
  │  [Shop] (Hovered on Desktop)                               │
  └──────┬─────────────────────────────────────────────────────┘
         │ (Drops down directly underneath with frosted glass)
         ▼
  ┌────────────────────────────────────────────────────────────┐
  │ ✦ Featured Formulas / Top Beauty Lines                     │
  │ ┌───────────────────┐ ┌───────────────────┐ ┌────────────┐ │
  │ │  [Product Image]  │ │  [Product Image]  │ │  [Image]   │ │
  │ │  Product Name     │ │  Product Name     │ │  Name      │ │
  │ │  Benefit / Tag    │ │  Benefit / Tag    │ │  Tag       │ │
  │ └───────────────────┘ └───────────────────┘ └────────────┘ │
  │ ────────────────────────────────────────────────────────── │
  │              Shop all products →                           │
  └────────────────────────────────────────────────────────────┘
```

1. **Universal Reusability:** Self-contained and portable to any route.
2. **Desktop Flyout (Seed.com style):** Positioned directly below the "Shop" capsule upon hover or focus.
3. **Clean Visuals:** Focus on imagery and typography; no "Add to Bag" buttons or star ratings.
4. **Bottom Anchor:** Contains the exact link text: **"Shop all products →"**.
5. **Instant Product Routing:** Clicking any item closes the flyout and routes smoothly to that product page.
6. **Glass Aesthetics:** `backdrop-blur-xl`, `rounded-3xl`, soft translucent borders.

---

## 5. Component Architecture & File Map

```
app/(storefront)/products/[id]/components/
├── ProductStickyHeader.tsx       <── Seed-style Floating Glass Capsule Header
├── ProductShopDrawer.tsx         <── Reusable Shop Flyout/Drawer (Seed-style dropdown)
├── ProductCategoriesDrawer.tsx   <── Reusable Category Exploration Drawer
├── ProductOffersDrawer.tsx       <── Reusable Active Promotions & Offers Drawer
├── ProductMobileNavDrawer.tsx    <── Mobile Hamburger Navigation Sheet
└── ProductClient.tsx             <── Mounts header and manages active flyout states
```

---

## 6. Verification & Quality Matrix

- [ ] **Desktop Hover:** Hovering on "Shop" displays the frosted glass dropdown directly below the "Shop" tab.
- [ ] **Clean Presentation:** Displays clean image, title, and benefit tags with no rating or add-to-bag buttons.
- [ ] **Footer Link:** Shows **"Shop all products →"** and links to `/shop`.
- [ ] **Mobile Integration:** Mobile bar displays `Logo | Cart | Hamburger` with 1-tap navigation into Shop, Categories, and Offers.
- [ ] **Zero Global Side-effects:** Maintains 100% isolation from `/` and `/checkout`.
