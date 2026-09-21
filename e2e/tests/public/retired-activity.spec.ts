import { test, expect } from '@playwright/test';
import { ReservationFormPage } from '../../pages/ReservationFormPage';
import { resetBackend } from '../../fixtures/backend';
import { captureScreenshot } from '../../fixtures/evidence';
import { BACKEND_URL } from '../../playwright.config';

/**
 * The private-event activity was retired in 1.12.0: guests kept misreading what it meant,
 * so it can no longer be chosen. The enum value survives for reservations booked before
 * then, which is exactly why the form and the API need their own guards.
 */
test.describe('public: retired private-event activity', () => {
  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
  });

  test('is not offered on the form', async ({ page }, testInfo) => {
    const form = new ReservationFormPage(page);
    await form.goto();
    await form.fillContact({ name: 'Rita Retired', email: 'rita.retired@example.com' });
    await form.continue();
    await form.expectStep('Event Details');

    await expect(form.activityCheckbox('Private event')).toHaveCount(0);
    // The other activities still render, so this is not an empty or broken options list.
    await expect(form.activityCheckbox('Graduation / PhD Defense')).toBeVisible();
    await expect(form.activityCheckbox('Eat a la carte')).toBeVisible();
    await captureScreenshot(testInfo, page, '1-activities-without-private-event');
  });

  test('is not returned by the form options API', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/options/all`);
    expect(res.status()).toBe(200);

    const values = (await res.json()).specialActivities.map((a: { value: string }) => a.value);
    expect(values).not.toContain('PRIVATE_EVENT');
    expect(values).toContain('GRADUATION');
  });

  test('is rejected when submitted directly to the API', async ({ request }) => {
    // Bypasses the form entirely, the case the frontend guard cannot cover.
    const res = await request.post(`${BACKEND_URL}/api/public/reservations`, {
      data: {
        contactName: 'Bypass Bob',
        email: 'bypass.bob@example.com',
        eventTitle: 'Closed door party',
        description: 'Submitted without using the form.',
        specialActivities: ['PRIVATE_EVENT'],
        expectedGuests: 20,
        eventDate: '2030-09-18',
        startTime: '16:00:00',
        endTime: '22:00:00',
        location: 'METEOR',
        seatingArea: 'INSIDE',
        paymentOption: 'INDIVIDUAL',
        termsAccepted: true,
      },
    });

    expect(res.status()).toBe(400);
    expect(await res.text()).toContain('no longer available');
  });
});
