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

/**
 * A notice configured with targetValue=CONFIRM must be acknowledged in a dialog before the
 * activity is selected at all, so an easily-missed banner becomes a deliberate choice.
 */
test.describe('public: activity notice requiring confirmation', () => {
  const NOTICE = 'Graduations require a deposit paid in advance.';

  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await seedConstraint(request, {
      constraintType: 'ACTIVITY_NOTICE',
      triggerActivity: 'GRADUATION',
      targetValue: 'CONFIRM',
      message: NOTICE,
    });
  });

  test('declining leaves the activity unselected, confirming selects it', async ({ page }, testInfo) => {
    const form = new ReservationFormPage(page);
    await form.goto();
    await form.fillContact({ name: 'Cara Confirm', email: 'cara.confirm@example.com' });
    await form.continue();
    await form.expectStep('Event Details');

    const graduation = page.getByRole('checkbox', { name: 'Graduation / PhD Defense' });

    // Selecting opens the dialog; the activity is not selected yet.
    await form.toggleActivity('Graduation / PhD Defense');
    await expect(form.activityNoticeDialog()).toBeVisible();
    await expect(form.activityNoticeDialog()).toContainText(NOTICE);
    await expect(graduation).toHaveAttribute('aria-checked', 'false');
    await captureScreenshot(testInfo, page, '1-confirmation-dialog');

    // Declining reverts cleanly — no activity, no banner.
    await form.declineActivityNotice();
    await expect(form.activityNoticeDialog()).toHaveCount(0);
    await expect(graduation).toHaveAttribute('aria-checked', 'false');
    await expect(form.activityNotices()).toHaveCount(0);

    // Confirming selects the activity and leaves the banner as a reminder.
    await form.toggleActivity('Graduation / PhD Defense');
    await form.confirmActivityNotice();
    await expect(form.activityNoticeDialog()).toHaveCount(0);
    await expect(graduation).toHaveAttribute('aria-checked', 'true');
    await expect(form.activityNotices()).toHaveText(NOTICE);
    await captureScreenshot(testInfo, page, '2-confirmed-and-selected');
  });
});
