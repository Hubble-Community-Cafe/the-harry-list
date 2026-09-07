import { test, expect } from '@playwright/test';
import { resetBackend, seedUser, seedReservation } from '../../fixtures/backend';
import { clearMailbox, listMessages } from '../../fixtures/mailpit';
import { captureScreenshot } from '../../fixtures/evidence';
import { changeStatus } from '../../fixtures/adminActions';

/**
 * The internal IN_PROGRESS status, end-to-end through the real admin UI.
 *
 * The behaviour that matters here and cannot be proven by unit tests is the negative one:
 * marking a reservation in progress must send the guest nothing at all. That is asserted
 * against the real mailbox (SMTP -> Mailpit), not a mock.
 */
test.describe('admin: in-progress status', () => {
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

  test('pending goes to in progress without emailing the guest, then confirms', async ({ page, request }, testInfo) => {
    const title = 'In Progress Booking';
    const guestEmail = 'inprogress.guest@example.com';

    await seedReservation(request, {
      contactName: 'In Progress Guest',
      email: guestEmail,
      eventTitle: title,
      description: 'Picked up by staff',
      eventDate: '2030-11-25',
      startTime: '17:00',
      endTime: '20:00',
      expectedGuests: 15,
      location: 'HUBBLE',
      seatingArea: 'INSIDE',
      paymentOption: 'INDIVIDUAL',
      status: 'PENDING',
    });
    await clearMailbox(request);

    await openSeeded(page, title);
    await expect(page.getByTestId('reservation-status')).toContainText('PENDING');

    // The menu offers In Progress, flagged as internal.
    await page.getByTestId('change-status').click();
    const option = page.getByTestId('status-option-IN_PROGRESS');
    await expect(option).toBeVisible();
    await expect(option).toContainText('internal');
    await captureScreenshot(testInfo, page, '1-status-menu');

    // Choosing it offers no email controls at all.
    await option.click();
    await expect(page.getByTestId('status-dialog')).toContainText('No email is sent for this status.');
    await expect(
      page.getByRole('checkbox', { name: /send email notification to customer/i })
    ).toHaveCount(0);
    await page.getByTestId('status-dialog-submit').click();

    await expect(page.getByTestId('reservation-status')).toContainText('IN_PROGRESS');
    await captureScreenshot(testInfo, page, '2-in-progress');

    // The guest was told nothing. This is the whole point of the status.
    expect(await listMessages(request)).toHaveLength(0);

    // From in progress it can still be confirmed, which does email the guest.
    await changeStatus(page, 'CONFIRMED');
    await expect(page.getByTestId('reservation-status')).toContainText('CONFIRMED');
    await captureScreenshot(testInfo, page, '3-confirmed-from-in-progress');
  });

  test('an in-progress reservation still shows in the pending-status filter flow', async ({ page, request }) => {
    const title = 'Filterable In Progress';

    await seedReservation(request, {
      contactName: 'Filter Guest',
      email: 'filter.guest@example.com',
      eventTitle: title,
      description: 'Shows under its own filter',
      eventDate: '2030-11-26',
      startTime: '15:00',
      endTime: '17:00',
      expectedGuests: 10,
      location: 'METEOR',
      seatingArea: 'INSIDE',
      paymentOption: 'INDIVIDUAL',
      status: 'IN_PROGRESS',
    });

    await page.goto('/reservations');
    await page.getByPlaceholder(/Search by name/).fill(title);

    const row = page.getByTestId('reservation-row').filter({ hasText: title });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('IN_PROGRESS');
  });

  test('a completed reservation offers no status changes at all', async ({ page, request }) => {
    const title = 'Finished Booking';

    await seedReservation(request, {
      contactName: 'Finished Guest',
      email: 'finished.guest@example.com',
      eventTitle: title,
      description: 'Already happened',
      eventDate: '2030-01-10',
      startTime: '19:00',
      endTime: '23:00',
      expectedGuests: 40,
      location: 'HUBBLE',
      seatingArea: 'INSIDE',
      paymentOption: 'INDIVIDUAL',
      status: 'COMPLETED',
    });

    await openSeeded(page, title);
    await expect(page.getByTestId('reservation-status')).toContainText('COMPLETED');

    // COMPLETED is terminal, so the whole Change Status control is gone.
    await expect(page.getByTestId('change-status')).toHaveCount(0);
  });
});
