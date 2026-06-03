import { test, expect } from '@playwright/test';
import { AdminSettingsPage } from '../../pages/AdminSettingsPage';
import { resetBackend, seedUser } from '../../fixtures/backend';
import { captureScreenshot } from '../../fixtures/evidence';

/**
 * Admin can configure a soft block through the real UI (#254). The admin app authenticates
 * via the e2e header bridge as the seeded "e2e-admin" user.
 */
test.describe('admin: manage blocked periods', () => {
  test.beforeEach(async ({ request }) => {
    // The admin SPA sends X-Test-Oid=e2e-admin (docker-compose.e2e.yml); give it a role.
    await resetBackend(request);
    await seedUser(request, { oid: 'e2e-admin', email: 'admin@e2e.test', role: 'ADMIN' });
  });

  test('creates a soft block and shows the "Soft block" badge', async ({ page }, testInfo) => {
    const settings = new AdminSettingsPage(page);
    await settings.goto();
    await settings.openBlockedPeriodsTab();

    await settings.createBlockedPeriod({
      startDate: '2030-07-01',
      endDate: '2030-08-31',
      reason: 'Summer closing',
      publicMessage: 'Open on request only',
      soft: true,
      acknowledgementText: 'I understand the bar may be closed',
    });

    await expect(settings.blockedPeriodRows()).toHaveCount(1);
    await expect(settings.softBlockBadge()).toBeVisible();
    await captureScreenshot(testInfo, page, '1-soft-block-created');
  });
});
