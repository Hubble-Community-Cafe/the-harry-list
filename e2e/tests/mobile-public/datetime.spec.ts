import { test, expect } from '@playwright/test';
import { ReservationFormPage } from '../../pages/ReservationFormPage';
import { resetBackend } from '../../fixtures/backend';
import { captureScreenshot } from '../../fixtures/evidence';

/**
 * Mobile date/time fields (#253): on a phone viewport the date and time controls must
 * render and be usable (the bug was them overlapping / not loading). Runs under the
 * mobile-public project (iPhone 13).
 */
test.describe('mobile: date & time fields', () => {
  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
  });

  test('date and time fields render and accept input on mobile', async ({ page }, testInfo) => {
    const form = new ReservationFormPage(page);
    await form.goto();
    await form.fillContact({ name: 'Mobile User', email: 'mobile@example.com' });
    await form.continue();
    await form.expectStep('Event Details');

    const date = page.getByTestId('event-date');
    const start = page.getByTestId('start-time');
    const end = page.getByTestId('end-time');

    // Visible and enabled (not hidden/overlapping/disabled).
    await expect(date).toBeVisible();
    await expect(start).toBeVisible();
    await expect(end).toBeVisible();
    await expect(date).toBeEnabled();

    // And actually accept input.
    await form.fillActivity({ title: 'Mobile booking', date: '2030-09-10', startTime: '14:00', endTime: '16:00' });
    await expect(date).toHaveValue('2030-09-10');
    await expect(start).toHaveValue('14:00');
    await expect(end).toHaveValue('16:00');
    await captureScreenshot(testInfo, page, '1-mobile-datetime-filled');
  });
});
