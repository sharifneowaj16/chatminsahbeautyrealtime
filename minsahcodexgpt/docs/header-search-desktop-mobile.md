# Header search — desktop and mobile

Element: `header.site-header .search-area .search-shell`  
Text shown in the shell: `⌘ + K`  
Status: scoped only. This file is the fix. It is not applied in the code.

The desktop bar never shows results, and the mobile shortcut never opens search. Both come from the same header search.

## What is broken

The desktop shell sits inside `LinearDarkSearchWrapper`:

```tsx
// components/search/variants/LinearDarkSearchWrapper.tsx
<div className="relative w-full rounded-2xl ... overflow-hidden">
  {children}
</div>
```

`HomeSearch` draws the result panel as `position: absolute; top: 48px` inside that wrapper. Three ancestors clip it:

- `LinearDarkSearchWrapper` — `overflow-hidden` (Royal Forest and Dual Segmented wrappers do the same)
- `.header-main` — `overflow-hidden` in `components/layout/SiteHeader.tsx`
- `header.site-header` — `overflow-x-hidden`, which also clips vertical overflow

On desktop, ⌘/Ctrl+K can focus the field, but the panel (about 660px wide, centered with `left: 50% !important` in `app/globals.css`) is cut off at the 44px bar. Typing looks like it does nothing.

On mobile the same two `HomeSearch` instances stay mounted. `hidden lg:block` and `hidden md:block lg:hidden` only set `display: none`. Each one still registers its own ⌘/Ctrl+K listener and focuses its own input. Below 768px both inputs are hidden, so the shortcut focuses nothing and does not open the overlay. The `/` key in `SiteHeader` does open it, which is why the phone badge says `/` while the desktop badge says `⌘ + K`.

The header button opens `HomeSearch` full screen. `IOSSearchModalOverlay` in `app/layout.tsx` is a second search UI and only opens on `minsah:open-search`, which the header never fires.

## Fix code

### 1. `app/components/HomeSearch.tsx` — delete the window shortcut

Remove the “Global ⌘ + K” effect (the `window.addEventListener('keydown', handleGlobalKeyDown)` block). One header listener replaces it.

### 2. `app/components/HomeSearch.tsx` — paint the desktop panel on `document.body`

Add a position effect next to the other effects. Drop `absolute left-0 top-[48px]` from the desktop panel so the CSS `left: 50% !important` rule cannot override it.

```tsx
const [panelStyle, setPanelStyle] = useState<React.CSSProperties | null>(null);

useEffect(() => {
  if (!hasSuggestionsPanel || isMobileFullScreen) {
    setPanelStyle(null);
    return;
  }

  const place = () => {
    const anchor = searchRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(660, window.innerWidth - 16);
    const left = Math.min(
      Math.max(8, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - 8
    );
    setPanelStyle({
      position: 'fixed',
      top: Math.round(rect.bottom + 6),
      left: Math.round(left),
      width,
      zIndex: 220,
    });
  };

  place();
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, true);
  return () => {
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place, true);
  };
}, [hasSuggestionsPanel, isMobileFullScreen, searchQuery]);
```

Replace the desktop panel’s opening tag with:

```tsx
{hasSuggestionsPanel && panelStyle && mounted
  ? createPortal(
      <div
        className="search-desktop-split overflow-hidden rounded-2xl border-2 border-[#1c3a13]/25 bg-gradient-to-b from-white via-[#fcfdfc] to-[#f4f7f4] text-slate-900 shadow-2xl"
        style={panelStyle}
        role="presentation"
      >
        {/* existing panel children stay unchanged */}
      </div>,
      document.body
    )
  : null}
```

### 3. `app/globals.css` — stop the rule that recenters the panel

Delete this block:

```css
@media (min-width: 1024px) {
  .search-desktop-split {
    left: 50% !important;
    transform: translateX(-50%) !important;
  }
}
```

### 4. `components/layout/SiteHeader.tsx` — one shortcut for both layouts

Replace the `/`-only effect with:

```tsx
useEffect(() => {
  const onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    const typing =
      !!target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable);

    const commandK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
    const slash = event.key === '/' && !typing;
    if (!commandK && !slash) return;

    event.preventDefault();

    if (window.innerWidth < 768) {
      setMobileSearchOpen(true);
      return;
    }

    const input = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        '.search-area input, .search-area-tablet input'
      )
    ).find((el) => el.getClientRects().length > 0);

    input?.focus();
    input?.select();
  };

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}, []);
```

The mobile buttons already call `setMobileSearchOpen(true)`. After this, tap, `/`, and ⌘/Ctrl+K all open that same full-screen `HomeSearch`. Leave `IOSSearchModalOverlay` out of the header path.
