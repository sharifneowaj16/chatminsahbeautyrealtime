import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const shopUrl = process.env.PLAYWRIGHT_SHOP_URL || '/shop';

async function expectNoA11yViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .disableRules(['color-contrast'])
    .analyze();

  expect(results.violations, `${label} accessibility violations`).toEqual([]);
}

test.describe('Phase 7B mobile shop accessibility', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('shop, filter drawer, and sort sheet pass axe smoke checks', async ({ page }) => {
    await page.goto(shopUrl, { waitUntil: 'networkidle' });
    await expect(page.getByRole('button', { name: /filter/i })).toBeVisible();
    await expectNoA11yViolations(page, 'shop page');

    await page.getByRole('button', { name: /filter/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel(/search brands/i)).toBeVisible();
    await expectNoA11yViolations(page, 'filter drawer');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    await page.getByRole('button', { name: /sort/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('option', { name: /biggest discount/i })).toBeVisible();
    await expectNoA11yViolations(page, 'sort sheet');
  });
});
