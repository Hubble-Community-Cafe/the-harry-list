import { test, expect } from '@playwright/test';
import { ReservationFormPage } from '../../pages/ReservationFormPage';
import { resetBackend } from '../../fixtures/backend';
import { clearMailbox, waitForEmailTo } from '../../fixtures/mailpit';
import { captureScreenshot, attachHtml } from '../../fixtures/evidence';

/**
 * The golden path: a guest completes all five steps with nothing in the way, the
 * reservation is created, and the confirmation email is delivered. Captures a screenshot
 * at every step plus the actual delivered email as report evidence.
 */
test.describe('public: full booking happy path', () => {
  const CONTACT = { name: 'Alex Tester', email: 'alex.happy@example.com' };
  const ACTIVITY = {
    title: 'Summer Drinks 2030',
    date: '2030-09-10',
    startTime: '14:00',
    endTime: '16:00',
    guests: 20,
  };

  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await clearMailbox(request);
  });

  test('submits a reservation end-to-end and emails the guest', async ({ page, request }, testInfo) => {
    const form = new ReservationFormPage(page);

    // Step 1 — Contact
    await form.goto();
    await form.fillContact(CONTACT);
    await captureScreenshot(testInfo, page, '1-contact');
    await form.continue();

    // Step 2 — Activity
    await form.expectStep('Activity Details');
    await form.fillActivity(ACTIVITY);
    await captureScreenshot(testInfo, page, '2-activity');
    await form.continue();

    // Step 3 — Location & seating
    await form.expectStep('Where would you like to host your event?');
    await form.selectLocation('NO_PREFERENCE');
    await form.selectSeating('INSIDE');
    await captureScreenshot(testInfo, page, '3-location');
    await form.continue();

    // Step 4 — Payment
    await form.expectStep('Payment Information');
    await form.selectPayment('People pay individually');
    await captureScreenshot(testInfo, page, '4-payment');
    await form.continue();

    // Step 5 — Confirm
    await form.acceptTerms();
    await captureScreenshot(testInfo, page, '5-review');
    await form.submit();

    // Confirmation screen
    await expect(page.getByText('Reservation Submitted!')).toBeVisible();
    await expect(page.getByText(CONTACT.email)).toBeVisible();
    await captureScreenshot(testInfo, page, '6-confirmation');

    // The guest actually receives the confirmation email.
    const email = await waitForEmailTo(request, CONTACT.email);
    await attachHtml(testInfo, 'confirmation-email.html', email.HTML);
    expect(email.HTML).toContain(ACTIVITY.title);
  });
});
