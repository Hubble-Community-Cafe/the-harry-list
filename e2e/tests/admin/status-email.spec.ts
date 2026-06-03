import { test, expect } from '@playwright/test';
import { resetBackend, seedUser, seedReservation, adminAuthHeaders } from '../../fixtures/backend';
import { clearMailbox, waitForEmailTo } from '../../fixtures/mailpit';
import { attachHtml } from '../../fixtures/evidence';
import { BACKEND_URL } from '../../playwright.config';

/**
 * Status-change email with a custom staff message (#279), end-to-end: a real status change
 * triggers a real email (SMTP -> Mailpit) whose body contains the custom message.
 */
test.describe('admin: status-change email with custom message', () => {
  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await seedUser(request, { oid: 'e2e-admin', role: 'ADMIN' });
  });

  test('confirming a reservation emails the guest including the custom message', async ({ request }, testInfo) => {
    const reservation = await seedReservation(request, {
      contactName: 'Guest One',
      email: 'guest.one@example.com',
      eventTitle: 'Birthday',
      description: 'A party',
      eventDate: '2030-10-01',
      startTime: '18:00',
      endTime: '22:00',
      expectedGuests: 12,
      location: 'HUBBLE', // a concrete location is required before a reservation can be confirmed
      seatingArea: 'INSIDE',
      paymentOption: 'INDIVIDUAL',
    });
    await clearMailbox(request);

    const customMessage = 'Looking forward to hosting you — please arrive 15 minutes early.';
    const res = await request.patch(
      `${BACKEND_URL}/api/admin/reservations/${reservation.id}/status`,
      {
        headers: adminAuthHeaders('e2e-admin'),
        params: { status: 'CONFIRMED', customMessage, sendEmail: 'true' },
      }
    );
    if (!res.ok()) {
      await attachHtml(testInfo, 'status-change-error.txt', `${res.status()}\n${await res.text()}`);
    }
    expect(res.ok()).toBeTruthy();

    const email = await waitForEmailTo(request, 'guest.one@example.com');
    await attachHtml(testInfo, 'status-change-email.html', email.HTML);
    expect(email.HTML).toContain(customMessage);
  });
});
