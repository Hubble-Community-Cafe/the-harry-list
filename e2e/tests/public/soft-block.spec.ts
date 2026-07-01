import { test, expect } from '@playwright/test';
import { ReservationFormPage } from '../../pages/ReservationFormPage';
import { resetBackend, seedBlockedPeriod } from '../../fixtures/backend';
import { captureScreenshot } from '../../fixtures/evidence';

/**
 * Soft block (#254): the period is announced as a warning, the guest must acknowledge it,
 * but the booking is still allowed. Mirrors the summer-closing "open on request" scenario.
 */
test.describe('public: soft-blocked period', () => {
  const BLOCK = {
    startDate: '2030-07-01',
    endDate: '2030-08-31',
    reason: 'Summer closing',
    publicMessage: 'The bar is closed by default this summer, but you can request a reservation.',
    softBlock: true,
    acknowledgementText: 'I understand the bar may be closed and my booking is a request',
  };
  const DATE_IN_BLOCK = '2030-07-15';

  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await seedBlockedPeriod(request, BLOCK);
  });

  test('warns, gates on acknowledgement, then allows the booking to proceed', async ({ page }, testInfo) => {
    const form = new ReservationFormPage(page);
    await form.goto();

    await form.fillContact({ name: 'Jane Smith', email: 'jane@example.com' });
    await form.continue();
    await form.expectStep('Event Details');

    await form.fillActivity({ title: 'Soft block test', date: DATE_IN_BLOCK });

    // The warning and acknowledgement checkbox are shown for the soft block.
    await expect(form.blockedNotice()).toBeVisible();
    await expect(form.blockedNotice()).toContainText('closed by default this summer');
    await expect(form.softAckCheckbox()).toBeVisible();
    await captureScreenshot(testInfo, page, '1-soft-block-warning-shown');

    // Pressing Continue without acknowledging keeps us on the step and explains why.
    await form.continue();
    await form.expectStep('Event Details');
    await expect(form.softAckError()).toBeVisible();
    await captureScreenshot(testInfo, page, '2-acknowledgement-required-prompt');

    // After acknowledging, the prompt clears and the booking can proceed once seating is set.
    await form.acknowledgeSoftBlock();
    await expect(form.softAckError()).toHaveCount(0);
    await form.selectSeating('INSIDE'); // seating is required to advance the merged step
    await form.continue();
    await form.expectStep('Payment Information');
    await captureScreenshot(testInfo, page, '3-proceeded-to-payment');
  });
});
