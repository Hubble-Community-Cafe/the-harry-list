import { test, expect } from '@playwright/test';
import { ReservationFormPage } from '../../pages/ReservationFormPage';
import { resetBackend } from '../../fixtures/backend';

/**
 * Moving between steps in a real browser. Both bugs below only showed up in a browser
 * (jsdom does not reproduce the click timing), so this spec guards them.
 */
test.describe('public: step navigation', () => {
  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
  });

  test('one click on Continue advances after fixing the errors it showed', async ({ page }) => {
    const form = new ReservationFormPage(page);
    await form.goto();

    // An empty Continue shows the errors and moves focus to the first one.
    await form.continue();
    await expect(page.getByText('Please enter a valid email')).toBeVisible();

    // The guest types the fixes and clicks Continue straight from the email field.
    // The error must clear while typing: if it only cleared on blur, the click would
    // remove it, shift the button up mid-click and the click would be lost.
    await form.fillContact({ name: 'Alex Tester', email: 'alex.steps@example.com' });
    await expect(page.getByText('Please enter a valid email')).toBeHidden();
    await form.continue();

    await form.expectStep('Event Details');
  });

  test('opening the review step does not submit the form or show the terms error', async ({ page }) => {
    let reservationPosts = 0;
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/reservations')) reservationPosts++;
    });

    const form = new ReservationFormPage(page);
    await form.goto();
    await form.fillContact({ name: 'Alex Tester', email: 'alex.steps@example.com' });
    await form.continue();
    await form.fillActivity({ title: 'Step Test', date: '2030-09-10', guests: 20 });
    await form.selectLocation('NO_PREFERENCE');
    await form.selectSeating('INSIDE');
    await form.continue();
    await form.selectPayment('People pay individually');
    await form.continue();

    await form.expectStep('Review & Confirm');
    await expect(page.getByText('You must accept the terms')).toBeHidden();
    expect(reservationPosts).toBe(0);

    // The review reads like a person wrote it: no ISO dates or upper-case codes.
    await expect(page.getByText('Tuesday 10 September 2030')).toBeVisible();
    await expect(page.getByText('No preference')).toBeVisible();
  });
});
