# Seed-Style "Benefits That Build Over Time" Execution Plan
**Project:** Minsah Beauty — Product Page Clinical Science & Timeline Fold  
**Inspiration & Benchmark:** Seed.com (`https://seed.com/daily-synbiotic` — `product-benefits__BenefitsWrapper`)  
**Design Tokens:** Canvas `#F4F3EE`, Forest Dark `#1C3A13`, Active Pill `#1C3A13`, Future Pill `#C0C4BB`, Radius `32px` & `100%`  

---

## 🏗️ 1. Architecture & Component Map

```
app/(storefront)/products/[id]/components/benefits/
├── SeedBenefitsHeader.tsx      [Phase 1] (Centered 46px/52px Forest Title + Admin-Controlled Dynamic Subtitle)
├── SeedTimelineList.tsx        [Phase 2] (4-Stage Milestone Timeline: 7 Days, 2 Weeks, 4 Weeks, 3 Months)
├── SeedMediaMatrix.tsx         [Phase 3] (Wide HTML5 Video Player + Sound Controls + Motion GIF + 100% Circle Jar)
├── SeedUsageBox.tsx            [Phase 4] (Minimalist Dosage Card, Container Icon & Exact Frequency Ritual)
└── SeedBenefitsSection.tsx     [Phase 5] (Master 2-Column Responsive Container & ProductClient.tsx Integration)
```

---

## 📋 2. Detailed Phase Breakdown

### 🟢 Phase 1: `SeedBenefitsHeader.tsx` (Dynamic Header Fold)
- **Goal:** Create the centered, high-trust heading fold with full multi-brand dynamic support.
- **Key Features:**
  - **Main Title:** `46px/52px` (Desktop) / `28px` (Mobile) bold forest green headline (`#1C3A13`):  
    `The ${productName} difference:`<br />`Benefits that build over time`
  - **Dynamic Subtitle:** Admin-controlled text from database (e.g., *"Results you can feel in as little as 7 days.\*"* or custom per product).
  - **Clean Presentation:** No external distractions or unnecessary buttons; pure, focused typography on `#F4F3EE` canvas.

---

### 🟢 Phase 2: `SeedTimelineList.tsx` (4-Stage Progressive Timeline)
- **Goal:** Build the 4-phase transformation journey showing how benefits compound over time.
- **Key Features:**
  - **Stage 1 (`7 Days` Pill `#1C3A13`):** Immediate barrier soothing & deep moisture replenishment.
  - **Stage 2 (`2 Weeks` Pill `#1C3A13`):** Cellular turnover, pore refinement & sebum balance.
  - **Stage 3 (`4 Weeks` Pill `#1C3A13`):** Visible glass-skin glow, fine line smoothing & spot fading.
  - **Stage 4 (`3 Months` Pill `#1C3A13`):** Long-term dermal collagen density & permanent barrier resilience.
  - Clean bulleted lists with subtle hairline dividers.

---

### 🟢 Phase 3: `SeedMediaMatrix.tsx` (Video Player & Media Grid)
- **Goal:** Build Seed's iconic 3-element media slot on the right column.
- **Key Features:**
  - **Top Wide Slot (Grid Column Span 2, Radius `32px`):**
    - Autoplay, loop, playsinline HTML5 `<video>`.
    - Live audio Unmute/Mute button + Play/Pause button.
    - Floating subtitle caption overlay (*"So I have deep empathy for people"*).
  - **Bottom-Left Slot (Radius `16px`):**
    - Bio-Active Helix / Micro-droplet animated motion GIF.
  - **Bottom-Right Slot (Radius `100%` Circular):**
    - 1:1 Aspect ratio round circular container held in hands photo.

---

### 🟢 Phase 4: `SeedUsageBox.tsx` (Dosage & How to Use Card)
- **Goal:** Provide clean, unambiguous daily application instructions.
- **Key Features:**
  - Container thumbnail / pipette icon.
  - Bold `"How to Use:"` header.
  - Bullet instructions: e.g., *"Take 2 capsules daily / Apply 2–3 drops, with or without food, day or night."*
  - Background: Soft cream `#EEEDE6` with `16px` rounded corners.

---

### 🟢 Phase 5: `SeedBenefitsSection.tsx` & `ProductClient.tsx` Live Integration
- **Goal:** Assemble all 4 sub-modules into the master container and wire into `ProductClient.tsx`.
- **Key Features:**
  - Master 2-column layout on Desktop (`50%` Left Timeline : `50%` Right Media Matrix).
  - Responsive stacking on Mobile (Video on Top ➔ Timeline ➔ Usage Card ➔ 2-Tile Media Row).
  - Background canvas: `#F4F3EE` with `80px` vertical padding.

---

### 🟢 Phase 6: Verification & Multi-Viewport Audit
- **Goal:** Ensure zero compilation errors and test responsiveness across all viewports.
- **Checks:**
  - `npm run typecheck` ➔ **0 errors, Exit code 0**.
  - Desktop (1440x900), Tablet (768x1024), and Mobile (393x852) visual verification.
  - Git commit and push to `origin/main`.

---

## 🎨 3. Exact Computed CSS Tokens

```css
:root {
  --seed-canvas-bg: #F4F3EE;
  --seed-forest-dark: #1C3A13;
  --seed-forest-text: #163020;
  --seed-active-pill: #1C3A13;
  --seed-inactive-pill: #C0C4BB;
  --seed-usage-bg: #EEEDE6;
  --seed-border-hairline: rgba(28, 58, 19, 0.12);
  --seed-radius-video: 32px;
  --seed-radius-tile: 16px;
  --seed-radius-circle: 100%;
}
```

---

## 🚀 4. Readiness & Approvals
- [x] Live Seed.com DOM and CSS computed tokens audited
- [x] Phased Architecture planned and recorded
- [ ] Phase 1 Execution (`SeedBenefitsHeader.tsx` + `SeedClinicalDrawer.tsx`)
- [ ] Phase 2 Execution (`SeedTimelineList.tsx`)
- [ ] Phase 3 Execution (`SeedMediaMatrix.tsx`)
- [ ] Phase 4 Execution (`SeedUsageBox.tsx`)
- [ ] Phase 5 Execution (`SeedBenefitsSection.tsx` + `ProductClient.tsx` Live Wiring)
- [ ] Phase 6 Verification & GitHub Sync
