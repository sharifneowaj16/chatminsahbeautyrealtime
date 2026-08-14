import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const evidenceDir = path.resolve('docs/release/evidence/fcp-03/screenshots');
fs.mkdirSync(evidenceDir, { recursive: true });

const mobileViewports = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
] as const;

for (const viewport of mobileViewports) {
  test(`storefront shell has one landmark set and no bottom-nav overlap at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, user: null, items: [], suggestions: [], data: [] }),
      });
    });
    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await page.locator('main#main-content').waitFor();
    await expect(page.locator('header')).toHaveCount(1);
    await expect(page.locator('main#main-content')).toHaveCount(1);
    await expect(page.locator('footer')).toHaveCount(1);

    const bottomNav = page.getByRole('navigation', { name: 'Primary mobile navigation' });
    await expect(bottomNav).toBeVisible();
    await expect(bottomNav.getByRole('link')).toHaveCount(5);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(100);

    const geometry = await page.evaluate(() => {
      const footer = document.querySelector('footer');
      const nav = document.querySelector('nav[aria-label="Primary mobile navigation"]');
      if (!footer || !nav) return null;
      const footerRect = footer.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();
      return {
        footerBottom: footerRect.bottom,
        navTop: navRect.top,
        navBottom: navRect.bottom,
        viewportHeight: window.innerHeight,
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry!.footerBottom).toBeLessThanOrEqual(geometry!.navTop + 1);
    expect(Math.abs(geometry!.navBottom - geometry!.viewportHeight)).toBeLessThanOrEqual(1);

    await page.screenshot({
      path: path.join(evidenceDir, `about-${viewport.width}.png`),
      fullPage: false,
    });
  });
}

test('desktop shell hides mobile navigation and preserves one header/footer/main', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.route('**/api/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: null, items: [], suggestions: [], data: [] }) });
  });
  await page.goto('/about', { waitUntil: 'domcontentloaded' });
  await page.locator('main#main-content').waitFor();

  await expect(page.locator('header')).toHaveCount(1);
  await expect(page.locator('main#main-content')).toHaveCount(1);
  await expect(page.locator('footer')).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Primary mobile navigation' })).toBeHidden();

  await page.screenshot({ path: path.join(evidenceDir, 'about-desktop-1280.png'), fullPage: false });
});

test('skip link and mobile menu are keyboard operable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: null, items: [], suggestions: [], data: [] }) });
  });
  await page.goto('/about', { waitUntil: 'domcontentloaded' });
  await page.locator('main#main-content').waitFor();

  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Skip to content' });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#main-content')).toBeFocused();

  const menuButton = page.getByRole('button', { name: 'Open navigation menu' });
  await menuButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Close navigation menu' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
});
