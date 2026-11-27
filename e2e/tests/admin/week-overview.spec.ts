import { test, expect } from '@playwright/test';
import { resetBackend, seedReservation, seedAdmin } from '../../fixtures/backend';
import { captureScreenshot } from '../../fixtures/evidence';

/**
 * Week overview: a reservation shows up in the correct week. We pin the displayed week via
 * the ?week= URL param so the test isn't coupled to "today".
 */
test.describe('admin: week overview shows reservations', () => {
  const EVENT_DATE = '2030-10-16'; // a fixed date; ?week= will resolve its Monday

  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await seedAdmin(request);
    await seedReservation(request, {
      contactName: 'Week Guest',
      email: 'week@example.com',
      eventTitle: 'Week Overview Event',
      description: 'Shows in the week grid',
      eventDate: EVENT_DATE,
      startTime: '14:00',
      endTime: '16:00',
      expectedGuests: 15,
      location: 'HUBBLE',
      seatingArea: 'INSIDE',
      paymentOption: 'INDIVIDUAL',
      status: 'CONFIRMED',
    });
  });

  test('a reservation appears in its week', async ({ page }, testInfo) => {
    await page.goto(`/week-overview?week=${EVENT_DATE}`);
    await expect(page.getByRole('heading', { name: 'Week overview' })).toBeVisible();

    const card = page.getByTestId('week-reservation').filter({ hasText: 'Week Overview Event' });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Confirmed');
    await captureScreenshot(testInfo, page, '1-week-overview-event');
  });
});

/**
 * The catering toggle sits on top of the card link, not inside it: toggling stays on the page,
 * clicking the rest of the card still opens the reservation.
 */
test.describe('admin: catering toggle on reservation cards', () => {
  const EVENT_DATE = '2030-10-16';

  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await seedAdmin(request);
    await seedReservation(request, {
      contactName: 'Catering Guest', email: 'catering.toggle@example.com', eventTitle: 'Catering Toggle Event',
      description: 'Has catering', eventDate: EVENT_DATE, startTime: '14:00', endTime: '16:00',
      expectedGuests: 15, location: 'HUBBLE', seatingArea: 'INSIDE', paymentOption: 'INDIVIDUAL',
      status: 'CONFIRMED', specialActivities: ['EAT_CATERING'],
    });
  });

  test('in the week overview: toggling stays on the page, the card still opens the reservation', async ({ page }) => {
    await page.goto(`/week-overview?week=${EVENT_DATE}`);
    const toggle = page.getByRole('button', { name: 'Catering to arrange for Catering Toggle Event' });
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Catering arranged for Catering Toggle Event' })).toBeVisible();
    await expect(page).toHaveURL(/\/week-overview/);

    await page.getByTestId('week-reservation').filter({ hasText: 'Catering Toggle Event' }).click({ position: { x: 10, y: 10 } });
    await expect(page).toHaveURL(/\/reservations\/\d+$/);
  });

  test('in the reservations list: the same, and the toggle is reachable with the keyboard', async ({ page }) => {
    await page.goto('/reservations');
    const toggle = page.getByRole('button', { name: 'Catering to arrange for Catering Toggle Event' });
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Catering arranged for Catering Toggle Event' })).toBeVisible();
    await expect(page).toHaveURL(/\/reservations$/);

    await page.getByTestId('reservation-row').filter({ hasText: 'Catering Toggle Event' }).click({ position: { x: 10, y: 10 } });
    await expect(page).toHaveURL(/\/reservations\/\d+$/);
  });
});
