import { test, expect } from '@playwright/test';
import { ReservationFormPage } from '../../pages/ReservationFormPage';
import { resetBackend, seedUser, adminAuthHeaders } from '../../fixtures/backend';
import { clearMailbox, waitForEmailTo } from '../../fixtures/mailpit';
import { captureScreenshot, attachHtml } from '../../fixtures/evidence';
import { BACKEND_URL } from '../../playwright.config';

/**
 * A guest booking a CoBo (constitution drink) on the public form.
 *
 * Proves the new activity is served by the options endpoint, is selectable with its
 * guest-facing description, and survives submission into the stored reservation. The admin-side
 * CoBo controls are covered separately by `admin/cobo-mail`, since this project's baseURL is
 * the public app.
 */
test.describe('public: CoBo activity', () => {
  const CONTACT = { name: 'CoBo Booker', email: 'cobo.booker@example.com' };
  const TITLE = 'Constitution Drink 2030';

  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await seedUser(request, { oid: 'e2e-admin', role: 'ADMIN' });
    await clearMailbox(request);
  });

  test('a guest can book a CoBo and the activity is stored', async ({ page, request }, testInfo) => {
    const form = new ReservationFormPage(page);
    await form.goto();

    await form.fillContact(CONTACT);
    await form.continue();

    await form.expectStep('Event Details');
    await form.fillActivity({ title: TITLE, date: '2030-10-24', guests: 55 });

    // The option is offered with the guest-facing description.
    const cobo = page.getByRole('checkbox', { name: 'CoBo (Constitution Drink)' });
    await expect(cobo).toBeVisible();
    await expect(cobo).toContainText('the board will reach out for further steps');
    await captureScreenshot(testInfo, page, '1-cobo-option');

    await form.toggleActivity('CoBo (Constitution Drink)');
    await form.selectLocation('HUBBLE');
    await form.selectSeating('INSIDE');
    await form.continue();

    await form.expectStep('Payment Information');
    await form.selectPayment('One person pays at the end');
    await form.continue();

    await form.expectStep('Review & Confirm');
    await form.acceptTerms();
    await form.submit();

    await expect(page.getByText('Reservation Submitted!')).toBeVisible();
    await captureScreenshot(testInfo, page, '2-confirmation');

    const email = await waitForEmailTo(request, CONTACT.email);
    await attachHtml(testInfo, 'submission-email.html', email.HTML);

    // The activity survived submission and is stored on the reservation.
    const res = await request.get(`${BACKEND_URL}/api/reservations`, {
      headers: adminAuthHeaders('e2e-admin'),
    });
    expect(res.ok()).toBeTruthy();
    const stored = (await res.json()).find(
      (r: { eventTitle: string }) => r.eventTitle === TITLE,
    );
    expect(stored).toBeDefined();
    expect(stored.specialActivities).toContain('COBO');
    // A CoBo is not a catering booking, so its contract flag starts unset.
    expect(stored.coboContractSigned).toBe(false);
  });
});
