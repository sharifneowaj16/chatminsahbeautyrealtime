import { expect, test } from '@playwright/test';

const superAdmin = {
  id: 'phase1-super-admin',
  name: 'Phase 1 QA',
  email: 'phase1@example.com',
  role: 'SUPER_ADMIN',
  permissions: [],
};

const snapshot = {
  status: 'OK',
  windowHours: 24,
  since: '2026-07-09T00:00:00.000Z',
  until: '2026-07-10T00:00:00.000Z',
  metrics: {
    ordersCreated: 1,
    codPhoneConfirmed: 1,
    onlinePaid: 0,
    expectedMetaPurchases: 1,
    expectedTikTokPurchases: 1,
    metaPurchaseSent: 1,
    gaPurchaseSent: 1,
    tiktokEventsApiEnabled: true,
    tiktokPurchaseLiveVerified: true,
    tiktokPurchaseSent: 1,
    pendingTiktokPurchaseOrders: 0,
    tiktokFailures: 0,
    tiktokFinalFailures: 0,
    tiktokTokenInvalidFailures: 0,
    tiktokMatchBaseOrders: 1,
    tiktokClickIdOrders: 1,
    tiktokTtpOrders: 1,
    tiktokIpUaOrders: 1,
    tiktokClickIdCoverage: 1,
    tiktokTtpCoverage: 1,
    tiktokIpUaCoverage: 1,
    capiFailures: 0,
    capiFinalFailures: 0,
    tokenInvalidFailures: 0,
    pendingMetaPurchaseOrders: 0,
    pendingGaPurchaseOrders: 0,
    gaFailures: 0,
    gaFinalFailures: 0,
    gaRefundEligible: 0,
    gaRefundSent: 0,
    pendingGaRefundOrders: 0,
    gaClientIdMissingOrders: 0,
    gaClientIdMissingRate: 0,
    referralExclusionsVerified: true,
    recentFailureCount: 0,
  },
  queue: {
    waiting: 0,
    active: 0,
    delayed: 0,
    failed: 0,
    completed: 1,
    paused: 0,
    waitingChildren: 0,
  },
  issues: [],
  notes: 'Phase 1 route-render fixture',
};

test('SUPER_ADMIN can render the tracking-health dashboard', async ({ context, page, baseURL }) => {
  if (!baseURL) throw new Error('Playwright baseURL is required');

  await context.addCookies([
    {
      name: 'admin_refresh_token',
      value: 'phase1-route-render-test',
      url: baseURL,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/admin/auth/me') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: superAdmin }) });
      return;
    }

    if (url.pathname === '/api/admin/tracking-health') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, snapshot, failures: [], history: [] }),
      });
      return;
    }

    if (url.pathname === '/api/admin/tracking/ga4-qa' || url.pathname === '/api/admin/tracking/privacy-catalog-qa') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ snapshot: null }) });
      return;
    }

    if (url.pathname === '/api/admin/inventory') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ inventory: [], shortlist: [], suppliers: [], purchaseOrders: [], categories: [], stats: {} }),
      });
      return;
    }

    if (url.pathname === '/api/categories') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ categories: [] }) });
      return;
    }

    if (url.pathname === '/api/social/messages') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ unreadCount: 0 }) });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/admin/tracking-health');

  await expect(page.getByRole('heading', { name: 'Tracking Health Dashboard' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'TikTok Events API Health' })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
