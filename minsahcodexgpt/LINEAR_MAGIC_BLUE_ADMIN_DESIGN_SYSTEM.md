# Linear "Magic Blue" Admin Panel Design System

This document serves as the complete, drop-in design specification and token library extracted directly from **Linear (`linear.app`)**, tailored for building a high-density, modern admin panel using the **Magic Blue** interface theme.

---

## 1. Design Philosophy

Linear's "Magic Blue" interface replaces plain gray and pitch-black aesthetics with:
1. **Midnight Navy Undertones**: Rich, dark blue-tinted canvases (`#0b0d14` and `#10121b`) that reduce eye strain and give a sleek, premium depth.
2. **Signature Indigo-Blue Accent**: `#5e6ad2` used strategically on primary action buttons, active toggle switches, focus outlines, and selected badges.
3. **Subtle Sheen & Hairline Borders**: Hairlines (`rgba(255, 255, 255, 0.07)`) with top-edge inset highlights (`inset 0 1px 0 rgba(255, 255, 255, 0.15)`).
4. **Tight Geometric Radiuses**: Refined `6px` to `12px` curves, avoiding oversized bubbles.
5. **High-Density Typography**: Tightly tracked Inter (`letter-spacing: -0.01em` to `-0.022em`) with clear visual hierarchy.

---

## 2. Color Palette & Design Tokens

### A. Raw Color Values

| Token Name | Hex Code | RGB / RGBA | Usage in UI |
| :--- | :--- | :--- | :--- |
| **`brand-accent`** | `#5e6ad2` | `rgb(94, 106, 210)` | Primary buttons, active toggle switch track, focus rings, selected badges |
| **`brand-accent-hover`**| `#6d78d5` | `rgb(109, 120, 213)` | Hover state for primary buttons |
| **`brand-accent-subtle`**| — | `rgba(94, 106, 210, 0.15)` | Subtle accent backgrounds, active navigation pills |
| **`canvas-bg`** | `#0b0d14` | `rgb(11, 13, 20)` | Viewport background (deep midnight navy) |
| **`workspace-bg`** | `#10121b` | `rgb(16, 18, 27)` | Main dashboard and content pane background |
| **`sidebar-bg`** | `#090a0f` | `rgb(9, 10, 15)` | Left-hand navigation sidebar |
| **`surface-card`** | `#161824` | `rgba(255, 255, 255, 0.03)` | Card containers, fieldsets, table containers |
| **`surface-hover`** | — | `rgba(255, 255, 255, 0.06)` | Hover state for rows, list items, menus |
| **`surface-active`** | — | `rgba(255, 255, 255, 0.10)` | Selected item, active tab background |
| **`popover-bg`** | `#161722` | `rgb(22, 23, 34)` | Floating dropdown menus, modals, dialogs |
| **`border-hairline`** | `#232636` | `rgba(255, 255, 255, 0.07)` | Outer card borders, container outlines |
| **`border-divider`** | `#1b1e2c` | `rgba(255, 255, 255, 0.05)` | Hairline dividers between list/setting items |
| **`border-hover`** | — | `rgba(255, 255, 255, 0.16)` | Card and button hover outline |
| **`text-primary`** | `#f7f8f8` | `rgba(255, 255, 255, 0.95)` | Headings, active labels, body text |
| **`text-secondary`** | `#8a8f98` | `rgba(255, 255, 255, 0.60)` | Descriptions, subtext, helper labels |
| **`text-muted`** | `#62666d` | `rgba(255, 255, 255, 0.40)` | Placeholders, disabled text, icons |

---

## 3. Typography Hierarchy

* **Primary Font Stack**: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
* **Monospace Stack**: `"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace`

| Role | Font Size | Line Height | Weight | Letter Spacing | Color |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Page Title (H1)** | `20px` (`1.25rem`) | `28px` | `600` (SemiBold) | `-0.022em` | `#f7f8f8` |
| **Section Title (H2)**| `14px` (`0.875rem`)| `20px` | `600` (SemiBold) | `-0.015em` | `#f7f8f8` |
| **Setting Title / Row**| `13px` (`0.8125rem`)| `18px` | `500` (Medium) | `-0.01em` | `#f7f8f8` |
| **Body / Input Text** | `14px` (`0.875rem`)| `20px` | `400` / `500` | `-0.011em` | `#f7f8f8` |
| **Subtext / Helper** | `12px` (`0.75rem`) | `16px` | `400` (Regular) | `0` | `#8a8f98` |
| **KBD / Shortcut** | `11px` (`0.6875rem`)| `14px` | `500` (Medium) | `+0.01em` | `#8a8f98` |

---

## 4. Border Radius System

* **`3px` (`rounded-[3px]`)**: Keyboard shortcut badges (`<kbd>`), mini status tags.
* **`4px` (`rounded` / `rounded-sm`)**: Small checkbox boxes, micro-buttons.
* **`6px` (`rounded-md`)**: Standard buttons, navigation menu items, select comboboxes, inputs.
* **`8px` (`rounded-lg`)**: Dropdown menus, tooltips, popovers.
* **`12px` (`rounded-xl`)**: Grouped setting cards, chat boxes, dashboard cards.
* **`16px` (`rounded-2xl`)**: Modals and major floating dialogs.
* **`9999px` (`rounded-full`)**: Toggle switches, user avatar circles, pill action buttons.

---

## 5. Shadows, Overlays & Lighting Effects

```css
/* Linear Signature Inset Sheen (Applied to top edge of buttons and cards) */
box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.15);

/* Card Shadow */
box-shadow: 0 0 0 1px #232636, 0 2px 4px rgba(0, 0, 0, 0.2);

/* Elevated Dropdown / Popover Shadow */
box-shadow: 0 12px 36px rgba(0, 0, 0, 0.55), 0 0 0 1px #232636;

/* Modal Shadow */
box-shadow: 0 24px 64px rgba(0, 0, 0, 0.7), 0 0 0 1px #232636;

/* Accent Ambient Glow */
box-shadow: 0 0 60px -10px rgba(94, 106, 210, 0.25);
```

---

## 6. Drop-in Tailwind Configuration (`tailwind.config.js`)

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        magic: {
          accent: '#5e6ad2',
          'accent-hover': '#6d78d5',
          'accent-subtle': 'rgba(94, 106, 210, 0.15)',
          canvas: '#0b0d14',
          workspace: '#10121b',
          sidebar: '#090a0f',
          surface: '#161824',
          popover: '#161722',
          border: '#232636',
          divider: '#1b1e2c',
          text: '#f7f8f8',
          'text-muted': '#8a8f98',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '14px', letterSpacing: '0.01em' }],
        'xs-tight': ['12px', { lineHeight: '16px', letterSpacing: '0' }],
        'sm-tight': ['13px', { lineHeight: '18px', letterSpacing: '-0.01em' }],
        'base-tight': ['14px', { lineHeight: '20px', letterSpacing: '-0.011em' }],
      },
      borderRadius: {
        '2xs': '3px',
        'linear-sm': '6px',
        'linear-md': '8px',
        'linear-lg': '12px',
        'linear-xl': '16px',
      },
      boxShadow: {
        'magic-sheen': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
        'magic-btn': '0 1px 2px rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)',
        'magic-card': '0 0 0 1px #232636, 0 2px 4px rgba(0, 0, 0, 0.2)',
        'magic-popover': '0 12px 36px rgba(0, 0, 0, 0.55), 0 0 0 1px #232636',
        'magic-glow': '0 0 60px -10px rgba(94, 106, 210, 0.25)',
      }
    }
  }
}
```

---

## 7. Global CSS Variables (`globals.css`)

```css
:root {
  --magic-accent: #5e6ad2;
  --magic-accent-hover: #6d78d5;
  --magic-canvas: #0b0d14;
  --magic-workspace: #10121b;
  --magic-sidebar: #090a0f;
  --magic-surface: #161824;
  --magic-popover: #161722;
  --magic-border: #232636;
  --magic-divider: #1b1e2c;
  --magic-text: #f7f8f8;
  --magic-text-muted: #8a8f98;
}

body {
  background-color: var(--magic-canvas);
  color: var(--magic-text);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## 8. Complete Admin Panel Component Templates

### A. Full Admin Settings / Preferences Layout
```html
<div class="flex h-screen bg-[#0b0d14] text-[#f7f8f8] font-sans antialiased overflow-hidden">
  
  <!-- Sidebar -->
  <aside class="w-60 bg-[#090a0f] border-r border-[#232636] flex flex-col p-3 gap-4 shrink-0">
    <div class="px-2.5 flex items-center justify-between">
      <span class="text-sm font-semibold text-white tracking-tight">Admin Console</span>
      <span class="w-2 h-2 rounded-full bg-[#5e6ad2]"></span>
    </div>

    <div class="relative px-1">
      <input 
        type="text" 
        placeholder="Search settings..." 
        class="w-full h-8 px-2.5 bg-white/[0.04] border border-[#232636] focus:border-[#5e6ad2] rounded-md text-xs text-white placeholder-white/40 focus:outline-none transition-colors"
      />
    </div>

    <nav class="flex-1 space-y-4 overflow-y-auto">
      <div>
        <div class="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]/60">Account</div>
        <div class="space-y-0.5">
          <a href="#" class="h-7 px-2.5 rounded-md text-[13px] font-medium flex items-center bg-white/[0.08] text-white">Preferences</a>
          <a href="#" class="h-7 px-2.5 rounded-md text-[13px] font-medium flex items-center text-[#8a8f98] hover:text-white hover:bg-white/[0.04] transition-colors">Profile</a>
          <a href="#" class="h-7 px-2.5 rounded-md text-[13px] font-medium flex items-center text-[#8a8f98] hover:text-white hover:bg-white/[0.04] transition-colors">Security</a>
        </div>
      </div>
      <div>
        <div class="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]/60">System</div>
        <div class="space-y-0.5">
          <a href="#" class="h-7 px-2.5 rounded-md text-[13px] font-medium flex items-center text-[#8a8f98] hover:text-white hover:bg-white/[0.04] transition-colors">Webhooks</a>
          <a href="#" class="h-7 px-2.5 rounded-md text-[13px] font-medium flex items-center text-[#8a8f98] hover:text-white hover:bg-white/[0.04] transition-colors">API Keys</a>
          <a href="#" class="h-7 px-2.5 rounded-md text-[13px] font-medium flex items-center text-[#8a8f98] hover:text-white hover:bg-white/[0.04] transition-colors">Audit Logs</a>
        </div>
      </div>
    </nav>
  </aside>

  <!-- Main Content Area -->
  <main class="flex-1 bg-[#10121b] overflow-y-auto px-10 py-8">
    <div class="max-w-[680px] mx-auto space-y-6">
      
      <div>
        <h1 class="text-xl font-semibold text-[#f7f8f8] tracking-tight">Preferences</h1>
        <p class="text-xs text-[#8a8f98] mt-1">Manage your workspace visual styles and operational defaults.</p>
      </div>

      <!-- Section: Interface & Theme -->
      <section>
        <h2 class="text-sm font-semibold text-[#f7f8f8] mb-3">Interface and theme</h2>
        
        <div class="bg-[#161824] border border-[#232636] rounded-xl overflow-hidden divide-y divide-[#1b1e2c]">
          
          <!-- Row: Theme Selector -->
          <div class="flex items-center justify-between px-4 py-3.5">
            <div>
              <div class="text-[13px] font-medium text-[#f7f8f8]">Interface theme</div>
              <div class="text-xs text-[#8a8f98] mt-0.5">Select your color scheme</div>
            </div>
            <button class="h-8 px-3 bg-[#161824] hover:bg-white/[0.06] border border-[#232636] rounded-md text-[13px] font-medium text-[#f7f8f8] flex items-center gap-2 transition-all">
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white/[0.08] rounded text-[11px]">
                <span class="w-1.5 h-1.5 rounded-full bg-[#5e6ad2]"></span>
                <span>Aa</span>
              </span>
              <span>Magic Blue</span>
              <svg class="w-3.5 h-3.5 text-[#8a8f98]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>

          <!-- Row: Active Toggle -->
          <div class="flex items-center justify-between px-4 py-3.5">
            <div>
              <div class="text-[13px] font-medium text-[#f7f8f8]">Real-time Live Synchronization</div>
              <div class="text-xs text-[#8a8f98] mt-0.5">Synchronize updates across browsers via WebSocket</div>
            </div>
            <button role="switch" aria-checked="true" class="w-9 h-5 bg-[#5e6ad2] rounded-full relative p-0.5 transition-colors focus:outline-none">
              <span class="w-4 h-4 bg-white rounded-full block shadow-sm transform translate-x-4 transition-transform duration-200 ease-in-out"></span>
            </button>
          </div>

          <!-- Row: Inactive Toggle -->
          <div class="flex items-center justify-between px-4 py-3.5">
            <div>
              <div class="text-[13px] font-medium text-[#f7f8f8]">Reduce animations</div>
              <div class="text-xs text-[#8a8f98] mt-0.5">Minimize UI transitions and particle effects</div>
            </div>
            <button role="switch" aria-checked="false" class="w-9 h-5 bg-white/20 hover:bg-white/30 rounded-full relative p-0.5 transition-colors focus:outline-none">
              <span class="w-4 h-4 bg-white rounded-full block shadow-sm transform translate-x-0 transition-transform duration-200 ease-in-out"></span>
            </button>
          </div>

        </div>
      </section>

      <!-- Section: Notifications -->
      <section>
        <h2 class="text-sm font-semibold text-[#f7f8f8] mb-3">Notification delivery</h2>
        
        <div class="bg-[#161824] border border-[#232636] rounded-xl overflow-hidden divide-y divide-[#1b1e2c]">
          <div class="flex items-center justify-between px-4 py-3.5">
            <div>
              <div class="text-[13px] font-medium text-[#f7f8f8]">Daily summary report</div>
              <div class="text-xs text-[#8a8f98] mt-0.5">Email high-priority system alerts and digest at 09:00 UTC</div>
            </div>
            <button class="h-8 px-3.5 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-[#232636] text-[13px] font-medium rounded-md transition-colors">
              Configure
            </button>
          </div>
        </div>
      </section>

    </div>
  </main>
</div>
```

---

### B. Primary & Secondary Buttons
```html
<!-- Primary Action Button -->
<button class="h-8 px-3.5 bg-[#5e6ad2] hover:bg-[#6d78d5] active:bg-[#4e5ac0] text-white text-[13px] font-medium rounded-md shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.3)] transition-all flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#5e6ad2]/50">
  <span>Save changes</span>
</button>

<!-- Secondary Ghost Button -->
<button class="h-8 px-3 bg-[#161824] hover:bg-white/[0.06] active:bg-white/[0.08] text-[#f7f8f8] border border-[#232636] text-[13px] font-medium rounded-md transition-colors flex items-center gap-1.5">
  <svg class="w-3.5 h-3.5 text-[#8a8f98]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
  </svg>
  <span>Add Filter</span>
</button>
```

---

### C. Floating Popover Dropdown Menu
```html
<div class="w-56 bg-[#161722] border border-[#232636] rounded-lg p-1 shadow-[0_12px_36px_rgba(0,0,0,0.55),0_0_0_1px_#232636]">
  <div class="px-2 py-1 text-[11px] font-semibold text-[#8a8f98]/60 uppercase tracking-wider">Themes</div>
  
  <div class="h-7 px-2.5 rounded-md flex items-center justify-between text-xs text-[#8a8f98] hover:bg-white/[0.06] hover:text-white cursor-pointer transition-colors">
    <span class="flex items-center gap-2">
      <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
      Dark
    </span>
  </div>

  <div class="h-7 px-2.5 rounded-md flex items-center justify-between text-xs text-[#f7f8f8] font-medium bg-white/[0.08] cursor-pointer">
    <span class="flex items-center gap-2">
      <span class="w-1.5 h-1.5 rounded-full bg-[#5e6ad2]"></span>
      Magic Blue
    </span>
    <svg class="w-3.5 h-3.5 text-[#5e6ad2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
    </svg>
  </div>
</div>
```

---

### D. Data Table / List Row Item
```html
<div class="h-10 px-4 flex items-center justify-between border-b border-[#1b1e2c] hover:bg-white/[0.02] transition-colors cursor-pointer text-[13px]">
  <div class="flex items-center gap-3">
    <div class="w-2 h-2 rounded-full bg-emerald-400"></div>
    <span class="text-[#f7f8f8] font-medium">Orders Queue Ingestion</span>
    <span class="px-1.5 py-0.5 text-[11px] font-mono text-[#8a8f98] bg-white/[0.04] border border-[#232636] rounded-[3px]">
      POST /api/v1/orders
    </span>
  </div>
  <div class="flex items-center gap-3">
    <span class="text-xs text-[#8a8f98]">Active</span>
    <kbd class="px-1.5 py-0.5 text-[10px] font-mono text-[#8a8f98]/60 bg-white/[0.04] border border-[#232636] rounded-[3px]">
      ⌘E
    </kbd>
  </div>
</div>
```

---

### E. KPI / Stat Card
```html
<div class="bg-[#161824] border border-[#232636] rounded-xl p-4 shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
  <div class="flex items-center justify-between text-[#8a8f98] text-xs font-medium">
    <span>Active Subscriptions</span>
    <span class="text-emerald-400 text-[11px] font-mono">+12.4%</span>
  </div>
  <div class="text-2xl font-semibold text-[#f7f8f8] tracking-tight mt-2">
    1,428
  </div>
  <div class="text-xs text-[#8a8f98] mt-1">
    Updated 2 minutes ago
  </div>
</div>
```
