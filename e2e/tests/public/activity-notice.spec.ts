import { test, expect } from '@playwright/test';
import { ReservationFormPage } from '../../pages/ReservationFormPage';
import { resetBackend, seedConstraint } from '../../fixtures/backend';
import { captureScreenshot } from '../../fixtures/evidence';

/**
 * An ACTIVITY_NOTICE constraint shows an advisory message when its trigger activity is
 * selected (e.g. "a private event at Meteor costs money"), without blocking the booking.
 * Representative of the form surfacing configured, non-enforcing notices.
 */
test.describe('public: activity notice', () => {
  const NOTICE = 'A private event at Meteor has an additional charge.';

  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await seedConstraint(request, {
      constraintType: 'ACTIVITY_NOTICE',
      triggerActivity: 'PRIVATE_EVENT',
      message: NOTICE,
    });
  });

  test('shows the notice when the activity is selected and hides it when deselected', async ({ page }, testInfo) => {
    const form = new ReservationFormPage(page);
    await form.goto();
    await form.fillContact({ name: 'Nora Notice', email: 'nora.notice@example.com' });
    await form.continue();
    await form.expectStep('Event Details');

    // No notice until the triggering activity is chosen.
    await expect(form.activityNotices()).toHaveCount(0);

    await form.toggleActivity('Private event');
    await expect(form.activityNotices()).toHaveText(NOTICE);
    await captureScreenshot(testInfo, page, '1-notice-shown');

    // Deselecting the activity removes the notice — it is purely advisory.
    await form.toggleActivity('Private event');
    await expect(form.activityNotices()).toHaveCount(0);
  });
});
