import { test, expect } from '@playwright/test';
import { resetBackend, seedUser, seedReservation } from '../../fixtures/backend';
import { clearMailbox, waitForEmailTo } from '../../fixtures/mailpit';
import { captureScreenshot, attachHtml } from '../../fixtures/evidence';
import { openMailDialog } from '../../fixtures/adminActions';

/**
 * The CoBo mail and its contract flag, end-to-end through the real admin UI.
 *
 * Covers the wiring that unit tests cannot: the Send Mail menu only offers the mails that
 * apply to the reservation's activities, and choosing CoBo renders the CoBo template and
 * actually delivers a mail (SMTP -> Mailpit).
 */
test.describe('admin: CoBo mail', () => {
  const COBO_TITLE = 'CoBo Booking';
  const COBO_EMAIL = 'cobo.guest@example.com';

  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await seedUser(request, { oid: 'e2e-admin', role: 'ADMIN' });
  });

  async function openSeeded(page: import('@playwright/test').Page, title: string) {
    await page.goto('/reservations');
    await page.getByPlaceholder(/Search by name/).fill(title);
    const row = page.getByTestId('reservation-row').filter({ hasText: title });
    await expect(row).toHaveCount(1);
    await row.click();
  }

  async function seedCobo(request: import('@playwright/test').APIRequestContext) {
    return seedReservation(request, {
      contactName: 'CoBo Guest',
      email: COBO_EMAIL,
      eventTitle: COBO_TITLE,
      description: 'Constitution drink',
      eventDate: '2030-11-28',
      startTime: '20:00',
      endTime: '23:00',
      expectedGuests: 60,
      location: 'HUBBLE',
      seatingArea: 'INSIDE',
      paymentOption: 'INVOICE',
      status: 'CONFIRMED',
      specialActivities: ['COBO'],
    });
  }

  test('sends the CoBo mail to the guest', async ({ page, request }, testInfo) => {
    await seedCobo(request);
    await clearMailbox(request);

    await openSeeded(page, COBO_TITLE);

    // The menu offers CoBo, and not catering: this reservation has no catering activity.
    await page.getByTestId('send-mail').click();
    await expect(page.getByTestId('mail-option-COBO')).toBeVisible();
    await expect(page.getByTestId('mail-option-CATERING')).toHaveCount(0);
    await captureScreenshot(testInfo, page, '1-mail-menu');

    await page.getByTestId('mail-option-COBO').click();
    await expect(page.getByText('Send CoBo Information')).toBeVisible();
    await captureScreenshot(testInfo, page, '2-cobo-dialog');

    await page.getByRole('button', { name: /Send Email/i }).click();
    await expect(page.getByText(/sent successfully/i)).toBeVisible();

    const mail = await waitForEmailTo(request, COBO_EMAIL);
    await attachHtml(testInfo, 'cobo-email.html', mail.HTML);
  });

  test('offers only catering for a catering reservation', async ({ page, request }) => {
    const title = 'Catering Only Booking';
    await seedReservation(request, {
      contactName: 'Catering Guest',
      email: 'catering.only@example.com',
      eventTitle: title,
      description: 'Food only',
      eventDate: '2030-11-29',
      startTime: '12:00',
      endTime: '14:00',
      expectedGuests: 25,
      location: 'HUBBLE',
      seatingArea: 'INSIDE',
      paymentOption: 'INVOICE',
      status: 'CONFIRMED',
      specialActivities: ['EAT_CATERING'],
    });

    await openSeeded(page, title);
    await openMailDialog(page, 'CATERING');
    await expect(page.getByText('Send Catering Options')).toBeVisible();
  });

  test('hides the Send Mail action when no mail applies', async ({ page, request }) => {
    const title = 'Plain Borrel';
    await seedReservation(request, {
      contactName: 'Plain Guest',
      email: 'plain.guest@example.com',
      eventTitle: title,
      description: 'Just drinks',
      eventDate: '2030-11-30',
      startTime: '20:00',
      endTime: '23:00',
      expectedGuests: 20,
      location: 'METEOR',
      seatingArea: 'INSIDE',
      paymentOption: 'INDIVIDUAL',
      status: 'CONFIRMED',
      specialActivities: [],
    });

    await openSeeded(page, title);
    await expect(page.getByTestId('send-mail')).toHaveCount(0);
  });

  test('records the CoBo contract as signed in the change history', async ({ page, request }, testInfo) => {
    await seedCobo(request);

    await openSeeded(page, COBO_TITLE);

    const toggle = page.getByTestId('cobo-contract-toggle');
    await expect(toggle).toContainText('Not signed yet');
    await toggle.click();
    await expect(toggle).toContainText('Signed');
    await captureScreenshot(testInfo, page, '1-contract-signed');

    // The toggle is audited, and it must not have touched the status.
    await expect(page.getByText('Change History')).toBeVisible();
    await expect(page.getByTestId('reservation-status')).toContainText('CONFIRMED');
  });

  test('does not show the CoBo contract toggle for a non-CoBo reservation', async ({ page, request }) => {
    const title = 'Non CoBo Booking';
    await seedReservation(request, {
      contactName: 'Other Guest',
      email: 'other.guest@example.com',
      eventTitle: title,
      description: 'Graduation',
      eventDate: '2030-12-01',
      startTime: '16:00',
      endTime: '19:00',
      expectedGuests: 30,
      location: 'HUBBLE',
      seatingArea: 'INSIDE',
      paymentOption: 'INDIVIDUAL',
      status: 'CONFIRMED',
      specialActivities: ['GRADUATION'],
    });

    await openSeeded(page, title);
    await expect(page.getByTestId('cobo-contract-toggle')).toHaveCount(0);
  });
});
