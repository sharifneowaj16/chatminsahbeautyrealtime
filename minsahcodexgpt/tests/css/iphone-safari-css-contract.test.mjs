import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('Phase 1 Contract: app/layout.tsx exports viewport with viewportFit: cover for iOS safe-area', () => {
  const layoutPath = path.resolve('app/layout.tsx');
  assert.ok(fs.existsSync(layoutPath), 'app/layout.tsx must exist');
  const src = fs.readFileSync(layoutPath, 'utf8');

  assert.ok(src.includes("viewportFit: 'cover'"), "app/layout.tsx must specify viewportFit: 'cover' for iOS safe-area inset support");
  assert.ok(src.includes("width: 'device-width'"), "app/layout.tsx must specify width: 'device-width'");
  assert.ok(src.includes('export const viewport: Viewport'), 'app/layout.tsx must export viewport: Viewport');
});

test('Phase 2 Contract: app/globals.css eliminates tap-highlight and enforces 16px mobile input zoom prevention', () => {
  const cssPath = path.resolve('app/globals.css');
  assert.ok(fs.existsSync(cssPath), 'app/globals.css must exist');
  const src = fs.readFileSync(cssPath, 'utf8');

  // Verify tap highlight removal
  assert.ok(src.includes('-webkit-tap-highlight-color: transparent'), 'globals.css must reset -webkit-tap-highlight-color to transparent');

  // Verify mobile 16px zoom prevention rule
  assert.ok(src.includes('@media screen and (max-width: 768px)'), 'globals.css must contain mobile media query for touch inputs');
  assert.ok(src.includes('font-size: 16px !important'), 'globals.css must enforce 16px font-size on mobile inputs to prevent iOS auto-zoom');
});

test('Phase 2 Contract: CartDrawer coupon input prevents iOS zoom on focus', () => {
  const drawerPath = path.resolve('components/cart/CartDrawer.tsx');
  assert.ok(fs.existsSync(drawerPath), 'CartDrawer must exist');
  const src = fs.readFileSync(drawerPath, 'utf8');

  assert.ok(src.includes('text-base md:text-xs'), 'CartDrawer coupon input must use text-base on mobile to avoid iOS Safari zoom');
});

test('Phase 3 Contract: SeedMediaMatrix enforces WebKit video mask isolation', () => {
  const matrixPath = path.resolve('app/(storefront)/products/[id]/components/benefits/SeedMediaMatrix.tsx');
  assert.ok(fs.existsSync(matrixPath), 'SeedMediaMatrix must exist');
  const src = fs.readFileSync(matrixPath, 'utf8');

  assert.ok(src.includes("WebkitMaskImage: '-webkit-radial-gradient(white, black)'"), 'SeedMediaMatrix video container must specify WebkitMaskImage');
  assert.ok(src.includes('isolate'), 'SeedMediaMatrix video container must use isolate stacking');
  assert.ok(src.includes("transform: 'translateZ(0)'"), 'SeedMediaMatrix video container must force hardware layer compositing');
});

test('Phase 3 Contract: BottomNavigation provides WebKit backdrop filter fallback', () => {
  const navPath = path.resolve('components/navigation/BottomNavigation.tsx');
  assert.ok(fs.existsSync(navPath), 'BottomNavigation must exist');
  const src = fs.readFileSync(navPath, 'utf8');

  assert.ok(src.includes("WebkitBackdropFilter: 'blur(12px)'"), 'BottomNavigation must provide WebkitBackdropFilter fallback');
  assert.ok(src.includes('minsah-bottom-safe'), 'BottomNavigation must have minsah-bottom-safe class');
});

test('Phase 4 Contract: SeedTimelineList optimizes mobile touch latency and accessiblity', () => {
  const timelinePath = path.resolve('app/(storefront)/products/[id]/components/benefits/SeedTimelineList.tsx');
  assert.ok(fs.existsSync(timelinePath), 'SeedTimelineList must exist');
  const src = fs.readFileSync(timelinePath, 'utf8');

  assert.ok(src.includes("role={isDesktop ? undefined : \"button\"}"), 'Mobile timeline items must declare button role for iOS hit-testing');
  assert.ok(src.includes("touchAction: 'manipulation'"), 'Mobile timeline items must declare touch-action manipulation to drop 300ms delay');
  assert.ok(src.includes('tabIndex={isDesktop ? undefined : 0}'), 'Mobile timeline items must support keyboard navigation');
});
