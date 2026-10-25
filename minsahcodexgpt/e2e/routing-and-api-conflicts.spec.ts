import { test, expect } from '@playwright/test';

test.describe('Routing & Conflict Resolution Verification', () => {

  test('Storefront redirects unauthenticated /favourites to login with wishlist destination', async ({ page }) => {
    await page.goto('/favourites');
    await expect(page).toHaveURL(/\/login\?redirect=%2Faccount%2Fwishlist/);
  });

  test('Storefront redirects unauthenticated /wishlist to login with wishlist destination', async ({ page }) => {
    await page.goto('/wishlist');
    await expect(page).toHaveURL(/\/login\?redirect=%2Faccount%2Fwishlist/);
  });

  test('Storefront redirects /account/signin to unified /login', async ({ page }) => {
    await page.goto('/account/signin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('Storefront redirects unauthenticated /account/address/new to login', async ({ page }) => {
    await page.goto('/account/address/new');
    await expect(page).toHaveURL(/\/login\?redirect=%2Faccount%2F/);
  });

  test('Storefront redirects unauthenticated /warranty to login with warranty destination', async ({ page }) => {
    await page.goto('/warranty');
    await expect(page).toHaveURL(/\/login\?redirect=%2Faccount%2Fwarranty/);
  });

  test('Storefront redirects unauthenticated /warranty/new to login with claim destination', async ({ page }) => {
    await page.goto('/warranty/new');
    await expect(page).toHaveURL(/\/login\?redirect=%2Faccount%2Fwarranty%2Fclaim/);
  });

  test('Storefront redirects /privacy to /privacy-policy', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page).toHaveURL(/\/privacy-policy/);
  });

  test('Canonical Privacy Policy and Delete Data pages load successfully', async ({ page }) => {
    const resPrivacy = await page.goto('/privacy-policy');
    expect(resPrivacy?.status()).toBeLessThan(400);

    const resDeleteData = await page.goto('/delete-data');
    expect(resDeleteData?.status()).toBeLessThan(400);
  });

  test('API Webhook alias routes are live and responsive', async ({ request }) => {
    // Steadfast plural endpoint
    const resSteadfast = await request.post('/api/webhooks/steadfast', {
      data: { notification_type: 'ping' },
    });
    expect(resSteadfast.status()).not.toBe(404);

    // Facebook plural endpoint
    const resFacebook = await request.get('/api/webhooks/facebook');
    expect(resFacebook.status()).not.toBe(404);

    // Meta catalog feed alias
    const resFeed = await request.get('/api/meta/catalogs/feed');
    expect(resFeed.status()).not.toBe(404);

    // Offer engine public endpoint
    const resOffer = await request.get('/api/offer-engine');
    expect(resOffer.status()).toBe(200);
    const offerJson = await resOffer.json();
    expect(offerJson.success).toBe(true);
  });
});
