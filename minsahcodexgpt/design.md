# design.md — Minsah Beauty Design System

> **Document role:** Visual, interaction and accessibility source of truth.  
> **Runtime sources:** `app/globals.css` and `lib/design-tokens.ts`.  
> **Last update:** 2026-07-19.

---

## 1. Brand direction

Minsah Beauty uses a warm, premium and approachable beauty-commerce visual language. The interface should feel clean and trustworthy rather than overly decorative. Cream backgrounds, deep brown actions and soft peach accents form the core identity.

Design keywords:

```text
warm
premium
soft
clean
trustworthy
mobile-first
accessible
commerce-focused
```

## 2. Color system

Use semantic tokens. Do not copy arbitrary hex colors into components.

### Surfaces

| Token | Value | Use |
|---|---:|---|
| `--color-surface-page` | `#FFFDF9` | primary page background |
| `--color-surface-panel` | `#FFFFFF` | cards, forms, panels |
| `--color-surface-elevated` | `#FFFFFF` | overlays/elevated cards |
| `--color-surface-subtle` | `#FFF8F1` | subtle sections |
| `--color-surface-soft` | `#FFF5EB` | soft emphasis |
| `--color-surface-highlight` | `#FFF7ED` | highlighted content |
| `--color-surface-accent` | `#FFE6D2` | selected/brand accent |
| `--color-surface-inverse` | `#421C00` | dark/inverse background |
| `--color-surface-disabled` | `#F5F1EC` | disabled surfaces |

### Text

| Token | Value | Use |
|---|---:|---|
| `--color-text-primary` | `#1A0D06` | headings/body |
| `--color-text-muted` | `#6B4C37` | secondary text |
| `--color-text-subtle` | `#8C735F` | metadata/helper text |
| `--color-text-inverse` | `#FFFFFF` | text on dark action/surface |
| `--color-text-disabled` | `#786A5E` | disabled labels |
| `--color-text-link` | `#64320D` | links |

### Borders and focus

| Token | Value |
|---|---:|
| `--color-border-default` | `#D6BEA7` |
| `--color-border-strong` | `#B99374` |
| `--color-border-subtle` | `#E8D5C0` |
| `--color-border-focus` | `#8E6545` |
| `--color-focus-ring` | focus border token |

### Actions

| Token | Value | Use |
|---|---:|---|
| `--color-action-primary` | `#64320D` | primary CTA |
| `--color-action-primary-hover` | `#421C00` | primary hover |
| `--color-action-secondary` | `#8E6545` | secondary action |
| `--color-action-secondary-hover` | `#64320D` | secondary hover |
| `--color-action-disabled` | `#E7DED5` | disabled action |

### Status colors

| Status | Surface | Border | Text |
|---|---|---|---|
| Info | `#EFF6FF` | `#BFDBFE` | `#1D4ED8` |
| Success | `#ECFDF5` | `#A7F3D0` | `#047857` |
| Warning | `#FFFBEB` | `#FDE68A` | `#B45309` |
| Danger | `#FEF2F2` | `#FECACA` | `#B91C1C` |

Status must use icon/text as well as color.

## 3. Typography

### Font family

Current production stack:

```css
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
"Helvetica Neue", Arial, sans-serif
```

The existing `.font-circular-std` class is currently a compatibility alias to the same system stack; it does not load a separate Circular Std font.

Do not add or distribute proprietary font files. A new web font requires performance, licensing and fallback review.

### Type scale

Recommended semantic scale:

| Role | Mobile | Desktop | Weight | Line height |
|---|---:|---:|---:|---:|
| Display | 32px | 44–48px | 700 | 1.1–1.2 |
| H1 | 28–32px | 36–40px | 700 | 1.15–1.25 |
| H2 | 24px | 30–32px | 700 | 1.2–1.3 |
| H3 | 20px | 24px | 600–700 | 1.3 |
| Body large | 18px | 18px | 400 | 1.5 |
| Body | 16px | 16px | 400 | 1.5 |
| Small | 14px | 14px | 400–600 | 1.4 |
| Microcopy | 12px minimum | 12px minimum | 500–600 | 1.33 |

The root body is 16px. Do not globally force smaller body text.

## 4. Spacing and layout

Use a 4px base rhythm where possible:

```text
4, 8, 12, 16, 20, 24, 32, 40, 48, 64px
```

Rules:

- Page content uses consistent max width and horizontal padding.
- Mobile safe-area variables own bottom navigation and sticky actions.
- Forms should use 16–24px vertical grouping.
- Related controls remain visually grouped; unrelated sections get larger separation.
- Avoid dense admin panels without headings and status grouping.

Current shell variables:

```text
header height: 4.5rem
bottom navigation: 4.5rem
safe-area bottom: env(safe-area-inset-bottom)
```

## 5. Radius and elevation

| Token | Value | Use |
|---|---:|---|
| `--radius-small` | `0.75rem` | chips, small cards |
| `--radius-control` | `1rem` | inputs/buttons |
| `--radius-panel` | `1.5rem` | cards/dialogs |
| `--radius-pill` | `9999px` | badges/pills |

Shadows:

- small: subtle content card;
- panel: dashboard/storefront panel;
- elevated: modal/drawer/floating content;
- focus: keyboard focus support, not decorative shadow.

Do not combine heavy border and heavy shadow unless a specific component calls for it.

## 6. Controls

- Minimum control height: `2.75rem` / 44px.
- Icon button target: 44px minimum.
- Primary actions use deep brown with white text.
- Secondary actions use panel/soft surface and clear border.
- Destructive actions use danger tokens and explicit confirmation.
- Disabled controls remain readable and expose disabled state semantically.
- Loading actions preserve button width and prevent duplicate submission.

## 7. Component patterns

### Product card

Required content:

- product image with stable aspect ratio;
- brand/title;
- current price and sale/base relationship;
- availability or relevant badge;
- accessible wishlist/add action;
- canonical product link.

### Product detail

- gallery and variant selection;
- price, sale window and stock feedback;
- clear primary purchase action;
- delivery/trust information;
- reviews and related products;
- sticky mobile action that respects bottom navigation safe area.

### Forms

- visible label; placeholder is not a label;
- helper/error text tied with `aria-describedby`;
- first invalid field receives focus after submit when practical;
- no hidden required rules;
- server error shown at action/section level.

### Status cards/tables

- status badge + text;
- timestamp and source;
- clear next action;
- pagination for large lists;
- mobile table fallback to stacked cards where needed.

### Dialogs and drawers

- focus trap and Escape close;
- labelled title/description;
- destructive confirmation states exact object/action;
- mobile bottom sheet must respect safe area.

### Toasts

- concise, non-sensitive and actionable;
- not the only place a blocking error appears;
- success should not imply provider completion when operation is only queued.

## 8. Storefront theme

- Primary background is warm off-white.
- Product imagery gets visual priority.
- CTAs use deep brown.
- Accent peach is used for selection/highlight, not full-page saturation.
- Marketing content should avoid excessive gradients and competing badges.
- Trust, authenticity, delivery and return information should remain clear.

## 9. Admin theme

The admin uses the same semantic tokens but prioritizes information density and state clarity:

- panel-based layout;
- persistent navigation;
- readable tables and filters;
- warning/danger states reserved for actionable issues;
- operation IDs/provider IDs shown in copyable monospaced fields when safe;
- sensitive fields redacted by default;
- critical actions require confirmation/approval context.

## 10. Responsive behavior

Breakpoints follow Tailwind conventions unless a component has a documented need.

- Mobile is the base design.
- Storefront bottom navigation appears on small screens.
- Desktop navigation/header must not duplicate active controls.
- Admin tables become horizontally scrollable or card-based, not clipped.
- Sticky headers/actions must not overlap content.
- Touch targets remain at least 44px.

## 11. Accessibility

Required:

- semantic HTML and heading order;
- keyboard navigation;
- visible `focus-visible` ring;
- form labels/errors;
- alt text for meaningful images;
- decorative images hidden from assistive technology;
- color contrast meeting WCAG AA where applicable;
- status not encoded by color alone;
- zoom up to 200% without loss of core function;
- reduced-motion behavior.

Playwright/axe checks should cover critical storefront, checkout and admin paths.

## 12. Motion

Existing safe motion includes short fade/slide/pop/pulse patterns.

Rules:

- UI feedback: normally 150–300ms.
- Page/section entrance: normally under 450ms.
- Continuous decorative animation must be rare and pause under reduced motion.
- Do not animate layout-heavy properties for large lists.
- Success pulse must not obscure state or loop indefinitely.

## 13. Icons and imagery

- Use Lucide React for interface icons.
- Keep stroke weight consistent within a surface.
- Do not mix multiple icon libraries without design approval.
- Product images use object-fit and stable dimensions to prevent layout shift.
- Remote images must pass allowed-host/security policy.
- Fallback images use approved placeholders.

## 14. Language and content

- UI may contain Bengali and English but should not switch language unpredictably within one message.
- Prices use BDT formatting consistently.
- Dates/times should be clear for Asia/Dhaka operations.
- Customer copy avoids internal provider terminology.
- Error copy states what happened and what the user can do next.

## 15. Dark mode

A full dark theme is not currently defined. Do not assume dark-mode support because a PWA theme color exists. Adding dark mode requires a complete semantic-token review, component audit and accessibility validation.

## 16. Design change process

A design-system change requires:

1. update tokens in CSS and typed token contract;
2. update this file;
3. identify compatibility aliases and migration plan;
4. visual/accessibility regression checks;
5. update `memory.md` with affected components and results.
