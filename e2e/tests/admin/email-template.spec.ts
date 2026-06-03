import { test, expect } from '@playwright/test';
import { resetBackend, seedUser, seedReservation, adminAuthHeaders } from '../../fixtures/backend';
import { clearMailbox, waitForEmailTo } from '../../fixtures/mailpit';
import { attachHtml } from '../../fixtures/evidence';
import { BACKEND_URL } from '../../playwright.config';

/**
 * Editable email templates (backward-compatibility feature): a template edited by an admin
 * is actually used when an email is sent. We edit the STATUS_CHANGED template to include a
 * unique marker, trigger a status-change email, and assert the marker arrives.
 */
test.describe('admin: edited email template is used when sending', () => {
  const MARKER = 'E2E-TEMPLATE-MARKER-7f3a';

  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await seedUser(request, { oid: 'e2e-admin', role: 'ADMIN' });
  });

  test('a customized template body appears in the delivered email', async ({ request }, testInfo) => {
    // Admin edits the status-change template.
    const put = await request.put(`${BACKEND_URL}/api/admin/email-templates/STATUS_CHANGED`, {
      headers: adminAuthHeaders('e2e-admin'),
      data: {
        subject: 'Your reservation for {{eventTitle}}',
        bodyTemplate: `<p>${MARKER} — {{eventTitle}}</p>{{customMessage}}`,
      },
    });
    expect(put.ok()).toBeTruthy();

    const reservation = await seedReservation(request, {
      contactName: 'Guest Two',
      email: 'guest.two@example.com',
      eventTitle: 'Anniversary',
      description: 'Dinner',
      eventDate: '2030-11-05',
      startTime: '19:00',
      endTime: '23:00',
      expectedGuests: 8,
      location: 'HUBBLE',
      seatingArea: 'INSIDE',
      paymentOption: 'INDIVIDUAL',
    });
    await clearMailbox(request);

    const res = await request.patch(
      `${BACKEND_URL}/api/admin/reservations/${reservation.id}/status`,
      {
        headers: adminAuthHeaders('e2e-admin'),
        params: { status: 'CONFIRMED', customMessage: 'See you soon', sendEmail: 'true' },
      }
    );
    expect(res.ok()).toBeTruthy();

    const email = await waitForEmailTo(request, 'guest.two@example.com');
    await attachHtml(testInfo, 'templated-email.html', email.HTML);
    expect(email.HTML).toContain(MARKER);
    expect(email.HTML).toContain('Anniversary');
  });
});
