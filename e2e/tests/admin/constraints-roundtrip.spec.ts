import { test, expect } from '@playwright/test';
import { AdminSettingsPage } from '../../pages/AdminSettingsPage';
import { ReservationFormPage } from '../../pages/ReservationFormPage';
import { resetBackend, seedUser } from '../../fixtures/backend';
import { PUBLIC_BASE_URL } from '../../playwright.config';
import { captureScreenshot } from '../../fixtures/evidence';

/**
 * Round-trip: a constraint created through the admin UI is actually enforced on the public
 * form. Proves the admin editor -> persistence -> public form path is wired end-to-end.
 */
test.describe('admin: a constraint created in the UI is enforced on the public form', () => {
  const MESSAGE = 'E2E round-trip: à la carte is limited to 15 guests.';

  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await seedUser(request, { oid: 'e2e-admin', role: 'ADMIN' });
  });

  test('a guest-limit constraint blocks an over-limit public booking', async ({ page }, testInfo) => {
    // Create it via the admin UI (constraints tab is the default on Settings).
    const settings = new AdminSettingsPage(page);
    await settings.goto();
    await settings.createConstraint({
      type: 'GUEST_LIMIT',
      triggerActivity: 'EAT_A_LA_CARTE',
      numericValue: 15,
      message: MESSAGE,
    });
    await expect(settings.constraintRows().filter({ hasText: 'à la carte is limited' })).toHaveCount(1);
    await captureScreenshot(testInfo, page, '1-constraint-created-admin');

    // Now verify the public form enforces it.
    await page.goto(PUBLIC_BASE_URL);
    const form = new ReservationFormPage(page);
    await expect(page.getByText('Contact Information')).toBeVisible();
    await form.fillContact({ name: 'Jane Smith', email: 'jane@example.com' });
    await form.continue();
    await form.expectStep('Event Details');
    await form.fillActivity({ title: 'Big dinner', date: '2030-09-10', guests: 20 });
    await form.toggleActivity('Eat a la carte');

    await expect(page.getByText(MESSAGE)).toBeVisible();
    await captureScreenshot(testInfo, page, '2-constraint-enforced-public');

    await form.continue();
    await form.expectStep('Event Details'); // blocked by the constraint
  });
});
