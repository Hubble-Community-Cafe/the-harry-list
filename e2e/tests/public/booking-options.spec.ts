import { test, expect } from '@playwright/test';
import { ReservationFormPage } from '../../pages/ReservationFormPage';
import { resetBackend } from '../../fixtures/backend';
import { clearMailbox, waitForEmailTo } from '../../fixtures/mailpit';
import { captureScreenshot, attachHtml } from '../../fixtures/evidence';

/**
 * A second accepted booking exercising more of the options than the basic happy path:
 * organization + phone, a special activity, a concrete location (Hubble), outside seating,
 * and invoice payment with an invoice type + cost centre.
 */
test.describe('public: booking with many options', () => {
  const CONTACT = { name: 'Org Booker', email: 'org.booker@example.com' };

  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await clearMailbox(request);
  });

  test('accepts a Hubble + special activity + invoice booking', async ({ page, request }, testInfo) => {
    const form = new ReservationFormPage(page);
    await form.goto();

    // Step 1 — contact, with organization + phone.
    await form.fillContact(CONTACT);
    await page.locator('input[name="phoneNumber"]').fill('+31 6 12345678');
    await page.locator('input[name="organizationName"]').fill('Study Association E2E');
    await form.continue();

    // Step 2 — activity + a special activity.
    await form.expectStep('Activity Details');
    await form.fillActivity({ title: 'Graduation drinks', date: '2030-09-18', guests: 40 });
    await form.toggleActivity('Graduation / PhD Defense');
    await form.continue();

    // Step 3 — Hubble, outside.
    await form.expectStep('Where would you like to host your event?');
    await form.selectLocation('HUBBLE');
    await form.selectSeating('OUTSIDE');
    await form.continue();

    // Step 4 — invoice payment with type + cost centre.
    await form.expectStep('Payment Information');
    await form.selectPayment('Invoice (>50 euros only)');
    await page.locator('select[name="invoiceType"]').selectOption('TUE');
    await page.locator('input[name="costCenter"]').fill('CC-12345');
    await captureScreenshot(testInfo, page, '1-invoice-payment');
    await form.continue();

    // Step 5 — confirm.
    await form.expectStep('Review & Confirm');
    await form.acceptTerms();
    await form.submit();

    await expect(page.getByText('Reservation Submitted!')).toBeVisible();
    await captureScreenshot(testInfo, page, '2-confirmation');

    const email = await waitForEmailTo(request, CONTACT.email);
    await attachHtml(testInfo, 'confirmation-email.html', email.HTML);
    expect(email.HTML).toContain('Graduation drinks');
  });
});
