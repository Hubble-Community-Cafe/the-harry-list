import { test, expect } from '@playwright/test';
import { resetBackend, seedAdmin } from '../../fixtures/backend';
import { THEMES, useTheme, expectNoA11yViolations } from '../../fixtures/a11y';
import { BACKEND_URL } from '../../playwright.config';

/**
 * The admin UI follows the backend's staff-group check: /api/admin/users/me answers 403
 * NOT_IN_STAFF_GROUP for a tenant member outside the group, and the UI then shows Access denied
 * instead of the app. Members see the app as before. The e2e backend runs with
 * ALLOWED_GROUP_ID=e2e-staff-group; adding X-Test-Groups to the page's API calls signs in as
 * someone outside it.
 */
test.describe('admin: access follows the backend staff-group check', () => {
  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await seedAdmin(request);
  });

  test('a staff group member gets the dashboard', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Access denied' })).toHaveCount(0);
  });

  for (const theme of THEMES) {
    test(`someone outside the staff group sees Access denied and the app makes no other calls (${theme})`, async ({ page }, testInfo) => {
      const apiCalls: string[] = [];
      await page.route(`${BACKEND_URL}/api/**`, async (route) => {
        apiCalls.push(new URL(route.request().url()).pathname);
        await route.continue({ headers: { ...route.request().headers(), 'X-Test-Groups': 'some-other-group' } });
      });
      await useTheme(page, theme);

      await page.goto('/');

      await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign out and try again' })).toBeVisible();
      await expect(page.getByRole('navigation')).toHaveCount(0);
      expect(apiCalls.every((path) => path === '/api/admin/users/me'), `API calls: ${apiCalls.join(', ')}`).toBe(true);
      await expectNoA11yViolations(page, testInfo, `${theme} access denied`);
    });
  }
});
