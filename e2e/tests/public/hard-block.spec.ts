import { test, expect } from '@playwright/test';
import { ReservationFormPage } from '../../pages/ReservationFormPage';
import { resetBackend, seedBlockedPeriod } from '../../fixtures/backend';
import { captureScreenshot } from '../../fixtures/evidence';

/**
 * Hard block (default): the date is fully unavailable — a red notice, no acknowledgement
 * option, and no way to advance. Contrast with the soft block in soft-block.spec.ts.
 */
test.describe('public: hard-blocked period', () => {
  const BLOCK = {
    startDate: '2030-07-01',
    endDate: '2030-08-31',
    reason: 'Renovation',
    publicMessage: 'Closed for renovation.',
    softBlock: false,
  };
  const DATE_IN_BLOCK = '2030-07-15';

  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await seedBlockedPeriod(request, BLOCK);
  });

  test('fully blocks the date with no acknowledgement and no way to proceed', async ({ page }, testInfo) => {
    const form = new ReservationFormPage(page);
    await form.goto();

    await form.fillContact({ name: 'Jane Smith', email: 'jane@example.com' });
    await form.continue();
    await form.expectStep('Event Details');

    await form.fillActivity({ title: 'Hard block test', date: DATE_IN_BLOCK });

    await expect(form.blockedNotice()).toBeVisible();
    await expect(form.blockedNotice()).toContainText('Closed for renovation.');
    await expect(form.blockedNotice()).toHaveAttribute('data-soft', 'false');
    // A hard block offers no acknowledgement checkbox.
    await expect(form.softAckCheckbox()).toHaveCount(0);
    await captureScreenshot(testInfo, page, '1-hard-block-shown');

    // Continue does not advance.
    await form.continue();
    await form.expectStep('Event Details');
  });
});
