import { test, expect } from '@playwright/test';
import { ReservationFormPage } from '../../pages/ReservationFormPage';
import { resetBackend, seedUser, seedReservation } from '../../fixtures/backend';
import { clearMailbox, waitForEmailTo } from '../../fixtures/mailpit';
import { captureScreenshot, attachHtml } from '../../fixtures/evidence';
import { PUBLIC_BASE_URL } from '../../playwright.config';

/**
 * Full reservation lifecycle through the real admin UI:
 *   submit (public) -> appears in admin list -> confirm -> edit -> remove.
 * Split into two tests so each is a focused, readable journey.
 */
test.describe('admin: reservation lifecycle', () => {
  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    // The admin SPA authenticates as e2e-admin (docker-compose.e2e.yml).
    await seedUser(request, { oid: 'e2e-admin', email: 'admin@e2e.test', role: 'ADMIN' });
  });

  test('a public submission appears in the admin list and can be confirmed', async ({ page, request }, testInfo) => {
    const title = `Lifecycle Booking ${Date.now()}`;
    const guestEmail = 'lifecycle.guest@example.com';

    // 1) Guest submits via the public form (a concrete location so it can be confirmed).
    await page.goto(PUBLIC_BASE_URL);
    const form = new ReservationFormPage(page);
    await expect(page.getByText('Contact Information')).toBeVisible();
    await form.completeBooking({
      contact: { name: 'Lifecycle Guest', email: guestEmail },
      activity: { title, date: '2030-11-20' },
      location: 'HUBBLE',
      seating: 'INSIDE',
      payment: 'People pay individually',
    });
    await expect(page.getByText('Reservation Submitted!')).toBeVisible();
    await clearMailbox(request); // isolate the confirmation email from the submission emails

    // 2) It shows up in the admin reservations list as PENDING.
    await page.goto('/reservations');
    await page.getByPlaceholder(/Search by name/).fill(title);
    const row = page.getByTestId('reservation-row').filter({ hasText: title });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('PENDING');
    await captureScreenshot(testInfo, page, '1-appears-in-admin-list');

    // 3) Open it and confirm via the UI.
    await row.click();
    await expect(page.getByTestId('reservation-status')).toContainText('PENDING');
    await page.getByTestId('confirm-reservation').click();
    await page.getByTestId('confirm-dialog-submit').click();
    await expect(page.getByTestId('reservation-status')).toContainText('CONFIRMED');
    await captureScreenshot(testInfo, page, '2-confirmed-in-admin');

    // 4) The guest receives the confirmation email.
    const mail = await waitForEmailTo(request, guestEmail);
    await attachHtml(testInfo, 'confirmation-email.html', mail.HTML);
  });

  test('an editor can edit and then remove a reservation', async ({ page, request }, testInfo) => {
    await seedReservation(request, {
      contactName: 'Edit Guest',
      email: 'edit.guest@example.com',
      eventTitle: 'Editable Booking',
      description: 'To be edited and removed',
      eventDate: '2030-11-21',
      startTime: '14:00',
      endTime: '16:00',
      expectedGuests: 10,
      location: 'HUBBLE',
      seatingArea: 'INSIDE',
      paymentOption: 'INDIVIDUAL',
      status: 'PENDING',
    });

    // Open it from the list (so the admin SPA is fully booted with the role loaded,
    // rather than deep-linking into the detail page before the role resolves).
    await page.goto('/reservations');
    await page.getByPlaceholder(/Search by name/).fill('Editable Booking');
    const row = page.getByTestId('reservation-row').filter({ hasText: 'Editable Booking' });
    await expect(row).toHaveCount(1);
    await row.click();
    await expect(page.getByTestId('reservation-status')).toContainText('PENDING');

    // Edit the guest count.
    await page.getByTestId('edit-reservation').click();
    await page.getByTestId('edit-guests').fill('137');
    await page.getByTestId('edit-save').click();
    await expect(page.getByTestId('edit-save')).toHaveCount(0); // edit mode closed
    // The new guest count shows in the details (it also appears in the history timeline,
    // hence .first()).
    await expect(page.getByText('137').first()).toBeVisible();
    await captureScreenshot(testInfo, page, '1-edited-guests');

    // Remove it: reject (PENDING -> REJECTED), then delete.
    await page.getByTestId('reject-reservation').click();
    await page.getByTestId('reject-dialog-submit').click();
    await expect(page.getByTestId('reservation-status')).toContainText('REJECTED');
    await page.getByTestId('remove-reservation').click();
    await page.getByTestId('delete-dialog-submit').click();

    // Back on the list and the reservation is gone.
    await expect(page).toHaveURL(/\/reservations$/);
    await expect(page.getByTestId('reservation-row').filter({ hasText: 'Editable Booking' })).toHaveCount(0);
    await captureScreenshot(testInfo, page, '2-removed');
  });
});
